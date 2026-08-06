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
  type: string; // Chiều có hướng: "Người này là [type] của người gốc"
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
  path_raw?: string;
  exact_relationship?: string;
  message?: string;
  error?: string;
  note?: string;
}

// ============================================================================
// 2. UTILS & KINSHIP ENGINE (Xử lý Đồ thị có hướng)
// ============================================================================
class UtilsService {
  static removeAccents(str: string): string {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
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
    delete clean.created_at; delete clean.updated_at; delete clean.uuid;
    delete clean.avatar_url; delete clean.image;
    return clean;
  }

  // Phân tích chiều ngược lại của quan hệ
  static getInverse(type: string): string {
    const t = type.toLowerCase().trim();
    if (t.includes('cha') || t.includes('mẹ') || t.includes('bố')) return 'Con';
    if (t === 'con') return 'Cha/Mẹ';
    if (t === 'vợ') return 'Chồng';
    if (t === 'chồng') return 'Vợ';
    if (t.includes('anh') || t.includes('chị')) return 'Em';
    if (t === 'em') return 'Anh/Chị';
    if (t.includes('ông') || t.includes('bà')) return 'Cháu';
    if (t.includes('cháu')) return 'Ông/Bà/Chú/Bác/Cô/Dì';
    if (t.includes('bác') || t.includes('chú') || t.includes('cô') || t.includes('dì') || t.includes('cậu')) return 'Cháu';
    return `Người liên quan của (${type})`;
  }

  // Động cơ tính toán huyết thống chính xác từ đường đi BFS
  static inferExactKinship(pathRelations: string[]): string {
    if (pathRelations.length === 0) return "Cùng một người";
    if (pathRelations.length === 1) return pathRelations[0]; // Trực tiếp 1 bậc

    const p = pathRelations.map(x => x.toLowerCase().trim()).join(' -> ');
    
    // Bộ quy tắc suy luận Graph Logic
    const rules: Record<string, string> = {
        "cha -> cha": "Ông nội",
        "cha -> mẹ": "Bà nội",
        "mẹ -> cha": "Ông ngoại",
        "mẹ -> mẹ": "Bà ngoại",
        "cha -> cha -> cha": "Cụ nội",
        "mẹ -> mẹ -> mẹ": "Cụ ngoại",
        "cha -> anh": "Bác (trai)",
        "cha -> chị": "Bác (gái)",
        "cha -> em": "Chú / Cô",
        "mẹ -> anh": "Cậu",
        "mẹ -> chị": "Dì",
        "mẹ -> em": "Cậu / Dì",
        "con -> con": "Cháu nội/ngoại",
        "con -> con -> con": "Chắt",
        "anh -> cha": "Cha",
        "em -> cha": "Cha",
        "vợ -> cha": "Bố vợ",
        "chồng -> cha": "Bố chồng"
    };

    for (const [key, val] of Object.entries(rules)) {
        if (p.includes(key)) return val;
    }

    // Nếu quá sâu hoặc phức tạp, gom lại thành chuỗi quan hệ chi tiết để LLM dễ đọc
    return `Quan hệ nối tiếp qua ${pathRelations.length} bậc: ` + pathRelations.join(' của ');
  }
}

// ============================================================================
// 3. DATA SERVICE (Webhook & Database Cache - Không dùng TTL)
// ============================================================================
class FamilyTreeDataService {
  private static personsMap: Map<string, PersonRecord> = new Map();
  private static graph: Map<string, GraphEdge[]> = new Map();
  private static nameIndex: Map<string, string[]> = new Map(); 
  private static sortedNameKeys: string[] = []; 
  
  private static isLoaded = false;
  private static CACHE_KEY = 'family_tree_v1';

