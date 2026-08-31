import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEEPSEEK_API_ENDPOINT = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';

// ============================================================================
// 0. SYSTEM PROMPT NGL (Bất biến ở cấp Module để tối ưu DeepSeek Cache)
// ============================================================================
const SYSTEM_PROMPT_NLG = `Bạn là trợ lý AI ưu tiên tuyệt đối tính CHÍNH XÁC và ĐÁNG TIN CẬY. Nguyên tắc bắt buộc: Chỉ cung cấp thông tin đã được kiểm chứng từ nguồn JSON CONTEXT được cung cấp trong câu hỏi của người dùng. Không suy đoán, không bịa đặt, không tạo thông tin khi dữ liệu không đủ. Nếu không có dữ liệu chắc chắn, hãy nói rõ “không đủ thông tin để kết luận”.

HƯỚNG DẪN TRÌNH BÀY (BẮT BUỘC):
1. Nếu có "error", BẮT BUỘC trả lời Y HỆT câu báo lỗi.
2. Nếu có "note", hãy hiển thị nó như một cảnh báo/lưu ý.
3. Nếu JSON có mảng "multiple_matches", "multiple_matches_name1", "multiple_matches_name2" (Trùng tên), hãy trình bày danh sách LẦN LƯỢT TỪNG NGƯỜI. Bắt buộc chèn Link hồ sơ bên dưới mỗi người.
4. Nếu có trường "exact_relationship", dùng nó để trả lời trực tiếp (VD: "Người A gọi B là: Dượng"). 
5. Nếu là xem thông tin: In ra Thông tin cá nhân và Quan hệ gia đình. Bắt buộc có link hồ sơ ở cuối:
[Nhấn vào đây để xem chi tiết tiểu sử của {Tên}](/dashboard/members?memberModalId={id})
6. Tuyệt đối không in mã JSON hoặc dữ liệu thô ra màn hình.`;

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
  created_at?: string;
  updated_at?: string;
  uuid?: string;
  image?: string;
  avatar_url?: string;
  [key: string]: any; 
}

interface RelationshipRecord {
  id?: string | number;
  type?: string;
  relationship_type?: string;
  person_a?: string | number;
  person_b?: string | number;
  person_id?: string | number;
  related_person_id?: string | number;
  note?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any; 
}

interface FamilyMember {
  id: string;
  name: string;
  relationship_hint: string;
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
  total_members?: number;
  person?: Partial<PersonRecord>;
  family?: FamilyMember[];
  multiple_matches?: MultipleMatch[]; 
  multiple_matches_name1?: MultipleMatch[]; 
  multiple_matches_name2?: MultipleMatch[]; 
  path_raw?: string;
  exact_relationship?: string;
  message?: string;
  error?: string;
  note?: string;
}

// ============================================================================
// 2. KINSHIP ENGINE PIPELINE
// ============================================================================
class UtilsService {
  static removeAccents(str: string): string {
    if (!str) return '';
    return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
  }

  static cleanPersonData(person: PersonRecord): Partial<PersonRecord> {
    const clean: Partial<PersonRecord> = { ...person };
    delete clean.created_at; delete clean.updated_at; 
    delete clean.uuid; delete clean.avatar_url; delete clean.image;
    return clean;
  }

  static getAncestorsMap(startId: string, parentsMap: Map<string, string[]>): Map<string, string[]> {
    const ancestors = new Map<string, string[]>();
    const queue: { id: string, path: string[] }[] = [{ id: startId, path: [startId] }];
    
    while(queue.length > 0) {
        const {id, path} = queue.shift()!;
        if (!ancestors.has(id)) {
            ancestors.set(id, path);
            const parents = parentsMap.get(id) || [];
            for (const pid of parents) {
                if (!path.includes(pid)) {
                    queue.push({id: pid, path: [...path, pid]});
                }
            }
        }
    }
    return ancestors;
  }

