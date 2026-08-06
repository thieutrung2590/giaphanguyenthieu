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
// 2. TẦNG BACKEND LOGIC (QUÉT TOÀN BỘ QUAN HỆ TRONG BỘ NHỚ)
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

// BỘ MÁY QUÉT NGƯỜI THÂN ĐA CHIỀU (SUPER RELATIONSHIP FINDER)
async function rpc_GetProfileAndFamily(supabase: any, personId: string) {
  // Lấy toàn bộ người và quan hệ để phân tích nội bộ (Chống lỗi query Supabase)
  const { data: allPersons } = await supabase.from('persons').select('*').limit(3000);
  const { data: allRels } = await supabase.from('relationships').select('*').limit(10000);

  const person = (allPersons || []).find((p: any) => String(p.id) === String(personId));
  if (!person) return { person: null, family: [] };

  let family: any[] = [];
  const addedIds = new Set<string>();

  const addRelative = (relId: string, relationName: string) => {
    if (!relId || addedIds.has(String(relId)) || String(relId) === String(personId)) return;
    const relative = allPersons?.find((p: any) => String(p.id) === String(relId));
    if (relative) {
      family.push({
        id: relative.id,
        name: relative.full_name || relative.name || relative.ho_ten || 'Không rõ',
        relationship: relationName
      });
      addedIds.add(String(relId));
    }
  };

  // PHÂN TÍCH 1: Từ bảng 'relationships'
  if (allRels && allRels.length > 0) {
    const rels = allRels.filter((r: any) => String(r.person_id) === String(personId) || String(r.related_person_id) === String(personId));
    rels.forEach((r: any) => {
      const isSubject = String(r.person_id) === String(personId);
      const relId = isSubject ? r.related_person_id : r.person_id;
      const type = r.relationship_type || r.type || 'Người thân';
      addRelative(relId, type);
    });
  }

  // PHÂN TÍCH 2: Từ cấu trúc cột trong bảng 'persons' (father_id, mother_id, spouse_id)
  if (allPersons) {
    if (person.father_id) addRelative(person.father_id, 'Cha');
    if (person.mother_id) addRelative(person.mother_id, 'Mẹ');
    if (person.spouse_id) addRelative(person.spouse_id, 'Vợ/Chồng');

    // Tìm con cái (Những ai nhận người này làm cha/mẹ)
    const children = allPersons.filter((p: any) => String(p.father_id) === String(personId) || String(p.mother_id) === String(personId));
    children.forEach((child: any) => addRelative(child.id, 'Con'));

    // Tìm vợ/chồng đối ứng (Những ai nhận người này làm spouse_id)
    const spouses = allPersons.filter((p: any) => String(p.spouse_id) === String(personId));
    spouses.forEach((spouse: any) => addRelative(spouse.id, 'Vợ/Chồng'));
  }

  return { person, family };
}

