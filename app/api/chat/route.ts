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
  other_names?: string;
  gender?: string;
  birth_year?: number;
  birth_order?: number;
  death_year?: number;
  is_deceased?: boolean;
  is_in_law?: boolean;
  generation?: number;
  [key: string]: any; 
}

interface RelationshipRecord {
  id?: string | number;
  type?: string;
  relationship_type?: string;
  person_a: string | number;
  person_b: string | number;
  note?: string;
  [key: string]: any; 
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
  path_raw?: string;
  exact_relationship?: string;
  message?: string;
  error?: string;
  note?: string;
}

// ============================================================================
// 2. UTILS & ADVANCED KINSHIP ENGINE 
// ============================================================================
class UtilsService {
  static removeAccents(str: string): string {
    if (!str) return '';
    return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
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

  static inferExactKinship(pathIds: string[], personsMap: Map<string, PersonRecord>): string {
    if (pathIds.length < 2) return "Chính là một người";
    
    const source = personsMap.get(pathIds[0]);
    const target = personsMap.get(pathIds[pathIds.length - 1]);
    
    if (!source || !target) return "Có họ hàng";

    if (pathIds.length === 2) {
      const genDiff = (target.generation || 0) - (source.generation || 0);
      if (genDiff === -1) {
          if (target.is_in_law) return target.gender === 'male' ? "Bố dượng / Cha dượng" : "Mẹ kế / Dì ghẻ";
          return target.gender === 'male' ? "Cha / Bố" : "Mẹ";
      }
      if (genDiff === 1) return target.gender === 'male' ? "Con trai" : "Con gái";
      if (genDiff === 0 && target.is_in_law) return target.gender === 'male' ? "Chồng" : "Vợ";
    }

    const genDiff = (target.generation || 0) - (source.generation || 0);
    
    const isTargetOlder = () => {
        if (target.birth_order && source.birth_order) return target.birth_order < source.birth_order;
        if (target.birth_year && source.birth_year) return target.birth_year < source.birth_year;
        return false; 
    };

    if (genDiff === 0 && pathIds.length > 2) {
        if (target.is_in_law) {
            return target.gender === 'male' ? "Anh rể / Em rể" : "Chị dâu / Em dâu";
        }
        if (isTargetOlder()) return target.gender === 'male' ? "Anh" : "Chị";
        return target.gender === 'male' ? "Em trai" : "Em gái";
    }

    if (genDiff === -1 && pathIds.length > 2) {
        const parentId = pathIds[1]; 
        const parent = personsMap.get(parentId);
        
        if (parent) {
            const isTargetOlderThanParent = () => {
                if (target.birth_order && parent.birth_order) return target.birth_order < parent.birth_order;
                if (target.birth_year && parent.birth_year) return target.birth_year < parent.birth_year;
                return false;
            };

            const isOlder = isTargetOlderThanParent();
            const isPaternal = parent.gender === 'male'; 

            if (target.is_in_law) {
                 if (isPaternal) return target.gender === 'female' ? (isOlder ? "Bác gái (vợ bác)" : "Thím") : "Dượng (chồng cô)";
                 return target.gender === 'male' ? "Dượng" : "Mợ";
            }

            if (isPaternal) { 
                if (isOlder) return target.gender === 'male' ? "Bác (trai)" : "Bác (gái)";
                return target.gender === 'male' ? "Chú" : "Cô";
            } else { 
                if (target.gender === 'male') return "Cậu";
                return isOlder ? "Dì (lớn)" : "Dì (nhỏ)";
            }
        }
    }

    if (genDiff === -2) return target.gender === 'male' ? "Ông" : "Bà";
    if (genDiff === -3) return target.gender === 'male' ? "Cụ ông" : "Cụ bà";
    if (genDiff === -4) return target.gender === 'male' ? "Kỵ ông" : "Kỵ bà";

    if (genDiff === 1) return target.gender === 'male' ? "Cháu trai" : "Cháu gái";
    if (genDiff === 2) return "Cháu";
    if (genDiff === 3) return "Chắt";
    if (genDiff === 4) return "Chút";

    return `Quan hệ cách nhau ${Math.abs(genDiff)} đời`;
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
  private static CACHE_KEY = 'family_tree_v4';

  static async ensureLoaded(supabase: SupabaseClient, forceRefresh: boolean = false): Promise<void> {
    if (this.isLoaded && !forceRefresh) return; 

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

    this.personsMap.clear();
    this.graph.clear();
    this.nameIndex.clear();
    this.sortedNameKeys = [];

    let allPersons: PersonRecord[] = [];
    let from = 0;
    const step = 1000;
    while (true) {
      // ĐÃ SỬA LỖI: Chỉ gọi các cột thực sự tồn tại trong CSDL
      const { data, error } = await supabase.from('persons')
        .select('id, full_name, other_names, gender, birth_year, birth_order, generation, is_in_law, death_year, note')
        .range(from, from + step - 1);
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

      // Lấy tên chính và tên phụ (nếu có)
      const rawName = p.full_name || p.other_names;
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
      const name1 = String(n1?.full_name || n1?.other_names || 'Không rõ');
      const name2 = String(n2?.full_name || n2?.other_names || 'Không rõ');

      const edges1 = this.graph.get(id1)!;
      if (!edges1.some(e => e.id === id2)) edges1.push({ id: id2, name: name2, type: String(type1To2) });

      const edges2 = this.graph.get(id2)!;
      if (!edges2.some(e => e.id === id1)) edges2.push({ id: id1, name: name1, type: String(type2To1) });
    };

    for (const r of allRels) {
      const type = r.type as string; 
      const idA = String(r.person_a);
      const idB = String(r.person_b);

      const personA = this.personsMap.get(idA);
      const personB = this.personsMap.get(idB);

      if (!personA || !personB) continue;

      if (type === 'biological_child') {
        const roleOfA = personA.gender === 'male' ? 'Cha' : 'Mẹ';
        const roleOfB = 'Con';
        addEdge(idA, idB, roleOfB, roleOfA);
      } 
      else if (type === 'marriage') {
        const roleOfA = personA.gender === 'male' ? 'Chồng' : 'Vợ';
        const roleOfB = personB.gender === 'male' ? 'Chồng' : 'Vợ';
        addEdge(idA, idB, roleOfB, roleOfA);
      }
      else {
        const relationType = String(r.relationship_type || type || 'Họ hàng');
        addEdge(idA, idB, relationType, relationType);
      }
    }

    this.isLoaded = true;

    const payload = {
        persons: Array.from(this.personsMap.entries()),
        graph: Array.from(this.graph.entries()),
        nameIndex: Array.from(this.nameIndex.entries()),
        sortedNameKeys: this.sortedNameKeys
    };
    
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
  static getPersonsMap(): Map<string, PersonRecord> { return this.personsMap; }

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
    const body = await req.json();
    
    const isWebhookRefresh = body.action === 'refresh_cache';
    const message = body.message || '';
    
    const groqApiKey = (process.env.GROQ_API_KEY || '').trim();
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

    if (!groqApiKey || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ reply: 'Lỗi cấu hình: Thiếu biến môi trường API Key hoặc Supabase.' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (isWebhookRefresh) {
        await FamilyTreeDataService.ensureLoaded(supabase, true);
        return NextResponse.json({ reply: 'Cache đã được làm mới thành công từ Database!' });
    }

    if (!message) return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });

    await FamilyTreeDataService.ensureLoaded(supabase, false);

    const intentPrompt = `Phân tích câu hỏi và trả về DUY NHẤT JSON. 
Cấu trúc: { "intent": "search_person" | "find_relationship" | "count_members" | "general", "name1": "Tên 1", "name2": "Tên 2" }
LƯU Ý: Bỏ qua danh xưng (cụ, kỵ, ông, bà, anh, chị, chú, bác, dì, cô, dượng, mợ, thím...) khi trích xuất tên.
Các câu hỏi bắt đầu bằng "thông tin", "hỏi về", "ai là" chứa tên người đều có intent là "search_person".`;
    
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
          backendContext.exact_relationship = "Chính là một người";
        } else {
          const graph = FamilyTreeDataService.getGraph();
          const personsMap = FamilyTreeDataService.getPersonsMap();
          
          const queue: { id: string; pathIds: string[] }[] = [{ id: id1, pathIds: [id1] }];
          const visited = new Set<string>([id1]);
          let found = false;

          while (queue.length > 0) {
            const { id: currentId, pathIds } = queue.shift()!;
            if (currentId === id2) {
              backendContext.exact_relationship = UtilsService.inferExactKinship(pathIds, personsMap);
              
              backendContext.path_raw = pathIds.map(pid => personsMap.get(pid)?.full_name || '').join(' -> ');
              found = true;
              break;
            }
            for (const neighbor of graph.get(currentId) || []) {
              if (!visited.has(neighbor.id)) {
                visited.add(neighbor.id);
                queue.push({ id: neighbor.id, pathIds: [...pathIds, neighbor.id] });
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
    // BƯỚC 5: LLM NLG 
    // ------------------------------------------------------------------------
    const systemPromptNLG = `Bạn là trợ lý gia phả dòng họ. 
JSON CONTEXT:
${JSON.stringify(backendContext)}

HƯỚNG DẪN TRÌNH BÀY (BẮT BUỘC):
1. KHÔNG tự suy luận. Chỉ dùng kết quả từ Backend.
2. Nếu có "error", BẮT BUỘC trả lời Y HỆT câu báo lỗi.
3. Nếu có "note", hãy hiển thị nó như một cảnh báo/lưu ý.
4. Nếu JSON có mảng "multiple_matches" (Trùng tên), hãy trình bày danh sách LẦN LƯỢT TỪNG NGƯỜI (bao gồm Thông tin cá nhân và Quan hệ gia đình). Bắt buộc chèn Link hồ sơ bên dưới mỗi người.
5. Nếu hỏi Quan hệ (find_relationship): Dùng trường "exact_relationship" để trả lời ngay lập tức (VD: "Người A gọi B là: Dượng"). 
6. Nếu tìm người: In ra Thông tin cá nhân và Quan hệ gia đình. Bắt buộc có link hồ sơ ở cuối mỗi người:
[Nhấn vào đây để xem chi tiết tiểu sử của {Tên}](/dashboard/members?memberModalId={id})
7. Không in các trường _debug hoặc JSON ra màn hình.`;

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