  // BƯỚC 1: Xác định danh xưng Huyết Thống thuần túy
  static getBloodTerm(source: string, target: string, pathS: string[], pathT: string[], personsMap: Map<string, PersonRecord>, parentsMap: Map<string, string[]>): string {
    const distS = pathS.length - 1;
    const distT = pathT.length - 1;
    if (distS === 0 && distT === 0) return 'Bản thân';

    const tMale = personsMap.get(target)?.gender === 'male';

    if (distT === 0) {
        if (distS === 1) return tMale ? 'Cha' : 'Mẹ';
        if (distS === 2) {
            const parent = personsMap.get(pathS[1]);
            const isNoi = parent?.gender === 'male';
            return isNoi ? (tMale ? 'Ông nội' : 'Bà nội') : (tMale ? 'Ông ngoại' : 'Bà ngoại');
        }
        if (distS === 3) return tMale ? 'Cụ ông' : 'Cụ bà';
        if (distS === 4) return tMale ? 'Kỵ ông' : 'Kỵ bà';
        return `Tổ tiên đời thứ ${distS}`;
    }

    if (distS === 0) {
        if (distT === 1) return tMale ? 'Con trai' : 'Con gái';
        if (distT === 2) {
            const child = personsMap.get(pathT[1]);
            const isNoi = child?.gender === 'male';
            return isNoi ? (tMale ? 'Cháu nội (trai)' : 'Cháu nội (gái)') : (tMale ? 'Cháu ngoại (trai)' : 'Cháu ngoại (gái)');
        }
        if (distT === 3) return tMale ? 'Chắt (trai)' : 'Chắt (gái)';
        if (distT === 4) return tMale ? 'Chút (trai)' : 'Chút (gái)';
        return `Hậu duệ đời thứ ${distT}`;
    }

    if (distS === 1 && distT === 1) {
        const orderS = personsMap.get(pathS[0])?.birth_order ?? personsMap.get(pathS[0])?.birth_year ?? Infinity;
        const orderT = personsMap.get(pathT[0])?.birth_order ?? personsMap.get(pathT[0])?.birth_year ?? Infinity;
        const senior = orderT < orderS;
        
        const parentsS = parentsMap.get(pathS[0]) || [];
        const parentsT = parentsMap.get(pathT[0]) || [];
        const sharedParents = parentsS.filter(p => parentsT.includes(p));
        
        let suffix = "";
        if (sharedParents.length === 1 && parentsS.length > 0 && parentsT.length > 0) {
            const sharedGender = personsMap.get(sharedParents[0])?.gender;
            suffix = sharedGender === 'male' ? " (cùng cha khác mẹ)" : " (cùng mẹ khác cha)";
        }
        
        const baseTerm = senior ? (tMale ? 'Anh' : 'Chị') : (tMale ? 'Em trai' : 'Em gái');
        return baseTerm + suffix;
    }

    if (distS === 2 && distT === 1) {
        const parent = personsMap.get(pathS[1]);
        const orderS = parent?.birth_order ?? parent?.birth_year ?? Infinity;
        const orderT = personsMap.get(pathT[0])?.birth_order ?? personsMap.get(pathT[0])?.birth_year ?? Infinity;
        const senior = orderT < orderS;
        
        if (parent?.gender === 'male') {
            if (senior) return tMale ? 'Bác trai' : 'Bác gái';
            return tMale ? 'Chú' : 'Cô';
        } else {
            return tMale ? 'Cậu' : (senior ? 'Dì lớn' : 'Dì');
        }
    }

    if (distS === 1 && distT === 2) {
        return tMale ? 'Cháu trai' : 'Cháu gái';
    }

    if (distS === 2 && distT === 2) {
        const parentS = personsMap.get(pathS[1]);
        const parentT = personsMap.get(pathT[1]);
        const orderS = parentS?.birth_order ?? parentS?.birth_year ?? Infinity;
        const orderT = parentT?.birth_order ?? parentT?.birth_year ?? Infinity;
        const senior = orderT < orderS;
        return senior ? (tMale ? 'Anh họ' : 'Chị họ') : (tMale ? 'Em họ (trai)' : 'Em họ (gái)');
    }

    return `Họ hàng (cách ${distS} bậc trên, ${distT} bậc dưới)`;
  }

