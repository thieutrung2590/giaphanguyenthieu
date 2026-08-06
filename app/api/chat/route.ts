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

// ============================================================================
// 2. TẦNG BACKEND LOGIC
// ============================================================================
async function rpc_SearchPerson(supabase: any, name: string) {
  const { data } = await supabase.from('persons').select('*').limit(3000);
  if (!data) return [];
  
  const keyword = removeAccents(name);
  return data.filter((p: any) => {
    const dbName = removeAccents(p.full_name || p.name || p.ho_ten || '');
    return dbName === keyword || dbName.includes(keyword) || keyword.includes(dbName);
  });
}

// LUÔN LẤY CẢ TIỂU SỬ VÀ QUAN HỆ GIA ĐÌNH
async function rpc_GetProfileAndFamily(supabase: any, personId: string) {
  const { data: person } = await supabase.from('persons').select('*').eq('id', personId).single();
  const { data: rels } = await supabase
    .from('relationships')
    .select('*')
    .or(`person_id.eq.${personId},related_person_id.eq.${personId}`);

  if (!person || !rels) return { person, family: [] };

  const relativeIds = new Set<string>();
  rels.forEach((r: any) => {
    if (r.person_id && r.person_id !== personId) relativeIds.add(r.person_id);
    if (r.related_person_id && r.related_person_id !== personId) relativeIds.add(r.related_person_id);
  });

  let family: any[] = [];
  if (relativeIds.size > 0) {
    const ids = Array.from(relativeIds);
    const { data: relatives } = await supabase.from('persons').select('id, full_name, name, ho_ten').in('id', ids);
    if (relatives) {
      family = rels.map((r: any) => {
         const isSubject = r.person_id === personId;
         const relId = isSubject ? r.related_person_id : r.person_id;
         const relative = relatives.find((p: any) => p.id === relId);
         
         const type = r.relationship_type || r.type || 'có quan hệ';
         // Phân biệt chiều quan hệ để AI không bị nhầm lẫn cha/con
         const direction = isSubject ? "Người này là chủ thể (person_id)" : "Người này là người liên quan (related_person_id)";

         return { 
             id: relId, 
             name: relative?.full_name || relative?.name || relative?.ho_ten || 'Không rõ', 
             relationship: type,
             direction: direction
         };
      });
    }
  }

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

  if (!p1 || !p2) return { error: `Không tìm thấy đủ thông tin của 2 người trong gia phả để so sánh.` };
  if (p1.id === p2.id) return { path: [`Hai tên này đều chỉ cùng một người là: ${p1.full_name || p1.name}.`] };

  const graph: Record<string, { id: string, name: string, type: string }[]> = {};
  persons.forEach((p: any) => graph[p.id] = []);

  relationships.forEach((r: any) => {
    if (graph[r.person_id] && graph[r.related_person_id]) {
       const nameA = persons.find((p:any) => p.id === r.related_person_id)?.full_name || 'Không rõ';
       const nameB = persons.find((p:any) => p.id === r.person_id)?.full_name || 'Không rõ';
       const type = r.relationship_type || r.type || 'có họ hàng với';
       graph[r.person_id].push({ id: r.related_person_id, name: nameA, type: type });
       graph[r.related_person_id].push({ id: r.person_id, name: nameB, type: type });
    }
  });

  const queue: { id: string, path: string[] }[] = [{ id: p1.id, path: [p1.full_name || p1.name] }];
  const visited = new Set<string>();
  visited.add(p1.id);

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;
    if (id === p2.id) return { path }; 

    for (const neighbor of graph[id] || []) {
      if (!visited.has(neighbor.id)) {
        visited.add(neighbor.id);
        const newPath = [...path, `(${neighbor.type})`, neighbor.name];
        queue.push({ id: neighbor.id, path: newPath });
      }
    }
  }
  return { path: null, message: "Không tìm thấy mối liên hệ trực tiếp nào giữa hai người này." };
}