  /**
   * Tải dữ liệu. forceRefresh = true sẽ được gọi từ Webhook để cập nhật DB Cache.
   */
  static async ensureLoaded(supabase: SupabaseClient, forceRefresh: boolean = false): Promise<void> {
    if (this.isLoaded && !forceRefresh) return; 

    // Nếu không ép làm mới, Cố gắng tải từ Database Cache (Chỉ 1 request O(1))
    if (!forceRefresh) {
        const { data: cacheRow, error: cacheErr } = await supabase
          .from('api_cache')
          .select('payload')
          .eq('key', this.CACHE_KEY)
          .single();

        if (!cacheErr && cacheRow && cacheRow.payload) {
            try {
                const payload = cacheRow.payload;
                this.personsMap = new Map(payload.persons);
                this.graph = new Map(payload.graph);
                this.nameIndex = new Map(payload.nameIndex);
                this.sortedNameKeys = payload.sortedNameKeys;
                
                this.isLoaded = true;
                return;
            } catch (err) {
                console.error("Cache hỏng, tiến hành nạp lại toàn bộ...");
            }
        }
    }

    // Nạp lại toàn bộ từ Database (Chỉ chạy khi forceRefresh hoặc Cache trống)
    this.personsMap.clear();
    this.graph.clear();
    this.nameIndex.clear();
    this.sortedNameKeys = [];

    let allPersons: PersonRecord[] = [];
    let from = 0;
    const step = 1000;
    while (true) {
      const { data, error } = await supabase.from('persons').select('*').range(from, from + step - 1);
      if (error) throw new Error(`Lỗi tải persons: ${error.message}`);
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

    // CẠNH CÓ HƯỚNG: id1 -> id2 (người id2 là type1To2 của id1)
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
      // Quy chuẩn khóa ngoại: Target là người nắm giữ vai trò
      if (p.father_id) addEdge(pId, String(p.father_id), 'Cha', 'Con');
      if (p.mother_id) addEdge(pId, String(p.mother_id), 'Mẹ', 'Con');
      if (p.spouse_id) addEdge(pId, String(p.spouse_id), 'Vợ/Chồng', 'Vợ/Chồng');
    }

    for (const r of allRels) {
      const type = r.relationship_type || r.type || 'Họ hàng';
      // Sử dụng Logic tính chiều ngược lại thay vì gán cứng
      const inverseType = UtilsService.getInverse(type);
      addEdge(String(r.person_id), String(r.related_person_id), type, inverseType);
    }

    this.isLoaded = true;

    const payload = {
        persons: Array.from(this.personsMap.entries()),
        graph: Array.from(this.graph.entries()),
        nameIndex: Array.from(this.nameIndex.entries()),
        sortedNameKeys: this.sortedNameKeys
    };
    
    // Upsert để ghi đè khối JSON
    await supabase.from('api_cache').upsert({ 
        key: this.CACHE_KEY, 
        payload: payload, 
        updated_at: new Date().toISOString() 
    });
  }

  static getPerson(id: string): PersonRecord | undefined { return this.personsMap.get(id); }
  static getFamily(id: string): FamilyMember[] {
    const edges = this.graph.get(id) || [];
    return edges.map(e => ({ id: e.id, name: e.name, relationship_hint: e.type }));
  }
  static getTotalMembers(): number { return this.personsMap.size; }
  static getGraph(): Map<string, GraphEdge[]> { return this.graph; }

  static extractMatchedEntities(text: string): MatchedEntity[] {
    let normalizedText = UtilsService.removeAccents(text);
    const matched: MatchedEntity[] = [];
    for (const key of this.sortedNameKeys) {
      if (key.length > 2 && normalizedText.includes(key)) {
        const ids = this.nameIndex.get(key);
        if (ids && ids.length > 0) matched.push({ normalized: key, ids });
        normalizedText = normalizedText.replace(key, ' '); 
      }
    }
    return matched;
  }
}