  // BƯỚC 2: Chuyển đổi danh xưng nếu Target là Vợ/Chồng của người có cùng Huyết Thống
  static applySpouseToTarget(bloodTerm: string): string {
    const t = bloodTerm.toLowerCase().replace(' (cùng cha khác mẹ)', '').replace(' (cùng mẹ khác cha)', '');
    
    const map: Record<string, string> = {
        'cha': 'vợ của cha', 'bố': 'vợ của bố',
        'mẹ': 'chồng của mẹ',
        'anh': 'chị dâu',
        'chị': 'anh rể',
        'em trai': 'em dâu',
        'em gái': 'em rể',
        
        'bác trai': 'bác gái (vợ bác)',
        'chú': 'thím',
        'cậu': 'mợ',
        
        'bác gái': 'bác trai (dượng)',
        'cô': 'dượng (chồng cô)',
        'dì': 'dượng (chồng dì)', 'dì lớn': 'dượng (chồng dì)',

        'anh họ': 'chị dâu họ',
        'chị họ': 'anh rể họ',
        'em họ (trai)': 'em dâu họ',
        'em họ (gái)': 'em rể họ',
        
        'con trai': 'con dâu',
        'con gái': 'con rể',
        
        'cháu trai': 'cháu dâu',
        'cháu nội (trai)': 'cháu dâu', 'cháu ngoại (trai)': 'cháu dâu',
        'cháu gái': 'cháu rể',
        'cháu nội (gái)': 'cháu rể', 'cháu ngoại (gái)': 'cháu rể',
        
        'chắt (trai)': 'chắt dâu',
        'chắt (gái)': 'chắt rể',

        'ông nội': 'vợ của ông nội', 'ông ngoại': 'vợ của ông ngoại',
        'bà nội': 'chồng của bà nội', 'bà ngoại': 'chồng của bà ngoại'
    };

    if (map[t]) return map[t];
    return `${bloodTerm} (thông gia)`;
  }

  // BƯỚC 3: Dịch danh xưng nếu bản thân (Source) là Vợ/Chồng gọi thay bạn đời
  static applySpouseToSource(targetTerm: string, sourceGender: string): string {
    const ben = sourceGender === 'male' ? 'vợ' : 'chồng';
    const t = targetTerm.toLowerCase();
    
    if (t === 'cha' || t === 'bố') return `Bố ${ben}`;
    if (t === 'mẹ') return `Mẹ ${ben}`;
    if (t === 'anh') return `Anh ${ben}`;
    if (t === 'chị') return `Chị ${ben}`;
    if (t === 'em trai') return `Em ${ben} (trai)`;
    if (t === 'em gái') return `Em ${ben} (gái)`;
    
    if (t.includes('bên vợ') || t.includes('bên chồng')) return targetTerm;
    if (t.includes('thông gia')) return targetTerm;
    
    return `${targetTerm} (bên ${ben})`;
  }

