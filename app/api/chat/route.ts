import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Khai báo cấu trúc URL sạch, tránh lỗi parse của Node.js
const GROQ_API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// ============================================================================
// 1. CÁC HÀM TIỆN ÍCH (UTILITIES)
// ============================================================================
function removeAccents(str: string) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

// Xử lý chuỗi JSON do LLM trả về (đề phòng AI bọc trong thẻ markdown ```json)
function parseLLMJson(rawText: string) {
  try {
    const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    return { intent: "general", params: {} };
  }
}

// ============================================================================
// 2. TẦNG BACKEND LOGIC (SIMULATING SUPABASE RPCs)
// ============================================================================
async function rpc_SearchPerson(supabase: any, name: string) {
  const { data } = await supabase.from('persons').select('id, full_name, name, ho_ten, gender, birth_date, death_date, biography, position');
  if (!data) return [];
  const keyword = removeAccents(name);
  return data.filter((p: any) => removeAccents(p.full_name || p.name || p.ho_ten || '').includes(keyword));
}

async function rpc_GetFamily(supabase: any, personId: string) {
  const { data: person } = await supabase.from('persons').select('id, full_name, gender, birth_date, death_date').eq('id', personId).single();
  
  const { data: rels } = await supabase
    .from('relationships')
    .select('person_id, related_person_id, relationship_type, persons!related_person_id(id, full_name, gender, birth_date)')
    .or(`person_id.eq.${personId},related_person_id.eq.${personId}`);

  if (!person || !rels) return { person, family: [] };

  // Nhóm người thân (lọc các cột không cần thiết)
  const family = rels.map((r: any) => {
    const isSubject = r.person_id === personId;
    const relName = r.persons?.full_name || 'Không rõ';
    const relId = r.persons?.id;
    const type = r.relationship_type;
    return { id: relId, name: relName, relationship: type };
  });

  return { person, family };
}

async function rpc_FindRelationshipBFS(supabase: any, name1: string, name2: string) {
  const { data: persons } = await supabase.from('persons').select('id, full_name, name, ho_ten');
  const { data: relationships } = await supabase.from('relationships').select('person_id, related_person_id, relationship_type');

  if (!persons || !relationships) return null;

  const key1 = removeAccents(name1);
  const key2 = removeAccents(name2);
  
  const p1 = persons.find((p: any) => removeAccents(p.full_name || p.name || '').includes(key1));
  const p2 = persons.find((p: any) => removeAccents(p.full_name || p.name || '').includes(key2));

  if (!p1 || !p2) return { error: `Không tìm thấy thông tin của ${!p1 ? name1 : name2} trong gia phả.` };
  if (p1.id === p2.id) return { path: [`${p1.full_name} chính là người đang được hỏi.`] };

  // Xây dựng đồ thị (Adjacency List)
  const graph: Record<string, { id: string, name: string, type: string }[]> = {};
  persons.forEach((p: any) => graph[p.id] = []);

  relationships.forEach((r: any) => {
    if (graph[r.person_id] && graph[r.related_person_id]) {
       const nameA = persons.find((p:any) => p.id === r.related_person_id)?.full_name;
       const nameB = persons.find((p:any) => p.id === r.person_id)?.full_name;
       
       graph[r.person_id].push({ id: r.related_person_id, name: nameA, type: r.relationship_type });
       graph[r.related_person_id].push({ id: r.person_id, name: nameB, type: `có liên kết họ hàng với` }); // Cạnh ngược
    }
  });

  // Thuật toán BFS tìm đường ngắn nhất
  const queue: { id: string, path: string[] }[] = [{ id: p1.id, path: [p1.full_name] }];
  const visited = new Set<string>();
  visited.add(p1.id);

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;
    if (id === p2.id) return { path }; // Đã tìm thấy

    for (const neighbor of graph[id] || []) {
      if (!visited.has(neighbor.id)) {
        visited.add(neighbor.id);
        const newPath = [...path, `(${neighbor.type})`, neighbor.name];
        queue.push({ id: neighbor.id, path: newPath });
      }
    }
  }
  return { path: null, message: "Không tìm thấy mối liên hệ trực tiếp giữa hai người." };
}