// ============================================================================
// 4. BỘ ĐIỀU KHIỂN CHÍNH (API ROUTE)
// ============================================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // BẮT WEBHOOK: Kích hoạt tải lại Cache không điều kiện
    const isWebhookRefresh = body.action === 'refresh_cache';
    const message = body.message || '';
    
    const groqApiKey = (process.env.GROQ_API_KEY || '').trim();
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

    if (!groqApiKey || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ reply: 'Lỗi cấu hình: Thiếu biến môi trường API Key hoặc Supabase.' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Nếu là Webhook, nạp lại Cache và dừng luồng
    if (isWebhookRefresh) {
        await FamilyTreeDataService.ensureLoaded(supabase, true);
        return NextResponse.json({ reply: 'Cache đã được làm mới thành công từ Database!' });
    }

    if (!message) return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });

    await FamilyTreeDataService.ensureLoaded(supabase, false);

    const intentPrompt = `Phân tích câu hỏi và trả về DUY NHẤT JSON. 
Cấu trúc: { "intent": "search_person" | "find_relationship" | "count_members" | "general", "name1": "Tên 1", "name2": "Tên 2" }
LƯU Ý: Bỏ qua danh xưng (cụ, kỵ, ông, bà, anh, chị...). Các câu hỏi bắt đầu bằng "thông tin", "hỏi về", "ai là" là "search_person".`;
    
    const intentRes = await fetch(GROQ_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: GROQ_MODEL, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: intentPrompt }, { role: 'user', content: message }], temperature: 0.1 }),
    });
    const intentText = (await intentRes.json()).choices?.[0]?.message?.content || '{}';
    const parsedIntent = UtilsService.parseLLMJson(intentText);
    
    const matchedEntities = FamilyTreeDataService.extractMatchedEntities(message);
    const entity1 = matchedEntities[0] || null;
    const entity2 = matchedEntities[1] || null;

    if (parsedIntent.intent === 'general' && entity1) {
       parsedIntent.intent = entity2 ? 'find_relationship' : 'search_person';
    }

    const backendContext: BackendContext = { _debug_intent: parsedIntent.intent };

    let fallbackEntity: MatchedEntity | null = null;
    if (!entity1 && parsedIntent.intent === 'search_person') {
      const fallbackName = message.replace(/(thông tin|chi tiết|cho biết|hỏi về|ai là|tìm kiếm|tìm|về|của|những|người|tên|cha|mẹ|vợ|chồng|con|cái|gia đình|tiểu sử|dòng họ|anh|chị|em|ông|bà|cụ|kỵ|kị|chú|bác|cô|dì|dượng|mợ|thím)/gi, '').replace(/[?.,!]/g, '').trim();
      const fbNorm = UtilsService.removeAccents(fallbackName);
      const graphNames = Array.from(FamilyTreeDataService.getGraph().keys()).map(id => FamilyTreeDataService.getPerson(id)?.full_name || '');
      const foundEntity = FamilyTreeDataService.extractMatchedEntities(fallbackName)[0];
      if (foundEntity) fallbackEntity = foundEntity;
    }

    const targetEntity = entity1 || fallbackEntity;

    if (parsedIntent.intent === 'count_members') {
      backendContext.total_members = FamilyTreeDataService.getTotalMembers();
    } 
    else if (parsedIntent.intent === 'find_relationship') {
      if (entity1 && entity2) {
        if (entity1.ids.length > 1 || entity2.ids.length > 1) {
            backendContext.note = `Có nhiều người trùng tên "${entity1.normalized}" hoặc "${entity2.normalized}". Hệ thống chọn một cặp đại diện.`;
        }

        const id1 = entity1.ids[0];
        const id2 = entity2.ids[0];

        if (id1 === id2) {
          backendContext.exact_relationship = "Cùng là một người";
        } else {
          const graph = FamilyTreeDataService.getGraph();
          const queue: { id: string; pathRelations: string[] }[] = [{ id: id1, pathRelations: [] }];
          const visited = new Set<string>([id1]);
          let found = false;

          while (queue.length > 0) {
            const { id: currentId, pathRelations } = queue.shift()!;
            if (currentId === id2) {
              backendContext.exact_relationship = UtilsService.inferExactKinship(pathRelations);
              backendContext.path_raw = pathRelations.join(' -> ');
              found = true;
              break;
            }
            for (const neighbor of graph.get(currentId) || []) {
              if (!visited.has(neighbor.id)) {
                visited.add(neighbor.id);
                queue.push({ id: neighbor.id, pathRelations: [...pathRelations, neighbor.type] });
              }
            }
          }
          if (!found) backendContext.error = 'Không tìm thấy đường huyết thống kết nối giữa hai người này.';
        }
      } else {
        backendContext.error = 'Cần cung cấp rõ tên 2 người có trong gia phả.';
      }
    } 
    else if (parsedIntent.intent === 'search_person' || parsedIntent.intent === 'get_family' || fallbackEntity) {
      if (targetEntity && targetEntity.ids.length > 0) {
        if (targetEntity.ids.length === 1) {
            const pId = targetEntity.ids[0];
            const pData = FamilyTreeDataService.getPerson(pId);
            if (pData) {
                backendContext.person = UtilsService.cleanPersonData(pData);
                backendContext.family = FamilyTreeDataService.getFamily(pId);
            }
        } else {
            backendContext.multiple_matches = targetEntity.ids.map(pId => ({
                person: UtilsService.cleanPersonData(FamilyTreeDataService.getPerson(pId)!),
                family: FamilyTreeDataService.getFamily(pId)
            }));
        }
      } else {
        backendContext.error = 'Hệ thống không nhận diện được tên người cần tìm.';
      }
    } 
    else {
      backendContext.note = 'Câu hỏi ngoài lề hoặc giao tiếp thông thường.';
    }

    // ------------------------------------------------------------------------
    // BƯỚC 5: LLM NLG - CHỈ DIỄN ĐẠT, KHÔNG TỰ SUY LUẬN TOÁN HỌC
    // ------------------------------------------------------------------------
    const systemPromptNLG = `Bạn là trợ lý gia phả dòng họ. 
JSON CONTEXT:
${JSON.stringify(backendContext)}

HƯỚNG DẪN TRÌNH BÀY (BẮT BUỘC):
1. KHÔNG tự suy luận. Chỉ dùng kết quả từ Backend.
2. Nếu hỏi Quan hệ (find_relationship): Dùng trường "exact_relationship" để trả lời ngay lập tức (VD: "A là Ông nội của B"). Không cần kể lể dài dòng đường đi (path_raw).
3. Nếu tìm người: In ra Thông tin cá nhân và Quan hệ gia đình. Bắt buộc có link hồ sơ ở cuối mỗi người:
[Nhấn vào đây để xem chi tiết tiểu sử của {Tên}](/dashboard/members?memberModalId={id})
4. Không in các trường _debug hoặc JSON ra màn hình.`;

    const finalRes = await fetch(GROQ_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'system', content: systemPromptNLG }, { role: 'user', content: message }], temperature: 0.1 }),
    });

    const finalReply = (await finalRes.json()).choices?.[0]?.message?.content || 'Không đủ thông tin để kết luận.';
    return NextResponse.json({ reply: finalReply });

  } catch (error: any) {
    console.error('Family Tree API Error:', error);
    return NextResponse.json({ reply: `Hệ thống gián đoạn: ${error.message}` }, { status: 500 });
  }
}