  static inferExactKinship(
      sourceId: string, targetId: string, 
      personsMap: Map<string, PersonRecord>, 
      parentsMap: Map<string, string[]>, 
      spousesMap: Map<string, string[]>,
      ancestorsCache: Map<string, Map<string, string[]>>
  ): { term: string, pathRaw: string } {
    
    if (sourceId === targetId) return { term: "Chính là một người", pathRaw: "" };

    const source = personsMap.get(sourceId);
    const target = personsMap.get(targetId);
    if (!source || !target) return { term: "Có họ hàng", pathRaw: "" };

    // Bắt thẳng trường hợp 2 người trực tiếp là Vợ - Chồng
    if (spousesMap.get(sourceId)?.includes(targetId)) {
        return { term: target.gender === 'male' ? 'Chồng' : 'Vợ', pathRaw: `${source.full_name || sourceId} -> ${target.full_name || targetId}` };
    }

    const sProxies = [sourceId, ...(spousesMap.get(sourceId) || [])];
    const tProxies = [targetId, ...(spousesMap.get(targetId) || [])];

    let candidateMatches: any[] = [];
    let minCombinedDist = Infinity;

    for (const sp of sProxies) {
        for (const tp of tProxies) {
            const sAncestors = ancestorsCache.get(sp) || this.getAncestorsMap(sp, parentsMap);
            const tAncestors = ancestorsCache.get(tp) || this.getAncestorsMap(tp, parentsMap);

            for (const [ancId, pathS] of sAncestors.entries()) {
                if (tAncestors.has(ancId)) {
                    const pathT = tAncestors.get(ancId)!;
                    const distS = pathS.length - 1;
                    const distT = pathT.length - 1;
                    
                    let penalty = 0;
                    if (sp !== sourceId) penalty += 0.1;
                    if (tp !== targetId) penalty += 0.1;
                    
                    const totalDist = distS + distT + penalty;

                    if (totalDist < minCombinedDist) {
                        minCombinedDist = totalDist;
                        candidateMatches = [{ lca: ancId, pathS, pathT, distS, distT, sp, tp }];
                    } else if (totalDist === minCombinedDist) {
                        candidateMatches.push({ lca: ancId, pathS, pathT, distS, distT, sp, tp });
                    }
                }
            }
        }
    }

    if (candidateMatches.length === 0) return { term: "Không tìm thấy đường huyết thống kết nối trực tiếp.", pathRaw: "" };

    candidateMatches.sort((a, b) => {
        const genderA = personsMap.get(a.lca)?.gender === 'male' ? -1 : 1;
        const genderB = personsMap.get(b.lca)?.gender === 'male' ? -1 : 1;
        return genderA - genderB;
    });

    const { pathS, pathT, sp, tp } = candidateMatches[0];
    const sourceIsSpouse = sp !== sourceId;
    const targetIsSpouse = tp !== targetId;

    // PIPELINE THỰC THI 3 BƯỚC:
    
    // Bước 1: Tìm danh xưng huyết thống giữa 2 điểm Neo Huyết Thống (sp và tp)
    let term = this.getBloodTerm(sp, tp, pathS, pathT, personsMap, parentsMap);

    // Bước 2: Chuyển sang thông gia nếu Target là vợ/chồng của tp
    if (targetIsSpouse) {
        term = this.applySpouseToTarget(term);
    }

    // Bước 3: Dịch ngôi xưng nếu Source là vợ/chồng của sp
    if (sourceIsSpouse) {
        term = this.applySpouseToSource(term, source.gender || '');
    }

    // Xây dựng đường dẫn hiển thị
    let displayPath = [];
    if (sourceIsSpouse && sourceId !== pathS[0]) displayPath.push(sourceId);
    displayPath = displayPath.concat(pathS);
    const downPath = pathT.slice(0, Math.max(0, pathT.length - 1)).reverse();
    displayPath = displayPath.concat(downPath);
    if (targetIsSpouse && targetId !== displayPath[displayPath.length - 1]) displayPath.push(targetId);

    displayPath = displayPath.filter((v, i, a) => i === 0 || v !== a[i - 1]);
    const pathRaw = displayPath.map(pid => personsMap.get(pid)?.full_name || pid).join(' -> ');

    return { term, pathRaw };
  }
}

// ============================================================================
// 4. DATA SERVICE (L1 & L2 CACHE MANAGER)
// ============================================================================
class FamilyTreeDataService {
  private static personsMap: Map<string, PersonRecord> = new Map();
  private static parentsMap: Map<string, string[]> = new Map();
  private static childrenMap: Map<string, string[]> = new Map();
  private static spousesMap: Map<string, string[]> = new Map();
  private static adoptiveParentsMap: Map<string, string[]> = new Map();
  private static ancestorsCache: Map<string, Map<string, string[]>> = new Map();
  
  private static nameIndex: Map<string, string[]> = new Map(); 
  private static sortedNameKeys: string[] = []; 
  private static maxGram: number = 1; 
  
  private static isLoaded = false;
  private static CACHE_KEY = 'family_tree_v13_kinship';
  private static loadPromise: Promise<void> | null = null; 

  private static buildAncestorsCache() {
    this.ancestorsCache.clear();
    for (const pId of this.personsMap.keys()) {
      const map = new Map<string, string[]>();
      const queue: { id: string, path: string[] }[] = [{ id: pId, path: [pId] }];
      while(queue.length > 0) {
          const {id, path} = queue.shift()!;
          if (!map.has(id)) {
              map.set(id, path);
              const parents = this.parentsMap.get(id) || [];
              for(const pid of parents) {
                  if (!path.includes(pid)) {
                      queue.push({id: pid, path: [...path, pid]});
                  }
              }
          }
      }
      this.ancestorsCache.set(pId, map);
    }
  }

  static ensureLoaded(supabase: SupabaseClient, forceRefresh: boolean = false): Promise<void> {
    if (this.isLoaded && !forceRefresh) {
        return this.loadPromise || Promise.resolve();
    }
    
    if (this.loadPromise) {
        return this.loadPromise;
    }

    this.loadPromise = this._loadInternal(supabase, forceRefresh).finally(() => {
        this.loadPromise = null;
    });
    
    return this.loadPromise;
  }