// ============================================================================
// 3. API ROUTE CHÍNH
// ============================================================================
export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message) return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });

    // Sử dụng .trim() để dọn dẹp các ký tự khoảng trắng vô tình lọt vào biến môi trường
    const groqApiKey = (process.env.GROQ_API_KEY || '').trim();
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

    if (!groqApiKey || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ reply: 'Lỗi cấu hình biến môi trường.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ------------------------------------------------------------------------
    // BƯỚC 1: AI PHÂN LOẠI Ý ĐỊNH (INTENT DETECTOR)
    // ------------------------------------------------------------------------
    const intentPrompt = `Phân tích câu hỏi của người dùng và trả về DUY NHẤT một đối tượng JSON. Không thêm bất kỳ text nào khác.
Cấu trúc JSON:
{
  "intent": "search_person" | "get_family" | "find_relationship" | "count_members" | "general",
  "params": { "name1": "tên 1", "name2": "tên 2" }
}
- search_person: Hỏi thông tin tiểu sử của 1 người. (vd: Ai là Nguyễn Văn A)
- get_family: Hỏi về cha, mẹ, vợ, chồng, con, anh em của 1 người. (vd: Con của Nguyễn Văn A)
- find_relationship: Hỏi quan hệ giữa 2 người. (vd: A và B quan hệ gì)
- count_members: Hỏi tổng số người trong gia phả.
- general: Chào hỏi, câu hỏi ngoài lề.`;

    const intentRes = await fetch(GROQ_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        response_format: { type: "json_object" }, 
        messages: [
          { role: 'system', content: intentPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.1,
      }),
    });

    if (!intentRes.ok) {
      throw new Error(`Lỗi API Intent phân loại: ${intentRes.statusText}`);
    }

    const intentData = await intentRes.json();
    const parsedIntent = parseLLMJson(intentData.choices?.[0]?.message?.content || '{}');
    
    let backendContext = {};

    // ------------------------------------------------------------------------
    // BƯỚC 2: BACKEND THỰC THI (CHỈ LẤY ĐÚNG DỮ LIỆU CẦN THIẾT)
    // ------------------------------------------------------------------------
    if (parsedIntent.intent === 'count_members') {
      const { count } = await supabase.from('persons').select('*', { count: 'exact', head: true });
      backendContext = { total_members: count };
    } 
    else if (parsedIntent.intent === 'find_relationship' && parsedIntent.params?.name1 && parsedIntent.params?.name2) {
      backendContext = await rpc_FindRelationshipBFS(supabase, parsedIntent.params.name1, parsedIntent.params.name2) || {};
    }
    else if ((parsedIntent.intent === 'search_person' || parsedIntent.intent === 'get_family') && parsedIntent.params?.name1) {
      const persons = await rpc_SearchPerson(supabase, parsedIntent.params.name1);
      
      if (persons.length === 0) {
        backendContext = { error: "Không tìm thấy người này trong CSDL." };
      } else if (parsedIntent.intent === 'get_family') {
        backendContext = await rpc_GetFamily(supabase, persons[0].id);
      } else {
        backendContext = { person: persons[0] };
      }
    } 
    else {
      backendContext = { note: "Câu hỏi giao tiếp thông thường hoặc không nhận diện được tên người." };
    }

    // ------------------------------------------------------------------------
    // BƯỚC 3: LLM CHỈ LÀM NHIỆM VỤ TẠO NGÔN NGỮ (NLG)
    // ------------------------------------------------------------------------
    const systemPromptNLG = `Bạn là trợ lý gia phả dòng họ Nguyễn Thiệu. 
Chỉ sử dụng dữ liệu JSON được cung cấp dưới đây để trả lời. Không tự suy diễn.
Nếu JSON trả về lỗi hoặc thiếu dữ liệu, hãy nói: "Không đủ thông tin để kết luận."

DỮ LIỆU JSON (Context):
${JSON.stringify(backendContext)}

YÊU CẦU TRÌNH BÀY:
1. Trả lời ngắn gọn, tự nhiên và dễ hiểu dựa chính xác vào JSON.
2. Nếu có dữ liệu ID của một người, BẮT BUỘC chèn link hồ sơ ở cuối câu trả lời theo format sau:
[Nhấn vào đây để xem chi tiết tiểu sử của {Tên}](/dashboard/members?memberModalId={id})
3. Không hiển thị cấu trúc JSON hay dãy số ID ra màn hình cho người dùng xem.`;

    const finalRes = await fetch(GROQ_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPromptNLG },
          { role: 'user', content: message }
        ],
        temperature: 0.1,
      }),
    });

    if (!finalRes.ok) {
       throw new Error(`Lỗi API NLG tạo ngôn ngữ: ${finalRes.statusText}`);
    }

    const finalData = await finalRes.json();
    const reply = finalData.choices?.[0]?.message?.content || 'Không đủ thông tin để kết luận.';

    return NextResponse.json({ reply });
    
  } catch (error: any) {
    return NextResponse.json({ reply: `Hệ thống gián đoạn: ${error.message}` }, { status: 500 });
  }
}
