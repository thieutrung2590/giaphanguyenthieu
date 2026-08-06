import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GROQ_API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ============================================================================
// 1. CÁC HÀM TIỆN ÍCH
// ============================================================================
function removeAccents(str: string) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

function parseLLMJson(rawText: string) {
  try {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return { intent: "general", name1: "", name2: "" };
  } catch (error) {
    return { intent: "general", name1: "", name2: "" };
  }
}

// Hàm dọn dẹp object để tiết kiệm token cho LLM
function cleanPersonData(person: any) {
  const clean: any = { ...person };
  delete clean.created_at;
  delete clean.updated_at;
  delete clean.uuid;
  delete clean.avatar_url;
  delete clean.image;
  return clean;
}

// ============================================================================
// 2. API ROUTE CHÍNH (SINGLE FETCH & IN-MEMORY GRAPH)
// ============================================================================
export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message) return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });

    const groqApiKey = (process.env.GROQ_API_KEY || '').trim();
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

    if (!groqApiKey || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ reply: 'Lỗi cấu hình Server: Thiếu biến môi trường (API Key hoặc Supabase).' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ------------------------------------------------------------------------
    // BƯỚC 1: FETCH TOÀN BỘ DỮ LIỆU ĐÚNG 1 LẦN (SINGLE FETCH)
    // ------------------------------------------------------------------------
    const [personsRes, relsRes] = await Promise.all([
      supabase.from('persons').select('*').limit(3000),
      supabase.from('relationships').select('*').limit(10000)
    ]);

    if (personsRes.error) {
      throw new Error(`Lỗi truy vấn bảng persons: ${personsRes.error.message}`);
    }
    
    const allPersons = personsRes.data || [];
    // Nếu bảng relationships không tồn tại, trả về mảng rỗng để không bị sập
    const allRels = relsRes.error ? [] : (relsRes.data || []);

    // ------------------------------------------------------------------------
    // BƯỚC 2: XÂY DỰNG MAP O(1) VÀ ĐỒ THỊ QUAN HỆ (BUILD ONCE)
    // ------------------------------------------------------------------------
    const personsMap = new Map<string, any>();
    const validNames: { id: string, raw: string, normalized: string }[] = [];
    const graph = new Map<string, { id: string, name: string, type: string }[]>();

    // 2.1 Khởi tạo Map
    allPersons.forEach((p: any) => {
      const pId = String(p.id);
      personsMap.set(pId, p);
      graph.set(pId, []);
      
      const name = p.full_name || p.name || p.ho_ten;
      if (name) {
        validNames.push({ id: pId, raw: name, normalized: removeAccents(name) });
      }
    });

    // Sắp xếp tên dài lên trước để ưu tiên Exact Matching
    validNames.sort((a, b) => b.normalized.length - a.normalized.length);

    // Hàm tiện ích thêm cạnh đồ thị (Tránh lặp vô hạn)
    const addEdge = (id1: string, id2: string, type1To2: string, type2To1: string) => {
      if (!id1 || !id2 || id1 === id2 || !graph.has(id1) || !graph.has(id2)) return;
      
      const name1 = personsMap.get(id1)?.full_name || personsMap.get(id1)?.name || 'Không rõ';
      const name2 = personsMap.get(id2)?.full_name || personsMap.get(id2)?.name || 'Không rõ';

      const edges1 = graph.get(id1)!;
      if (!edges1.some(e => e.id === id2)) edges1.push({ id: id2, name: name2, type: type1To2 });

      const edges2 = graph.get(id2)!;
      if (!edges2.some(e => e.id === id1)) edges2.push({ id: id1, name: name1, type: type2To1 });
    };

    // 2.2 Quét các khóa ngoại đã xác định rõ (Foreign Keys Convention)
    allPersons.forEach((p: any) => {
      const pId = String(p.id);
      if (p.father_id) addEdge(pId, String(p.father_id), 'Cha', 'Con');
      if (p.mother_id) addEdge(pId, String(p.mother_id), 'Mẹ', 'Con');
      if (p.spouse_id) addEdge(pId, String(p.spouse_id), 'Vợ/Chồng', 'Vợ/Chồng');
      
      // Mở rộng bắt các cột có đuôi _id (Quy ước)
      for (const key of Object.keys(p)) {
        if (key.endsWith('_id') && !['father_id', 'mother_id', 'spouse_id'].includes(key)) {
          if (p[key]) addEdge(pId, String(p[key]), key, `Liên kết ngược của ${key}`);
        }
      }
    });

    // 2.3 Quét thêm từ bảng relationships (Nếu có)
    allRels.forEach((r: any) => {
      const type = r.relationship_type || r.type || 'Họ hàng';
      addEdge(String(r.person_id), String(r.related_person_id), type, type);
    });

    // ------------------------------------------------------------------------
    // BƯỚC 3: AI NHẬN DIỆN Ý ĐỊNH
    // ------------------------------------------------------------------------
    const intentPrompt = `Phân tích câu hỏi và trả về DUY NHẤT JSON. 
Cấu trúc:
{
  "intent": "search_person" | "find_relationship" | "count_members" | "general",
  "name1": "Tên người 1",
  "name2": "Tên người 2 (nếu có)"
}`;

    const intentRes = await fetch(GROQ_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        response_format: { type: "json_object" }, 
        messages: [{ role: 'system', content: intentPrompt }, { role: 'user', content: message }],
        temperature: 0.1,
      }),
    });

    if (!intentRes.ok) {
      const errData = await intentRes.json().catch(() => ({}));
      throw new Error(`Groq API Lỗi (Intent): ${errData.error?.message || intentRes.statusText}`);
    }

    const intentData = await intentRes.json();
    const parsedIntent = parseLLMJson(intentData.choices?.[0]?.message?.content || '{}');
    let backendContext: any = { _debug_intent: parsedIntent.intent };

    // ------------------------------------------------------------------------
    // BƯỚC 4: EXACT MATCHING & CHỐNG ẢO GIÁC
    // ------------------------------------------------------------------------
    const msgNoAccent = removeAccents(message);
    const matchedIds: string[] = [];
    let tempMsg = msgNoAccent;

    // Tìm kiếm trực tiếp O(1) giả lập qua mảng validNames đã sắp xếp
    for (const item of validNames) {
      if (item.normalized.length > 2 && tempMsg.includes(item.normalized)) {
        matchedIds.push(item.id);
        tempMsg = tempMsg.replace(item.normalized, ' '); 
      }
    }

    const id1 = matchedIds[0] || null;
    const id2 = matchedIds[1] || null;

    // Fallback bóc tách văn bản thô nếu mảng rỗng (Trường hợp AI trả về intent search mà không quét được tên)
    let fallbackName = "";
    if (!id1 && (parsedIntent.intent === 'search_person')) {
       fallbackName = message.replace(/(thông tin|chi tiết|cho biết|hỏi về|ai là|tìm kiếm|tìm|về|của|những|người|tên|cha|mẹ|vợ|chồng|con|cái|gia đình|tiểu sử|dòng họ)/gi, '').replace(/[?.,!]/g, '').trim();
    }

    // ------------------------------------------------------------------------
    // BƯỚC 5: THỰC THI BẰNG IN-MEMORY DATA
    // ------------------------------------------------------------------------
    if (parsedIntent.intent === 'count_members') {
      backendContext.total_members = personsMap.size;
    } 
    else if (parsedIntent.intent === 'find_relationship') {
      if (id1 && id2) {
        if (id1 === id2) {
           backendContext.path = [`Hai tên này đều chỉ cùng một người là: ${personsMap.get(id1).full_name}.`];
        } else {
           // THUẬT TOÁN BFS SIÊU NHANH TRÊN RAM
           const queue: { id: string, path: string[] }[] = [{ id: id1, path: [personsMap.get(id1).full_name] }];
           const visited = new Set<string>([id1]);
           let found = false;

           while (queue.length > 0) {
             const { id: currentId, path } = queue.shift()!;
             if (currentId === id2) {
               backendContext.path = path;
               found = true;
               break;
             }
             for (const neighbor of graph.get(currentId) || []) {
               if (!visited.has(neighbor.id)) {
                 visited.add(neighbor.id);
                 queue.push({ id: neighbor.id, path: [...path, `(${neighbor.type})`, neighbor.name] });
               }
             }
           }
           if (!found) backendContext.message = "Không tìm thấy mối liên hệ trực tiếp nào giữa hai người này.";
        }
      } else {
        backendContext.error = "Hệ thống không nhận diện đủ 2 người trong gia phả để kiểm tra.";
      }
    }
    else if (parsedIntent.intent === 'search_person' || fallbackName) {
      // Xử lý tìm kiếm 1 người và gia đình của họ
      let targetId = id1;
      
      // Nếu không có ID chính xác, thử tìm bằng fallbackName
      if (!targetId && fallbackName) {
         const fbNorm = removeAccents(fallbackName);
         const found = validNames.find(n => n.normalized.includes(fbNorm) || fbNorm.includes(n.normalized));
         if (found) targetId = found.id;
      }

      if (targetId) {
        const personData = personsMap.get(targetId);
        const familyData = graph.get(targetId) || [];
        
        backendContext.person = cleanPersonData(personData);
        backendContext.family = familyData;
      } else {
        backendContext.error = "Xin lỗi, không tìm thấy người này trong cơ sở dữ liệu gia phả.";
      }
    } 
    else {
      backendContext.note = "Câu hỏi ngoài lề hoặc chào hỏi thông thường.";
    }

    // ------------------------------------------------------------------------
    // BƯỚC 6: LLM PHÁT SINH NGÔN NGỮ (NLG)
    // ------------------------------------------------------------------------
    const systemPromptNLG = `Bạn là trợ lý gia phả dòng họ. 
Chỉ dựa vào DỮ LIỆU JSON cung cấp bên dưới để trả lời, không tự bịa đặt.

DỮ LIỆU JSON:
${JSON.stringify(backendContext)}

YÊU CẦU BẮT BUỘC:
1. Nếu JSON có trường "error", BẮT BUỘC trả lời Y HỆT câu báo lỗi đó.
2. Nếu JSON chứa "person" và "family", chia làm 2 phần gạch đầu dòng rõ ràng:
   - **Thông tin cá nhân**: Tên, giới tính, năm sinh, thế hệ...
   - **Quan hệ gia đình**: Liệt kê rõ ràng danh sách từ mảng "family". Nêu rõ người đó đóng vai trò gì. Nếu mảng family rỗng, báo "Chưa cập nhật thông tin người thân".
3. Nếu JSON có ID thành viên: BẮT BUỘC chèn ĐÚNG MỘT link ở dòng cuối cùng theo định dạng:
[Nhấn vào đây để xem chi tiết tiểu sử của {Tên}](/dashboard/members?memberModalId={id})
4. Không in các trường _debug hoặc cú pháp JSON ra màn hình.`;

    const finalRes = await fetch(GROQ_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'system', content: systemPromptNLG }, { role: 'user', content: message }],
        temperature: 0.1,
      }),
    });

    if (!finalRes.ok) {
      const errData = await finalRes.json().catch(() => ({}));
      throw new Error(`Groq API Lỗi (NLG): ${errData.error?.message || finalRes.statusText}`);
    }

    const finalData = await finalRes.json();
    const reply = finalData.choices?.[0]?.message?.content || 'Không đủ thông tin để kết luận.';

    return NextResponse.json({ reply });
    
  } catch (error: any) {
    // Console log để gỡ lỗi nội bộ trên Vercel
    console.error("Chat API Error: ", error.message);
    return NextResponse.json({ reply: `Hệ thống gián đoạn: ${error.message}` }, { status: 500 });
  }
}