  private static async _loadInternal(supabase: SupabaseClient, forceRefresh: boolean): Promise<void> {
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
                this.parentsMap = new Map(payload.parents);
                this.childrenMap = new Map(payload.children);
                this.spousesMap = new Map(payload.spouses);
                this.adoptiveParentsMap = new Map(payload.adoptiveParents || []);
                
                this.nameIndex = new Map(payload.nameIndex);
                this.sortedNameKeys = payload.sortedNameKeys;
                this.maxGram = payload.maxGram || 5;
                
                this.buildAncestorsCache();
                
                this.isLoaded = true;
                return;
            } catch (err) {
                console.error("Cache hỏng, tiến hành nạp lại toàn bộ...");
            }
        }
    }

    this.personsMap.clear();
    this.parentsMap.clear();
    this.childrenMap.clear();
    this.spousesMap.clear();
    this.adoptiveParentsMap.clear();
    this.ancestorsCache.clear();
    this.nameIndex.clear();
    this.sortedNameKeys = [];
    this.maxGram = 1;

    let allPersons: PersonRecord[] = [];
    let fromPerson = 0;
    const step = 1000;
    while (true) {
      const { data, error } = await supabase.from('persons')
        .select('id, full_name, other_names, gender, birth_year, birth_order, generation, is_in_law, death_year, note')
        .range(fromPerson, fromPerson + step - 1);
      if (error) throw new Error(`Lỗi tải persons: ${error.message}`);
      if (!data || data.length === 0) break;
      allPersons = allPersons.concat(data as PersonRecord[]);
      if (data.length < step) break;
      fromPerson += step;
    }

    let allRels: RelationshipRecord[] = [];
    let fromRel = 0;
    while (true) {
      const { data, error } = await supabase.from('relationships')
        .select('id, type, relationship_type, person_a, person_b, person_id, related_person_id')
        .range(fromRel, fromRel + step - 1);
      if (error) throw new Error(`Lỗi tải relationships: ${error.message}`);
      if (!data || data.length === 0) break;
      allRels = allRels.concat(data as RelationshipRecord[]);
      if (data.length < step) break;
      fromRel += step;
    }

    for (const p of allPersons) {
      const pId = String(p.id);
      this.personsMap.set(pId, p);
      this.parentsMap.set(pId, []);
      this.childrenMap.set(pId, []);
      this.spousesMap.set(pId, []);
      this.adoptiveParentsMap.set(pId, []);

      const namesToIndex = [];
      if (p.full_name) namesToIndex.push(UtilsService.removeAccents(p.full_name));
      if (p.other_names) namesToIndex.push(UtilsService.removeAccents(p.other_names));

      for (const normalized of namesToIndex) {
          if (!normalized) continue;
          const wordCount = normalized.split(/\s+/).length;
          if (wordCount > this.maxGram) this.maxGram = wordCount;

          if (!this.nameIndex.has(normalized)) {
            this.nameIndex.set(normalized, []);
            this.sortedNameKeys.push(normalized);
          }
          if (!this.nameIndex.get(normalized)!.includes(pId)) {
            this.nameIndex.get(normalized)!.push(pId);
          }
      }
    }
    this.sortedNameKeys.sort((a, b) => b.length - a.length);

    for (const r of allRels) {
      const type = String(r.type ?? r.relationship_type ?? '').toLowerCase().trim(); 
      const idA = String(r.person_a ?? r.person_id ?? ''); 
      const idB = String(r.person_b ?? r.related_person_id ?? ''); 

      if (!this.personsMap.has(idA) || !this.personsMap.has(idB)) continue;

      if (['biological_child', 'adopted_child', 'adopted', 'child'].includes(type)) {
        const isAdopted = type.includes('adopted');
        
        if (!isAdopted) {
            const parents = this.parentsMap.get(idB)!;
            if (parents.length < 2 && !parents.includes(idA)) parents.push(idA);
        } else {
            const adoptParents = this.adoptiveParentsMap.get(idB)!;
            if (!adoptParents.includes(idA)) adoptParents.push(idA);
        }
        
        const children = this.childrenMap.get(idA)!;
        if (!children.includes(idB)) children.push(idB);
      } 
      else if (type === 'marriage') {
        const spA = this.spousesMap.get(idA)!;
        if (!spA.includes(idB)) spA.push(idB);
        const spB = this.spousesMap.get(idB)!;
        if (!spB.includes(idA)) spB.push(idA);
      }
    }

    this.buildAncestorsCache();
    this.isLoaded = true;

    const payload = {
        persons: Array.from(this.personsMap.entries()),
        parents: Array.from(this.parentsMap.entries()),
        children: Array.from(this.childrenMap.entries()),
        spouses: Array.from(this.spousesMap.entries()),
        adoptiveParents: Array.from(this.adoptiveParentsMap.entries()),
        nameIndex: Array.from(this.nameIndex.entries()),
        sortedNameKeys: this.sortedNameKeys,
        maxGram: this.maxGram
    };
    
    const { error: upsertErr } = await supabase.from('api_cache').upsert({ 
        key: this.CACHE_KEY, 
        payload: payload, 
        updated_at: new Date().toISOString() 
    });

    if (upsertErr) {
        console.warn("Lỗi lưu cache vào Supabase:", upsertErr.message);
    }
  }

  static getPerson(id: string): PersonRecord | undefined { return this.personsMap.get(id); }
  static getFamily(id: string): FamilyMember[] {
    const family: FamilyMember[] = [];
    const p = this.personsMap.get(id);
    if (!p) return family;

    const parents = this.parentsMap.get(id) || [];
    parents.forEach(pid => {
        const parent = this.personsMap.get(pid);
        if (parent) family.push({ id: pid, name: parent.full_name || '', relationship_hint: parent.gender === 'male' ? 'Cha' : 'Mẹ' });
    });

    const adoptParents = this.adoptiveParentsMap.get(id) || [];
    adoptParents.forEach(pid => {
        const parent = this.personsMap.get(pid);
        if (parent) family.push({ id: pid, name: parent.full_name || '', relationship_hint: parent.gender === 'male' ? 'Cha nuôi' : 'Mẹ nuôi' });
    });

    const spouses = this.spousesMap.get(id) || [];
    spouses.forEach(sid => {
        const spouse = this.personsMap.get(sid);
        if (spouse) family.push({ id: sid, name: spouse.full_name || '', relationship_hint: spouse.gender === 'male' ? 'Chồng' : 'Vợ' });
    });

    const children = this.childrenMap.get(id) || [];
    children.forEach(cid => {
        const child = this.personsMap.get(cid);
        if (child) family.push({ id: cid, name: child.full_name || '', relationship_hint: child.gender === 'male' ? 'Con trai' : 'Con gái' });
    });

    return family;
  }
  static getTotalMembers(): number { return this.personsMap.size; }
  static getPersonsMap(): Map<string, PersonRecord> { return this.personsMap; }
  static getParentsMap(): Map<string, string[]> { return this.parentsMap; }
  static getSpousesMap(): Map<string, string[]> { return this.spousesMap; }
  static getAncestorsCache(): Map<string, Map<string, string[]>> { return this.ancestorsCache; }

  static extractMatchedEntities(text: string): MatchedEntity[] {
    const normalizedText = UtilsService.removeAccents(text);
    const matched: MatchedEntity[] = [];
    const words = normalizedText.split(/\s+/);
    const usedIndexes = new Set<number>();

    for (let len = this.maxGram; len >= 1; len--) {
        for (let i = 0; i <= words.length - len; i++) {
            let overlap = false;
            for (let j = 0; j < len; j++) {
                if (usedIndexes.has(i + j)) overlap = true;
            }
            if (overlap) continue;

            const phrase = words.slice(i, i + len).join(' ');
            if (this.nameIndex.has(phrase)) {
                matched.push({ normalized: phrase, ids: this.nameIndex.get(phrase)! });
                for (let j = 0; j < len; j++) usedIndexes.add(i + j);
            }
        }
    }
    return matched;
  }

  static searchByQuery(query: string): MatchedEntity[] {
    const qNorm = UtilsService.removeAccents(query);
    if (!qNorm || qNorm.length < 2) return [];
    
    const matchedIds = new Set<string>();
    const queryWords = qNorm.split(/\s+/);

    // 1. Tận dụng nameIndex để tìm khớp toàn bộ chuỗi
    if (this.nameIndex.has(qNorm)) {
        this.nameIndex.get(qNorm)!.forEach(id => matchedIds.add(id));
    }

    // 2. Tìm kiếm chứa chuỗi hoặc khớp First Name
    for (const nameKey of this.sortedNameKeys) {
        if (nameKey.includes(qNorm)) {
            this.nameIndex.get(nameKey)!.forEach(id => matchedIds.add(id));
        } else {
            const nameWords = nameKey.split(/\s+/);
            if (nameWords.length > 0) {
                const firstName = nameWords[nameWords.length - 1];
                if (queryWords.includes(firstName)) {
                    this.nameIndex.get(nameKey)!.forEach(id => matchedIds.add(id));
                }
            }
        }
    }

    if (matchedIds.size > 0) {
        return [{ normalized: qNorm, ids: Array.from(matchedIds) }];
    }
    
    return [];
  }
}

