import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEEPSEEK_API_ENDPOINT = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';

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
// 2. KINSHIP DICTIONARY & MAPPING (BẢNG ÁNH XẠ DANH XƯNG)
// ============================================================================
const ViDict: Record<string, string> = {
    'SELF': 'Bản thân', 'HUSBAND': 'Chồng', 'WIFE': 'Vợ',
    'SON': 'Con trai', 'DAUGHTER': 'Con gái',
    'SON_IN_LAW': 'Con rể', 'DAUGHTER_IN_LAW': 'Con dâu',
    'GRANDSON': 'Cháu trai', 'GRANDDAUGHTER': 'Cháu gái',
    'GRANDSON_IN_LAW': 'Cháu rể', 'GRANDDAUGHTER_IN_LAW': 'Cháu dâu',
    'GREAT_GRANDSON': 'Chắt', 'GREAT_GRANDSON_IN_LAW': 'Chắt rể', 'GREAT_GRANDDAUGHTER_IN_LAW': 'Chắt dâu',
    'FATHER': 'Cha / Bố', 'MOTHER': 'Mẹ',
    'STEP_FATHER': 'Dượng / Cha dượng', 'STEP_MOTHER': 'Mẹ kế / Dì ghẻ',
    'GRANDFATHER_PAT': 'Ông nội', 'GRANDMOTHER_PAT': 'Bà nội',
    'GRANDFATHER_MAT': 'Ông ngoại', 'GRANDMOTHER_MAT': 'Bà ngoại',
    'GREAT_GRANDFATHER': 'Cụ ông', 'GREAT_GRANDMOTHER': 'Cụ bà',
    'OLDER_BROTHER': 'Anh', 'OLDER_SISTER': 'Chị',
    'YOUNGER_BROTHER': 'Em trai', 'YOUNGER_SISTER': 'Em gái',
    'OLDER_SISTER_IN_LAW': 'Chị dâu', 'OLDER_BROTHER_IN_LAW': 'Anh rể',
    'YOUNGER_SISTER_IN_LAW': 'Em dâu', 'YOUNGER_BROTHER_IN_LAW': 'Em rể',
    'UNCLE_PAT_OLDER': 'Bác (trai)', 'AUNT_PAT_OLDER': 'Bác (gái)',
    'UNCLE_PAT_YOUNGER': 'Chú', 'AUNT_PAT_YOUNGER': 'Cô',
    'UNCLE_MAT': 'Cậu', 'AUNT_MAT_OLDER': 'Dì (lớn)', 'AUNT_MAT_YOUNGER': 'Dì (nhỏ)',
    'AUNT_PAT_OLDER_IN_LAW': 'Bác gái (vợ bác)', 'UNCLE_PAT_OLDER_IN_LAW': 'Bác trai (dượng)',
    'AUNT_PAT_YOUNGER_IN_LAW': 'Thím (vợ chú)', 'UNCLE_PAT_YOUNGER_IN_LAW': 'Dượng (chồng cô)',
    'AUNT_MAT_IN_LAW': 'Mợ (vợ cậu)', 'UNCLE_MAT_IN_LAW': 'Dượng (chồng dì)',
    'NEPHEW': 'Cháu trai', 'NIECE': 'Cháu gái',
    'NEPHEW_IN_LAW': 'Cháu rể', 'NIECE_IN_LAW': 'Cháu dâu',
    'GRANDFATHER_DISTANT': 'Ông', 'GRANDMOTHER_DISTANT': 'Bà',
    'RELATIVE': 'Họ hàng'
};

