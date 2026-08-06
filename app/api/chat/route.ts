import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const GROQ_API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ============================================================================
// 1. INTERFACES & TYPES
// ============================================================================
interface PersonRecord {
  id: string | number;
  full_name?: string;
  name?: string;
  ho_ten?: string;
  gender?: string;
  birth_date?: string;
  death_date?: string;
  father_id?: string | number;
  mother_id?: string | number;
  spouse_id?: string | number;
  [key: string]: unknown; 
}

interface RelationshipRecord {
  person_id: string | number;
  related_person_id: string | number;
  relationship_type?: string;
  type?: string;
}

interface GraphEdge {
  id: string;
  name: string;
  type: string;
}

interface FamilyMember {
  id: string;
  name: string;
  relationship_hint: string;
}

interface IntentJSON {
  intent: 'search_person' | 'get_family' | 'find_relationship' | 'count_members' | 'general';
  name1: string;
  name2: string;
}

interface MatchedEntity {
  normalized: string;
  ids: string[];
}

interface MultipleMatch {
  person: Partial<PersonRecord>;
  family: FamilyMember[];
}

interface BackendContext {
  _debug_intent?: string;
  _debug_name?: string;
  total_members?: number;
  person?: Partial<PersonRecord>;
  family?: FamilyMember[];
  multiple_matches?: MultipleMatch[]; 
  path?: string[];
  message?: string;
  error?: string;
  note?: string;
}

// ============================================================================
// 2. UTILS SERVICE 
// ============================================================================
class UtilsService {
  static removeAccents(str: string): string {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  }

  static parseLLMJson(rawText: string): IntentJSON {
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as IntentJSON;
      return { intent: 'general', name1: '', name2: '' };
    } catch (error) {
      return { intent: 'general', name1: '', name2: '' };
    }
  }

  static cleanPersonData(person: PersonRecord): Partial<PersonRecord> {
    const clean: Partial<PersonRecord> = { ...person };
    delete clean.created_at;
    delete clean.updated_at;
    delete clean.uuid;
    delete clean.avatar_url;
    delete clean.image;
    return clean;
  }
}

// ============================================================================
// 3. DATA SERVICE
// ============================================================================
class FamilyTreeDataService {
  private static personsMap: Map<string, PersonRecord> = new Map();
  private static graph: Map<string, GraphEdge[]> = new Map();
  private static nameIndex: Map<string, string[]> = new Map(); 
  private static sortedNameKeys: string[] = []; 
  
  private static isLoaded = false;
  private static lastLoadTime = 0;
  private static CACHE_TTL = 1000 * 60 * 60; 

  static async ensureLoaded(supabase: SupabaseClient): Promise<void> {
    const now = Date.now();
    if (this.isLoaded && now - this.lastLoadTime < this.CACHE_TTL) return; 

    this.personsMap.clear();
    this.graph.clear();
    this.nameIndex.clear();
    this.sortedNameKeys = [];

    let allPersons: PersonRecord[] = [];
    let from = 0;
    const step = 1000;
    while (true) {
      const { data, error } = await supabase.from('persons').select('*').range(from, from + step - 1);
      if (error) throw new Error(`Lỗi tải bảng persons: ${error.message}`);
      if (!data || data.length === 0) break;
      allPersons = allPersons.concat(data as PersonRecord[]);
      if (data.length < step) break;
      from += step;
    }

    let allRels: RelationshipRecord[] = [];
    from = 0;
    while (true) {
      const { data, error } = await supabase.from('relationships').select('*').range(from, from + step - 1);
      if (error) break; 
      if (!data || data.length === 0) break;
      allRels = allRels.concat(data as RelationshipRecord[]);
      if (data.length < step) break;
      from += step;
    }

    for (const p of allPersons) {
      const pId = String(p.id);
      this.personsMap.set(pId, p);
      this.graph.set(pId, []);

      const rawName = p.full_name || p.name || p.ho_ten;
      if (typeof rawName === 'string') {
        const normalized = UtilsService.removeAccents(rawName);
        if (!this.nameIndex.has(normalized)) {
          this.nameIndex.set(normalized, []);
          this.sortedNameKeys.push(normalized);
        }
        this.nameIndex.get(normalized)!.push(pId);
      }
    }

    this.sortedNameKeys.sort((a, b) => b.length - a.length);

    const addEdge = (id1: string, id2: string, type1To2: string, type2To1: string) => {
      if (!id1 || !id2 || id1 === id2 || !this.graph.has(id1) || !this.graph.has(id2)) return;
      
      const n1 = this.personsMap.get(id1);
      const n2 = this.personsMap.get(id2);
      const name1 = (n1?.full_name || n1?.name || n1?.ho_ten || 'Không rõ') as string;
      const name2 = (n2?.full_name || n2?.name || n2?.ho_ten || 'Không rõ') as string;

      const edges1 = this.graph.get(id1)!;
      if (!edges1.some(e => e.id === id2)) edges1.push({ id: id2, name: name2, type: type1To2 });

      const edges2 = this.graph.get(id2)!;
      if (!edges2.some(e => e.id === id1)) edges2.push({ id: id1, name: name1, type: type2To1 });
    };

    for (const p of allPersons) {
      const pId = String(p.id);
      if (p.father_id) addEdge(pId, String(p.father_id), 'Cha', 'Con');
      if (p.mother_id) addEdge(pId, String(p.mother_id), 'Mẹ', 'Con');
      if (p.spouse_id) addEdge(pId, String(p.spouse_id), 'Vợ/Chồng', 'Vợ/Chồng');

      for (const key of Object.keys(p)) {
        if (key.endsWith('_id') && !['father_id', 'mother_id', 'spouse_id'].includes(key)) {
          const targetId = String(p[key]);
          if (p[key] && this.graph.has(targetId)) {
            addEdge(pId, targetId, key, `Liên kết ngược của ${key}`);
          }
        }
      }
    }

    for (const r of allRels) {
      const type = r.relationship_type || r.type || 'Họ hàng';
      addEdge(String(r.person_id), String(r.related_person_id), type, type);
    }

    this.isLoaded = true;
    this.lastLoadTime = now;
  }