// ============================================================================
// 5. LLM SERVICE (TÍCH HỢP FUNCTION CALLING)
// ============================================================================
class LLMService {
  static TOOLS = [
    {
      type: "function",
      function: {
        name: "search_member",
        description: "Tìm kiếm thông tin tiểu sử, lý lịch và gia đình của một hoặc nhiều người trong gia phả bằng tên của họ. Sử dụng khi người dùng hỏi về thông tin của ai đó (ví dụ: 'ai là trung', 'trung có con không').",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Tên của người cần tìm kiếm (VD: 'Trung', 'Nguyễn Thiệu Trung')"
            }
          },
          required: ["name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "find_relationship",
        description: "Kiểm tra mối quan hệ họ hàng giữa hai người trong gia phả. Sử dụng khi người dùng hỏi quan hệ giữa người A và người B.",
        parameters: {
          type: "object",
          properties: {
            name1: { type: "string", description: "Tên người thứ nhất" },
            name2: { type: "string", description: "Tên người thứ hai" }
          },
          required: ["name1", "name2"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "count_members",
        description: "Đếm tổng số thành viên hiện có trong toàn bộ dòng họ/gia phả.",
        parameters: {
          type: "object",
          properties: {},
          required: []
        }
      }
    }
  ];

  static async generateWithTools(apiKey: string, systemPrompt: string, userMessage: string): Promise<any> {
    let messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    let toolRounds = 0;
    const MAX_TOOL_ROUNDS = 2; // Cho phép tối đa 2 vòng gọi công cụ

    while (toolRounds < MAX_TOOL_ROUNDS) {
      let response = await fetch(DEEPSEEK_API_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: messages,
          tools: this.TOOLS,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`LLM Error at tool round ${toolRounds + 1}: ${err.error?.message || response.statusText}`);
      }

      let data = await response.json();
      let responseMessage = data.choices?.[0]?.message;

      // Nếu LLM KHÔNG gọi tool nào, hoặc chỉ sinh ra text, trả về câu trả lời luôn
      if (!responseMessage?.tool_calls || responseMessage.tool_calls.length === 0) {
        return responseMessage?.content || "Không đủ thông tin để kết luận.";
      }

      // Có gọi tool, đưa tin nhắn của AI (chứa tool_calls) vào lịch sử
      messages.push(responseMessage);
      toolRounds++;

      // Duyệt qua từng công cụ AI muốn gọi
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        let args: any = {};
        let functionResult: any = {};

        try {
            args = JSON.parse(toolCall.function.arguments);
        } catch(e: any) {
            functionResult.error = `JSON Parse Error: ${e.message}. Vui lòng gọi lại với JSON arguments hợp lệ.`;
            messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(functionResult)
            });
            continue; // Bỏ qua việc thực thi hàm vì JSON lỗi
        }