const TargetSpouseMap: Record<string, string> = {
    'SON': 'DAUGHTER_IN_LAW', 'DAUGHTER': 'SON_IN_LAW',
    'GRANDSON': 'GRANDDAUGHTER_IN_LAW', 'GRANDDAUGHTER': 'GRANDSON_IN_LAW',
    'GREAT_GRANDSON': 'GREAT_GRANDDAUGHTER_IN_LAW',
    'FATHER': 'STEP_MOTHER', 'MOTHER': 'STEP_FATHER',
    'OLDER_BROTHER': 'OLDER_SISTER_IN_LAW', 'OLDER_SISTER': 'OLDER_BROTHER_IN_LAW',
    'YOUNGER_BROTHER': 'YOUNGER_SISTER_IN_LAW', 'YOUNGER_SISTER': 'YOUNGER_BROTHER_IN_LAW',
    'UNCLE_PAT_OLDER': 'AUNT_PAT_OLDER_IN_LAW', 'AUNT_PAT_OLDER': 'UNCLE_PAT_OLDER_IN_LAW',
    'UNCLE_PAT_YOUNGER': 'AUNT_PAT_YOUNGER_IN_LAW', 'AUNT_PAT_YOUNGER': 'UNCLE_PAT_YOUNGER_IN_LAW',
    'UNCLE_MAT': 'AUNT_MAT_IN_LAW', 'AUNT_MAT_OLDER': 'UNCLE_MAT_IN_LAW', 'AUNT_MAT_YOUNGER': 'UNCLE_MAT_IN_LAW',
    'NEPHEW': 'NIECE_IN_LAW', 'NIECE': 'NEPHEW_IN_LAW'
};

// ============================================================================
// 3. UTILS & KINSHIP ENGINE 
// ============================================================================
class UtilsService {
  static removeAccents(str: string): string {
    if (!str) return '';
    return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
  }