  static getPerson(id: string): PersonRecord | undefined {
    return this.personsMap.get(id);
  }

  static getFamily(id: string): FamilyMember[] {
    const edges = this.graph.get(id) || [];
    return edges.map(e => ({ id: e.id, name: e.name, relationship_hint: e.type }));
  }

  static getTotalMembers(): number {
    return this.personsMap.size;
  }

  static getGraph(): Map<string, GraphEdge[]> {
    return this.graph;
  }

  static extractMatchedEntities(text: string): MatchedEntity[] {
    let normalizedText = UtilsService.removeAccents(text);
    const matched: MatchedEntity[] = [];

    for (const key of this.sortedNameKeys) {
      if (key.length > 2 && normalizedText.includes(key)) {
        const ids = this.nameIndex.get(key);
        if (ids && ids.length > 0) {
          matched.push({ normalized: key, ids });
        }
        normalizedText = normalizedText.replace(key, ' '); 
      }
    }
    return matched;
  }

  static searchFallbackEntity(fallbackName: string): MatchedEntity | null {
    const fbNorm = UtilsService.removeAccents(fallbackName);
    if (fbNorm.length < 2) return null;
    
    const foundKey = this.sortedNameKeys.find(k => k.includes(fbNorm) || fbNorm.includes(k));
    if (foundKey) {
      return { normalized: foundKey, ids: this.nameIndex.get(foundKey) || [] };
    }
    return null;
  }
}