// ============================================================================
// 3. API ROUTE CHÍNH
// ============================================================================
export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message) return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });

    const groqApiKey = (process.env.GROQ_API_KEY || '').trim();
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

    if (!groqApiKey || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ reply: 'Lỗi cấu hình biến môi trường.' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ------------------------------------------------------------------------
    // BƯỚC 0: TẢI DANH BẠ
    // ------------------------------------------------------------------------
    const { data: nameData } = await supabase.from('persons').select('full_name, name, ho_ten').limit(3000);
    const validNames = Array.from(new Set((nameData || []).map((p: any) => p.full_name || p.name || p.ho_ten).filter(Boolean))) as string[];
    validNames.sort((a, b) => b.length - a.length);

    // ------------------------------------------------------------------------
    // BƯỚC 1: HỎI AI ĐỂ LẤY Ý ĐỊNH
    // ------------------------------------------------------------------------
    const intentPrompt = `Phân tích câu hỏi và trả về DUY NHẤT JSON. 
Cấu trúc:
{
  "intent": "search_person" | "get_family" | "find_relationship" | "count_members" | "general",
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

    const intentData = await intentRes.json();
    const parsedIntent = parseLLMJson(intentData.choices?.[0]?.message?.content || '{}');
    let backendContext: any = { _debug_intent: parsedIntent.intent };

    // ------------------------------------------------------------------------
    // BƯỚC 2: TÌM TÊN THÔNG MINH
    // ------------------------------------------------------------------------
    const msgNoAccent = removeAccents(message);
    let searchName1 = "";
    let searchName2 = "";

    let tempMsg = msgNoAccent;
    const matchedNames = [];
    for (const name of validNames) {
      const nameNoAccent = removeAccents(name);
      if (nameNoAccent.length > 2 && tempMsg.includes(nameNoAccent)) {
        matchedNames.push(name);
        tempMsg = tempMsg.replace(nameNoAccent, ' '); 
      }
    }

    searchName1 = matchedNames[0] || parsedIntent.name1 || "";
    searchName2 = matchedNames[1] || parsedIntent.name2 || "";

    const verifyHallucination = (extractedName: string) => {
        if (!extractedName) return "";
        const finalClean = removeAccents(extractedName);
        const words = finalClean.split(' ').filter(Boolean);
        const hasHallucination = words.some(word => !msgNoAccent.includes(word));
        if (hasHallucination) {
            return message.replace(/(thông tin|chi tiết|cho biết|hỏi về|ai là|tìm kiếm|tìm|về|của|những|người|tên|cha|mẹ|vợ|chồng|con|cái|gia đình|tiểu sử|dòng họ)/gi, '').replace(/[?.,!]/g, '').trim();
        }
        return extractedName;
    };

    searchName1 = verifyHallucination(searchName1);
    searchName2 = verifyHallucination(searchName2);

    if (!searchName1 && (parsedIntent.intent === 'search_person' || parsedIntent.intent === 'get_family')) {
        searchName1 = message.replace(/(thông tin|chi tiết|cho biết|hỏi về|ai là|tìm kiếm|tìm|về|của|những|người|tên|cha|mẹ|vợ|chồng|con|cái|gia đình|tiểu sử|dòng họ)/gi, '').replace(/[?.,!]/g, '').trim();
    }

    // ------------------------------------------------------------------------
    // BƯỚC 3: THỰC THI LOGIC (GỘP CHUNG TÌM NGƯỜI VÀ GIA ĐÌNH VÀO NHAU)
    // ------------------------------------------------------------------------
    if (parsedIntent.intent === 'count_members') {
      const { count } = await supabase.from('persons').select('*', { count: 'exact', head: true });
      backendContext.total_members = count;
    } 
    else if (parsedIntent.intent === 'find_relationship') {
      if (searchName1 && searchName2) {
        const res = await rpc_FindRelationshipBFS(supabase, searchName1, searchName2);
        backendContext = { ...backendContext, ...res };
      } else {
        backendContext.error = "Bạn cần cung cấp rõ tên của 2 người để kiểm tra mối quan hệ.";
      }
    }
    else if (parsedIntent.intent === 'search_person' || parsedIntent.intent === 'get_family') {
      
      backendContext._debug_name = searchName1;

      if (searchName1) {
        const persons = await rpc_SearchPerson(supabase, searchName1);
        if (persons.length === 0) {
          backendContext.error = `Xin lỗi, hệ thống không tìm thấy ai tên "${searchName1}" trong gia phả.`;
        } else {
          // LUÔN LUÔN GỌI HÀM LẤY GIA ĐÌNH DÙ CHỈ HỎI "THÔNG TIN"
          const res = await rpc_GetProfileAndFamily(supabase, persons[0].id);
          backendContext = { ...backendContext, ...res };
        }
      } else {
         backendContext.error = "Hệ thống không nhận diện được tên người bạn muốn tìm.";
      }
    } 
    else {
      backendContext.note = "Câu hỏi ngoài lề hoặc chào hỏi.";
    }

    // ------------------------------------------------------------------------
    // BƯỚC 4: LLM PHÁT SINH NGÔN NGỮ (NLG)
    // ------------------------------------------------------------------------
    const systemPromptNLG = `Bạn là trợ lý gia phả dòng họ Nguyễn Thiệu. 
Chỉ dựa vào DỮ LIỆU JSON cung cấp bên dưới để trả lời, không bịa đặt.

DỮ LIỆU JSON:
${JSON.stringify(backendContext)}

YÊU CẦU BẮT BUỘC:
1. Nếu JSON có trường "error", trả lời Y HỆT câu thông báo lỗi đó.
2. Nếu JSON có thông tin "person" và "family", BẮT BUỘC phải trình bày 2 phần riêng biệt bằng gạch đầu dòng:
   - Phần 1: Thông tin cá nhân (Giới tính, năm sinh, chức vụ, tình trạng...).
   - Phần 2: Quan hệ gia đình (Liệt kê rõ ai là Bố, Mẹ, Vợ, Chồng, Con cái... dựa trên mảng family). Nếu mảng family rỗng, hãy báo "Chưa cập nhật thông tin người thân".
3. Nếu JSON có ID thành viên ở trường "person.id": BẮT BUỘC chèn ĐÚNG MỘT link ở cuối cùng theo format:
[Nhấn vào đây để xem chi tiết tiểu sử của {Tên}](/dashboard/members?memberModalId={id})
4. Tuyệt đối không hiển thị cấu trúc JSON thô ra màn hình.`;

    const finalRes = await fetch(GROQ_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'system', content: systemPromptNLG }, { role: 'user', content: message }],
        temperature: 0.1,
      }),
    });

    const finalData = await finalRes.json();
    const reply = finalData.choices?.[0]?.message?.content || 'Không đủ thông tin để kết luận.';

    return NextResponse.json({ reply });
    
  } catch (error: any) {
    return NextResponse.json({ reply: `Hệ thống gián đoạn: ${error.message}` }, { status: 500 });
  }
}