  static parseLLMJson(rawText: string): IntentJSON {
    try {
      const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const start = cleanedText.indexOf('{');
      const end = cleanedText.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        return JSON.parse(cleanedText.substring(start, end + 1)) as IntentJSON;
      }
      return { intent: 'general', name1: '', name2: '' };
    } catch (error) {
      return { intent: 'general', name1: '', name2: '' };
    }
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
                if (!path.includes(pid)) { // NGĂN CHẶN INFINITE LOOP
                    queue.push({id: pid, path: [...path, pid]});
                }
            }
        }
    }
    return ancestors;
  }

  static getBaseBloodCode(distS: number, distT: number, paternal: boolean, senior: boolean, tMale: boolean): string {
      if (distS === 0 && distT === 0) return 'SELF';
      if (distS === 0 && distT === 1) return tMale ? 'SON' : 'DAUGHTER';
      if (distS === 0 && distT === 2) return tMale ? 'GRANDSON' : 'GRANDDAUGHTER';
      if (distS === 0 && distT === 3) return 'GREAT_GRANDSON';
      
      if (distT === 0 && distS === 1) return tMale ? 'FATHER' : 'MOTHER';
      if (distT === 0 && distS === 2) return paternal ? (tMale ? 'GRANDFATHER_PAT' : 'GRANDMOTHER_PAT') : (tMale ? 'GRANDFATHER_MAT' : 'GRANDMOTHER_MAT');
      if (distT === 0 && distS === 3) return tMale ? 'GREAT_GRANDFATHER' : 'GREAT_GRANDMOTHER';
      
      if (distS === distT) { 
          if (senior) return tMale ? 'OLDER_BROTHER' : 'OLDER_SISTER';
          return tMale ? 'YOUNGER_BROTHER' : 'YOUNGER_SISTER';
      }
      
      if (distS - distT === 1) { 
          if (paternal) {
              if (senior) return tMale ? 'UNCLE_PAT_OLDER' : 'AUNT_PAT_OLDER';
              return tMale ? 'UNCLE_PAT_YOUNGER' : 'AUNT_PAT_YOUNGER';
          } else {
              if (tMale) return 'UNCLE_MAT';
              return senior ? 'AUNT_MAT_OLDER' : 'AUNT_MAT_YOUNGER';
          }
      }
      
      if (distT - distS === 1) return tMale ? 'NEPHEW' : 'NIECE';
      if (distS - distT === 2) return tMale ? 'GRANDFATHER_DISTANT' : 'GRANDMOTHER_DISTANT';
      
      return 'RELATIVE';
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

    // Ưu tiên LCA là Nam để đảm bảo tính ổn định Nội/Ngoại
    candidateMatches.sort((a, b) => {
        const genderA = personsMap.get(a.lca)?.gender === 'male' ? -1 : 1;
        const genderB = personsMap.get(b.lca)?.gender === 'male' ? -1 : 1;
        return genderA - genderB;
    });

    const { lca, pathS, pathT, distS, distT, sp, tp } = candidateMatches[0];
    const sourceIsSpouse = sp !== sourceId;
    const targetIsSpouse = tp !== targetId;
    const p_tMale = personsMap.get(tp)?.gender === 'male'; 

    let isPaternal = true;
    if (distS >= 1) {
        const firstParent = personsMap.get(pathS[1]); 
        if (firstParent?.gender === 'female') isPaternal = false;
    }

    let isSenior = false; 
    if (distS >= 1 && distT >= 1) {
        const branchS = personsMap.get(pathS[distS - 1]);
        const branchT = personsMap.get(pathT[distT - 1]);
        const orderS = branchS?.birth_order ?? branchS?.birth_year ?? Infinity;
        const orderT = branchT?.birth_order ?? branchT?.birth_year ?? Infinity;
        isSenior = orderT < orderS; 
    }

    // 1. LẤY MÃ HUYẾT THỐNG
    let bloodCode = this.getBaseBloodCode(distS, distT, isPaternal, isSenior, p_tMale);

    // 2. PHÉP CHIẾU THÔNG GIA (VỢ/CHỒNG CỦA TARGET)
    if (targetIsSpouse) {
        if (distS === 0 && distT === 0) bloodCode = p_tMale ? 'WIFE' : 'HUSBAND';
        else bloodCode = TargetSpouseMap[bloodCode] || bloodCode;
    }

    // 3. XỬ LÝ NỬA DÒNG MÁU VÀ HỌ HÀNG
    let resultTerm = ViDict[bloodCode] || `Họ hàng (cách ${distS} bậc trên, ${distT} bậc dưới)`;
    const isCousin = (distS > 1 && distT >= 1) || (distS >= 1 && distT > 1);

    if (distS === 1 && distT === 1 && !sourceIsSpouse && !targetIsSpouse) {
        const parentsS = parentsMap.get(sp) || [];
        const parentsT = parentsMap.get(tp) || [];
        const sharedParents = parentsS.filter(p => parentsT.includes(p));
        if (sharedParents.length === 1 && parentsS.length > 0 && parentsT.length > 0) {
            const sharedGender = personsMap.get(sharedParents[0])?.gender;
            resultTerm += sharedGender === 'male' ? " (cùng cha khác mẹ)" : " (cùng mẹ khác cha)";
        }
    } else if (isCousin) {
        if (['Anh', 'Chị', 'Em trai', 'Em gái', 'Bác (trai)', 'Bác (gái)', 'Chú', 'Cô', 'Cậu', 'Dì (lớn)', 'Dì (nhỏ)', 'Cháu trai', 'Cháu gái', 'Ông', 'Bà', 'Chị dâu', 'Anh rể', 'Em dâu', 'Em rể', 'Cháu rể', 'Cháu dâu'].includes(resultTerm)) {
            resultTerm += " họ";
        } else if (['Bác gái (vợ bác)', 'Thím (vợ chú)', 'Mợ (vợ cậu)', 'Dượng (chồng cô)', 'Dượng (chồng dì)'].includes(resultTerm)) {
            resultTerm = resultTerm.replace(' (', ' họ (');
        }
    }

    // 4. PHÉP CHIẾU THÔNG GIA DÀNH CHO SOURCE
    if (sourceIsSpouse) {
        const spGender = source.gender === 'male' ? "vợ" : "chồng";
        const tt = resultTerm.toLowerCase();
        
        if (tt.includes("cha") || tt === "bố") resultTerm = `Bố ${spGender}`;
        else if (tt.includes("mẹ")) resultTerm = `Mẹ ${spGender}`;
        else if (tt.includes("anh")) resultTerm = `Anh ${spGender}`;
        else if (tt.includes("chị") && !tt.includes("dâu")) resultTerm = `Chị ${spGender}`;
        else if (tt.includes("em trai")) resultTerm = `Em trai ${spGender}`;
        else if (tt.includes("em gái")) resultTerm = `Em gái ${spGender}`;
        else if (tt.includes("ông nội") || tt.includes("ông ngoại") || tt.includes("bà nội") || tt.includes("bà ngoại")) {
            resultTerm = `${resultTerm} (bên ${spGender})`;
        }
    }

    // 5. HIỂN THỊ PATH
    let displayPath = [];
    if (sourceIsSpouse) displayPath.push(sourceId);
    displayPath = displayPath.concat(pathS);
    const downPath = pathT.slice(0, pathT.length - 1).reverse();
    displayPath = displayPath.concat(downPath);
    if (targetIsSpouse) displayPath.push(targetId);

    const pathRaw = displayPath.map(pid => personsMap.get(pid)?.full_name || pid).join(' -> ');

    return { term: resultTerm, pathRaw };
  }
}