// ============================================================================
// 4. LLM SERVICE 
// ============================================================================
class LLMService {
  static async generate(apiKey: string, prompt: string, message: string, useJSON: boolean): Promise<any> {
    const response = await fetch(GROQ_API_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        response_format: useJSON ? { type: 'json_object' } : undefined,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: message },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`LLM Error: ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content;
  }
}

// ============================================================================
// 5. BỘ ĐIỀU KHIỂN CHÍNH (API ROUTE POST)
// ============================================================================
export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message) return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });

    const groqApiKey = (process.env.GROQ_API_KEY || '').trim();
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

    if (!groqApiKey || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ reply: 'Lỗi cấu hình: Thiếu biến môi trường API Key hoặc Supabase.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    await FamilyTreeDataService.ensureLoaded(supabase);

    // Bước 1: AI Nhận diện Intent (Đã dặn dò kĩ về danh xưng)
    const intentPrompt = `Phân tích câu hỏi và trả về DUY NHẤT JSON. 
Cấu trúc: { "intent": "search_person" | "find_relationship" | "count_members" | "general", "name1": "Tên 1", "name2": "Tên 2" }
LƯU Ý QUAN TRỌNG: 
- Bỏ qua các danh xưng (cụ, kỵ, kị, ông, bà, anh, chị, chú, bác...) khi trích xuất tên.
- Các câu hỏi bắt đầu bằng "thông tin", "hỏi về", "ai là" chứa tên người đều có intent là "search_person".`;
    
    const intentText = await LLMService.generate(groqApiKey, intentPrompt, message, true);
    const parsedIntent = UtilsService.parseLLMJson(intentText);
    
    // Bước 2: Quét Tên chính xác
    const matchedEntities = FamilyTreeDataService.extractMatchedEntities(message);
    const entity1 = matchedEntities[0] || null;
    const entity2 = matchedEntities[1] || null;

    // AUTO-CORRECT AI: Ép chuẩn Intent nếu AI nhầm lẫn nhưng mình vẫn quét được tên
    if (parsedIntent.intent === 'general' && entity1) {
       if (entity2) parsedIntent.intent = 'find_relationship';
       else parsedIntent.intent = 'search_person';
    }

    const backendContext: BackendContext = { _debug_intent: parsedIntent.intent };

    // Bước 3: Fallback Regex (Đã bổ sung bộ lọc danh xưng đầy đủ)
    let fallbackEntity: MatchedEntity | null = null;
    if (!entity1 && parsedIntent.intent === 'search_person') {
      const fallbackName = message
        .replace(/(thông tin|chi tiết|cho biết|hỏi về|ai là|tìm kiếm|tìm|về|của|những|người|tên|cha|mẹ|vợ|chồng|con|cái|gia đình|tiểu sử|dòng họ|anh|chị|em|ông|bà|cụ|kỵ|kị|chú|bác|cô|dì|dượng|mợ|thím)/gi, '')
        .replace(/[?.,!]/g, '')
        .trim();
      fallbackEntity = FamilyTreeDataService.searchFallbackEntity(fallbackName);
    }

    const targetEntity = entity1 || fallbackEntity;

    // THỰC THI LOGIC TRÊN RAM
    if (parsedIntent.intent === 'count_members') {
      backendContext.total_members = FamilyTreeDataService.getTotalMembers();
    } 
    else if (parsedIntent.intent === 'find_relationship') {
      if (entity1 && entity2) {
        if (entity1.ids.length > 1 || entity2.ids.length > 1) {
            backendContext.note = `Lưu ý: Có nhiều người trùng tên "${entity1.normalized}" hoặc "${entity2.normalized}". Hệ thống đang tạm chọn một cặp để kiểm tra. Hãy cung cấp thêm thông tin để tra cứu chính xác hơn.`;
        }

        const id1 = entity1.ids[0];
        const id2 = entity2.ids[0];

        if (id1 === id2) {
          backendContext.path = [`Hai tên này đều chỉ cùng một người là: ${FamilyTreeDataService.getPerson(id1)?.full_name || 'Không rõ'}.`];
        } else {
          const graph = FamilyTreeDataService.getGraph();
          const p1Name = FamilyTreeDataService.getPerson(id1)?.full_name || 'Không rõ';
          const queue: { id: string; path: string[] }[] = [{ id: id1, path: [p1Name] }];
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
          if (!found) backendContext.message = 'Không tìm thấy mối liên hệ trực tiếp nào giữa hai người này.';
        }
      } else {
        backendContext.error = 'Bạn cần cung cấp rõ tên của 2 người có trong gia phả để kiểm tra mối quan hệ.';
      }
    } 
    else if (parsedIntent.intent === 'search_person' || parsedIntent.intent === 'get_family' || fallbackEntity) {
      if (targetEntity && targetEntity.ids.length > 0) {
        
        if (targetEntity.ids.length === 1) {
            const pId = targetEntity.ids[0];
            const personData = FamilyTreeDataService.getPerson(pId);
            if (personData) {
                backendContext.person = UtilsService.cleanPersonData(personData);
                backendContext.family = FamilyTreeDataService.getFamily(pId);
            }
        } else {
            backendContext.multiple_matches = targetEntity.ids.map(pId => {
                const personData = FamilyTreeDataService.getPerson(pId)!;
                return {
                    person: UtilsService.cleanPersonData(personData),
                    family: FamilyTreeDataService.getFamily(pId)
                };
            });
        }
      } else {
        backendContext.error = 'Hệ thống không nhận diện được tên người bạn muốn tìm trong dữ liệu.';
      }
    } 
    else {
      backendContext.note = 'Câu hỏi ngoài lề hoặc giao tiếp thông thường.';
    }

    // ------------------------------------------------------------------------
    // BƯỚC 4: LLM PHÁT SINH NGÔN NGỮ (NLG)
    // ------------------------------------------------------------------------
    const systemPromptNLG = `Bạn là trợ lý gia phả dòng họ. 
Chỉ dựa vào DỮ LIỆU JSON cung cấp bên dưới để trả lời, không tự bịa đặt.

DỮ LIỆU JSON:
${JSON.stringify(backendContext)}

YÊU CẦU BẮT BUỘC:
1. Nếu có "error", BẮT BUỘC trả lời Y HỆT câu báo lỗi.
2. Nếu có "note", hãy hiển thị nó như một cảnh báo/lưu ý cho người dùng.
3. Nếu JSON có mảng "multiple_matches" (Do có nhiều người TRÙNG TÊN), hãy trình bày danh sách LẦN LƯỢT TỪNG NGƯỜI (bao gồm Thông tin cá nhân và Quan hệ gia đình của mỗi người) để người dùng tự phân biệt. Bắt buộc chèn Link hồ sơ bên dưới mỗi người.
4. Nếu JSON chỉ có 1 "person" và "family", chia làm 2 phần:
   - **Thông tin cá nhân**
   - **Quan hệ gia đình** (Dựa theo relationship_hint để dịch ra vai trò).
5. CHÈN LINK: Nếu có ID, phải chèn link theo format: [Nhấn vào đây để xem chi tiết tiểu sử của {Tên}](/dashboard/members?memberModalId={id}). Nếu liệt kê nhiều người trùng tên, hãy chèn link tương ứng vào cuối phần thông tin của từng người.`;

    const finalReply = await LLMService.generate(groqApiKey, systemPromptNLG, message, false);

    return NextResponse.json({ reply: finalReply || 'Không đủ thông tin để kết luận.' });

  } catch (error: any) {
    console.error('Family Tree API Error:', error);
    return NextResponse.json({ reply: `Hệ thống gián đoạn: ${error.message}` }, { status: 500 });
  }
}