        if (functionName === 'search_member') {
          const matches = FamilyTreeDataService.searchByQuery(args.name);
          if (matches.length > 0 && matches[0].ids.length > 0) {
            const ids = matches[0].ids;
            if (ids.length === 1) {
               functionResult.person = UtilsService.cleanPersonData(FamilyTreeDataService.getPerson(ids[0])!);
               functionResult.family = FamilyTreeDataService.getFamily(ids[0]);
            } else {
               functionResult.multiple_matches = ids.map(id => ({
                   person: UtilsService.cleanPersonData(FamilyTreeDataService.getPerson(id)!),
                   family: FamilyTreeDataService.getFamily(id)
               }));
            }
          } else {
            functionResult.error = `Không tìm thấy ai có tên "${args.name}" trong gia phả.`;
          }
        } 
        else if (functionName === 'find_relationship') {
          const m1 = FamilyTreeDataService.searchByQuery(args.name1);
          const m2 = FamilyTreeDataService.searchByQuery(args.name2);
          
          if (m1.length > 0 && m2.length > 0) {
              const ids1 = m1[0].ids;
              const ids2 = m2[0].ids;
              
              if (ids1.length > 1 || ids2.length > 1) {
                  functionResult.error = "Phát hiện trùng tên, không thể tự động xác định mối quan hệ.";
                  if (ids1.length > 1) {
                      functionResult.multiple_matches_name1 = ids1.map(id => ({
                          person: UtilsService.cleanPersonData(FamilyTreeDataService.getPerson(id)!),
                          family: FamilyTreeDataService.getFamily(id)
                      }));
                  }
                  if (ids2.length > 1) {
                      functionResult.multiple_matches_name2 = ids2.map(id => ({
                          person: UtilsService.cleanPersonData(FamilyTreeDataService.getPerson(id)!),
                          family: FamilyTreeDataService.getFamily(id)
                      }));
                  }
                  functionResult.instruction = "Hệ thống phát hiện có nhiều người trùng tên. Bạn HÃY DỪNG LẠI việc tìm kiếm, in ra danh sách những người trùng tên (bao gồm thế hệ, năm sinh, tên cha/mẹ) và LỊCH SỰ HỎI người dùng xem họ đang muốn nhắc đến ai để tiếp tục tra cứu.";
              } else {
                  const id1 = ids1[0];
                  const id2 = ids2[0];
                  const result = UtilsService.inferExactKinship(
                      id1, id2, 
                      FamilyTreeDataService.getPersonsMap(), 
                      FamilyTreeDataService.getParentsMap(), 
                      FamilyTreeDataService.getSpousesMap(), 
                      FamilyTreeDataService.getAncestorsCache()
                  );
                  functionResult.exact_relationship = result.term;
                  functionResult.path_raw = result.pathRaw;
              }
          } else {
              functionResult.error = `Không thể kiểm tra vì không tìm thấy đủ 2 người (Tên 1: ${args.name1}, Tên 2: ${args.name2}).`;
          }
        }
        else if (functionName === 'count_members') {
          functionResult.total_members = FamilyTreeDataService.getTotalMembers();
        }