// ============================================================================
// 4. DATA SERVICE 
// ============================================================================
class FamilyTreeDataService {
  private static personsMap: Map<string, PersonRecord> = new Map();
  private static parentsMap: Map<string, string[]> = new Map();
  private static childrenMap: Map<string, string[]> = new Map();
  private static spousesMap: Map<string, string[]> = new Map();
  private static ancestorsCache: Map<string, Map<string, string[]>> = new Map();
  
  private static nameIndex: Map<string, string[]> = new Map(); 
  private static sortedNameKeys: string[] = []; 
  private static maxGram: number = 1; 
  
  private static isLoaded = false;
  private static CACHE_KEY = 'family_tree_v13_kinship';

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
                this.parentsMap = new Map(payload.parents);
                this.childrenMap = new Map(payload.children);
                this.spousesMap = new Map(payload.spouses);
                
                const rawAncestors = payload.ancestors || [];
                this.ancestorsCache = new Map();
                for (const [id, rawMap] of rawAncestors) {
                    this.ancestorsCache.set(id, new Map(rawMap));
                }

                this.nameIndex = new Map(payload.nameIndex);
                this.sortedNameKeys = payload.sortedNameKeys;
                this.maxGram = payload.maxGram || 5;
                
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
    this.ancestorsCache.clear();
    this.nameIndex.clear();
    this.sortedNameKeys = [];
    this.maxGram = 1;

    let allPersons: PersonRecord[] = [];
    let from = 0;
    const step = 1000;
    while (true) {
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
      this.parentsMap.set(pId, []);
      this.childrenMap.set(pId, []);
      this.spousesMap.set(pId, []);

      const rawName = p.full_name || p.other_names;
      if (typeof rawName === 'string') {
        const normalized = UtilsService.removeAccents(rawName);
        const wordCount = normalized.split(/\s+/).length;
        if (wordCount > this.maxGram) this.maxGram = wordCount;

        if (!this.nameIndex.has(normalized)) {
          this.nameIndex.set(normalized, []);
          this.sortedNameKeys.push(normalized);
        }
        this.nameIndex.get(normalized)!.push(pId);
      }
    }
    this.sortedNameKeys.sort((a, b) => b.length - a.length);