// BỘ MÁY TÌM ĐƯỜNG ĐI MỐI QUAN HỆ
async function rpc_FindRelationshipBFS(supabase: any, name1: string, name2: string) {
  const { data: persons } = await supabase.from('persons').select('*').limit(3000);
  const { data: relationships } = await supabase.from('relationships').select('*').limit(10000);

  if (!persons) return null;

  const key1 = removeAccents(name1);
  const key2 = removeAccents(name2);
  
  const p1 = persons.find((p: any) => removeAccents(p.full_name || p.name || p.ho_ten || '').includes(key1));
  const p2 = persons.find((p: any) => removeAccents(p.full_name || p.name || p.ho_ten || '').includes(key2));

  if (!p1 || !p2) return { error: `Không tìm thấy đủ thông tin của 2 người trong gia phả để so sánh.` };
  if (String(p1.id) === String(p2.id)) return { path: [`Hai tên này đều chỉ cùng một người là: ${p1.full_name || p1.name || p1.ho_ten}.`] };

  const graph: Record<string, { id: string, name: string, type: string }[]> = {};
  persons.forEach((p: any) => graph[String(p.id)] = []);

  if (relationships) {
    relationships.forEach((r: any) => {
      const pId = String(r.person_id);
      const relId = String(r.related_person_id);
      if (graph[pId] && graph[relId]) {
         const nameA = persons.find((p:any) => String(p.id) === relId)?.full_name || 'Không rõ';
         const nameB = persons.find((p:any) => String(p.id) === pId)?.full_name || 'Không rõ';
         const type = r.relationship_type || r.type || 'có họ hàng với';
         graph[pId].push({ id: relId, name: nameA, type: type });
         graph[relId].push({ id: pId, name: nameB, type: type });
      }
    });
  }

  persons.forEach((p: any) => {
     const pId = String(p.id);
     const pName = p.full_name || p.name || p.ho_ten || 'Không rõ';
     
     const addEdge = (targetId: string, type1: string, type2: string) => {
         if (!targetId) return;
         const tId = String(targetId);
         if (graph[pId] && graph[tId]) {
             const tName = persons.find((t: any) => String(t.id) === tId)?.full_name || 'Không rõ';
             graph[pId].push({ id: tId, name: tName, type: type1 });
             graph[tId].push({ id: pId, name: pName, type: type2 });
         }
     };

     addEdge(p.father_id, 'Cha', 'Con');
     addEdge(p.mother_id, 'Mẹ', 'Con');
     addEdge(p.spouse_id, 'Vợ/Chồng', 'Vợ/Chồng');
  });

  const queue: { id: string, path: string[] }[] = [{ id: String(p1.id), path: [p1.full_name || p1.name || p1.ho_ten] }];
  const visited = new Set<string>();
  visited.add(String(p1.id));

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;
    if (String(id) === String(p2.id)) return { path }; 

    for (const neighbor of graph[id] || []) {
      if (!visited.has(String(neighbor.id))) {
        visited.add(String(neighbor.id));
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
    // BƯỚC 2: KHÓA TÊN MỤC TIÊU & CHỐNG ẢO GIÁC
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
    // BƯỚC 3: THỰC THI TRUY VẤN
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
      
      if (searchName1) {
        const persons = await rpc_SearchPerson(supabase, searchName1);
        if (persons.length === 0) {
          backendContext.error = `Xin lỗi, hệ thống không tìm thấy ai tên "${searchName1}" trong gia phả.`;
        } else {
          // LUÔN LUÔN LẤY GIA ĐÌNH BẤT CHẤP HỎI Ý ĐỊNH GÌ
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
    // BƯỚC 4: LLM XUẤT BẢN CÂU TRẢ LỜI 
    // ------------------------------------------------------------------------
    const systemPromptNLG = `Bạn là trợ lý gia phả dòng họ. 
Chỉ dựa vào DỮ LIỆU JSON cung cấp bên dưới để trả lời, không bịa đặt.

DỮ LIỆU JSON:
${JSON.stringify(backendContext)}

YÊU CẦU BẮT BUỘC:
1. Nếu JSON có trường "error", BẮT BUỘC trả lời Y HỆT câu thông báo lỗi đó.
2. Nếu JSON chứa "person" và "family", BẮT BUỘC hiển thị 2 phần riêng biệt bằng gạch đầu dòng:
   - **Thông tin cá nhân**: Tên, Giới tính, Năm sinh...
   - **Quan hệ gia đình**: Liệt kê rõ ràng danh sách vợ/chồng, con cái, cha, mẹ từ mảng "family". Nếu mảng family rỗng thì báo "Chưa cập nhật thông tin người thân".
3. Nếu JSON có ID thành viên: BẮT BUỘC chèn ĐÚNG MỘT link ở cuối cùng theo định dạng:
[Nhấn vào đây để xem chi tiết tiểu sử của {Tên}](/dashboard/members?memberModalId={id})
4. Không in ra cấu trúc JSON hoặc _debug_intent.`;

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