        // Gửi kết quả Tool về lại cho LLM
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResult)
        });
      }
    }

    // Sau khi kết thúc số vòng tool (do quá trình tra cứu quá dài), buộc gọi request cuối cùng KHÔNG có parameters "tools"
    let finalResponse = await fetch(DEEPSEEK_API_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: messages,
        temperature: 0.1,
        // Không gửi tools để chặn việc tiếp tục gọi tool
      }),
    });

    if (!finalResponse.ok) {
        const err = await finalResponse.json().catch(() => ({}));
        throw new Error(`LLM Error at final answering round: ${err.error?.message || finalResponse.statusText}`);
    }

    let finalData = await finalResponse.json();
    return finalData.choices?.[0]?.message?.content || "Hệ thống không đủ thông tin để kết luận.";
  }
}

// ============================================================================
// 6. BỘ ĐIỀU KHIỂN CHÍNH (API ROUTE POST)
// ============================================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const isWebhookRefresh = body.action === 'refresh_cache';
    const message = body.message || '';
    
    const deepseekApiKey = (process.env.DEEPSEEK_API_KEY || '').trim();
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    const envWebhookSecret = (process.env.WEBHOOK_SECRET || '').trim();

    if (!deepseekApiKey || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ reply: 'Lỗi cấu hình: Thiếu biến môi trường API Key hoặc Supabase.' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Xác thực Webhook
    if (isWebhookRefresh) {
        const authHeader = req.headers.get('authorization') || req.headers.get('x-webhook-secret') || '';
        const token = authHeader.replace('Bearer ', '').trim();
        
        if (!envWebhookSecret || token !== envWebhookSecret) {
            return NextResponse.json({ reply: 'Unauthorized: Sai mã bí mật webhook.' }, { status: 401 });
        }
        await FamilyTreeDataService.ensureLoaded(supabase, true);
        return NextResponse.json({ reply: 'Cache đã được làm mới thành công từ Database!' });
    }

    if (!message) return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });

    // Đảm bảo dữ liệu gia phả đã tải lên cache
    await FamilyTreeDataService.ensureLoaded(supabase, false);

    // Giao toàn quyền cho AI xử lý Tool Calling
    const finalReply = await LLMService.generateWithTools(deepseekApiKey, SYSTEM_PROMPT_NLG, message);
    
    return NextResponse.json({ reply: finalReply });

  } catch (error: any) {
    console.error('Family Tree API Error:', error);
    return NextResponse.json({ reply: `Hệ thống gián đoạn: ${error.message}` }, { status: 500 });
  }
}