    for (const r of allRels) {
      const type = String(r.type || r.relationship_type || '').toLowerCase().trim(); 
      const idA = String(r.person_a || r.person_id); 
      const idB = String(r.person_b || r.related_person_id); 

      if (!this.personsMap.has(idA) || !this.personsMap.has(idB)) continue;

      if (type === 'biological_child' || type === 'adopted_child') {
        const parents = this.parentsMap.get(idB)!;
        if (parents.length < 2 && !parents.includes(idA)) parents.push(idA);
        
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

    // Build ancestorsCache with cycle detection
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

    this.isLoaded = true;

    const payload = {
        persons: Array.from(this.personsMap.entries()),
        parents: Array.from(this.parentsMap.entries()),
        children: Array.from(this.childrenMap.entries()),
        spouses: Array.from(this.spousesMap.entries()),
        ancestors: Array.from(this.ancestorsCache.entries()).map(([id, map]) => [id, Array.from(map.entries())]),
        nameIndex: Array.from(this.nameIndex.entries()),
        sortedNameKeys: this.sortedNameKeys,
        maxGram: this.maxGram
    };
    
    await supabase.from('api_cache').upsert({ 
        key: this.CACHE_KEY, 
        payload: payload, 
        updated_at: new Date().toISOString() 
    });
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

  static searchFallbackEntity(fallbackName: string): MatchedEntity | null {
    const fbNorm = UtilsService.removeAccents(fallbackName);
    if (fbNorm.length < 2) return null;
    
    const foundKeys = this.sortedNameKeys.filter(k => k.includes(fbNorm));
    if (foundKeys.length > 0) {
        const bestMatch = foundKeys.find(k => k === fbNorm) || foundKeys[0];
        return { normalized: bestMatch, ids: this.nameIndex.get(bestMatch)! };
    }
    return null;
  }
}

// ============================================================================
// 5. LLM SERVICE 
// ============================================================================
class LLMService {
  static async generate(apiKey: string, prompt: string, message: string, useJSON: boolean): Promise<any> {
    const response = await fetch(DEEPSEEK_API_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
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

    if (!deepseekApiKey || !supabaseUrl || !supabaseKey) {
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
    
    const intentText = await LLMService.generate(deepseekApiKey, intentPrompt, message, true);
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
      const foundEntity = FamilyTreeDataService.searchFallbackEntity(fallbackName);
      if (foundEntity) fallbackEntity = foundEntity;
    }

    const targetEntity = entity1 || fallbackEntity;

    if (parsedIntent.intent === 'count_members') {
      backendContext.total_members = FamilyTreeDataService.getTotalMembers();
    } 
    else if (parsedIntent.intent === 'find_relationship') {
      if (entity1 && entity2) {
        if (entity1.ids.length > 1 || entity2.ids.length > 1) {
            backendContext.error = `Hệ thống tìm thấy nhiều người trùng tên "${entity1.ids.length > 1 ? entity1.normalized : entity2.normalized}" trong gia phả. Vui lòng cung cấp thêm thông tin để tra cứu quan hệ chính xác.`;
        } else {
            const id1 = entity1.ids[0];
            const id2 = entity2.ids[0];

            const personsMap = FamilyTreeDataService.getPersonsMap();
            const parentsMap = FamilyTreeDataService.getParentsMap();
            const spousesMap = FamilyTreeDataService.getSpousesMap();
            const ancestorsCache = FamilyTreeDataService.getAncestorsCache();

            const result = UtilsService.inferExactKinship(id1, id2, personsMap, parentsMap, spousesMap, ancestorsCache);
            
            if (result.term.includes("Không tìm thấy")) {
                backendContext.error = result.term;
            } else {
                backendContext.exact_relationship = result.term;
                backendContext.path_raw = result.pathRaw;
            }
        }
      } else {
        backendContext.error = 'Cần cung cấp rõ tên 2 người có trong gia phả để kiểm tra quan hệ.';
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
    // BƯỚC 7: LLM NLG 
    // ------------------------------------------------------------------------
    const systemPromptNLG = `Bạn là trợ lý AI ưu tiên tuyệt đối tính CHÍNH XÁC và ĐÁNG TIN CẬY. Nguyên tắc bắt buộc: Chỉ cung cấp thông tin đã được kiểm chứng từ nguồn JSON CONTEXT bên dưới. Không suy đoán, không bịa đặt, không tạo thông tin khi dữ liệu không đủ. Nếu không có dữ liệu chắc chắn, hãy nói rõ “không đủ thông tin để kết luận”.

JSON CONTEXT:
${JSON.stringify(backendContext)}

HƯỚNG DẪN TRÌNH BÀY (BẮT BUỘC):
1. Nếu có "error", BẮT BUỘC trả lời Y HỆT câu báo lỗi.
2. Nếu có "note", hãy hiển thị nó như một cảnh báo/lưu ý.
3. Nếu JSON có mảng "multiple_matches" (Trùng tên), hãy trình bày danh sách LẦN LƯỢT TỪNG NGƯỜI. Bắt buộc chèn Link hồ sơ bên dưới mỗi người.
4. Nếu hỏi Quan hệ (find_relationship): Dùng trường "exact_relationship" để trả lời ngay lập tức (VD: "Người A gọi B là: Dượng"). 
5. Nếu tìm người: In ra Thông tin cá nhân và Quan hệ gia đình. Bắt buộc có link hồ sơ ở cuối mỗi người:
[Nhấn vào đây để xem chi tiết tiểu sử của {Tên}](/dashboard/members?memberModalId={id})
6. Không in các trường _debug hoặc JSON ra màn hình.
7. Xóa bỏ các menu tùy chọn số/dấu đầu dòng ở cuối câu trả lời.`;

    const finalReply = await LLMService.generate(deepseekApiKey, systemPromptNLG, message, false);
    return NextResponse.json({ reply: finalReply || 'Không đủ thông tin để kết luận.' });

  } catch (error: any) {
    console.error('Family Tree API Error:', error);
    return NextResponse.json({ reply: `Hệ thống gián đoạn: ${error.message}` }, { status: 500 });
  }
}
