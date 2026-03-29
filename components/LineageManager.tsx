"use client";

import { Person, Relationship } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Sparkles,
  User,
  ShieldAlert
} from "lucide-react";
import { useState } from "react";

interface LineageManagerProps {
  persons: Person[];
  relationships: Relationship[];
}

interface ComputedUpdate {
  id: string;
  full_name: string;
  old_generation: number | null;
  new_generation: number | null;
  old_birth_order: number | null;
  new_birth_order: number | null;
  changed: boolean;
}

// ─── THUẬT TOÁN TỐI ƯU & NỘI SUY ĐỜI CHUẨN XÁC ───────────────────────────────

function computeGenerations(persons: Person[], relationships: Relationship[]): Map<string, number> {
  const genMap = new Map<string, number>();
  const parentToChildren = new Map<string, string[]>();
  const childToParents = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();

  // 1. Quét dữ liệu từ bảng Quan hệ
  relationships.forEach(r => {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      if (!parentToChildren.has(r.person_a)) parentToChildren.set(r.person_a, []);
      parentToChildren.get(r.person_a)!.push(r.person_b);
      if (!childToParents.has(r.person_b)) childToParents.set(r.person_b, []);
      childToParents.get(r.person_b)!.push(r.person_a);
    } else if (r.type === "marriage") {
      if (!spouseMap.has(r.person_a)) spouseMap.set(r.person_a, []);
      spouseMap.get(r.person_a)!.push(r.person_b);
      if (!spouseMap.has(r.person_b)) spouseMap.set(r.person_b, []);
      spouseMap.get(r.person_b)!.push(r.person_a);
    }
  });

  // 1.5. DỰ PHÒNG: Quét trực tiếp từ cột cha/mẹ trong bảng Persons (nếu có)
  persons.forEach(p => {
    const pid = p.id;
    const pAny = p as any;
    const parents = [pAny.father_id, pAny.mother_id].filter(Boolean);
    
    parents.forEach(parentId => {
      if (!childToParents.get(pid)?.includes(parentId)) {
        if (!parentToChildren.has(parentId)) parentToChildren.set(parentId, []);
        parentToChildren.get(parentId)!.push(pid);
        if (!childToParents.has(pid)) childToParents.set(pid, []);
        childToParents.get(pid)!.push(parentId);
      }
    });
  });

  // 2. TÌM 1 CỤ TỔ DUY NHẤT (Người già nhất không có cha mẹ và không phải dâu/rể)
  let roots = persons.filter(p => !childToParents.has(p.id) && !p.is_in_law);
  if (roots.length === 0) roots = persons; // Đề phòng lỗi dữ liệu vòng lặp sạch

  roots.sort((a, b) => (a.birth_year || 9999) - (b.birth_year || 9999));
  const trueRoot = roots[0];

  const visited = new Set<string>();
  const queue: { id: string; gen: number }[] = [{ id: trueRoot.id, gen: 1 }];

  // 3. TÍNH TOÁN NHÁNH CHÍNH
  while (queue.length > 0) {
    const { id, gen } = queue.shift()!;
    if (visited.has(id)) {
      if (gen < (genMap.get(id) || 9999)) genMap.set(id, gen);
      else continue;
    }

    visited.add(id);
    genMap.set(id, gen);

    (parentToChildren.get(id) || []).forEach(cid => queue.push({ id: cid, gen: gen + 1 }));
    (spouseMap.get(id) || []).forEach(sid => queue.push({ id: sid, gen: gen }));
  }

  // 4. XỬ LÝ NHỮNG NGƯỜI BỊ ĐỨT NHÁNH (NỘI SUY THEO NĂM SINH)
  const rootYear = trueRoot.birth_year || 1900;
  const YEAR_PER_GEN = 25; // Khoảng cách trung bình 25 năm/đời

  // Tìm các "Rễ phụ" của các nhánh bị đứt
  persons.forEach(p => {
    if (!visited.has(p.id) && !childToParents.has(p.id) && !p.is_in_law) {
      // Ước lượng đời dựa trên năm sinh so với Cụ Tổ
      const estimatedGen = p.birth_year 
        ? Math.max(2, Math.round((p.birth_year - rootYear) / YEAR_PER_GEN) + 1) 
        : (p.generation || 2);

      const subQueue = [{ id: p.id, gen: estimatedGen }];
      while (subQueue.length > 0) {
        const { id, gen } = subQueue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        genMap.set(id, gen);

        (parentToChildren.get(id) || []).forEach(cid => subQueue.push({ id: cid, gen: gen + 1 }));
        (spouseMap.get(id) || []).forEach(sid => subQueue.push({ id: sid, gen: gen }));
      }
    }
  });

  // Vét lưới lần cuối cho dâu rể hoặc người mồ côi
  persons.forEach(p => {
    if (!visited.has(p.id)) {
      const estimatedGen = p.birth_year 
        ? Math.max(2, Math.round((p.birth_year - rootYear) / YEAR_PER_GEN) + 1) 
        : (p.generation || 2);
      genMap.set(p.id, estimatedGen);
    }
  });

  return genMap;
}

function computeBirthOrders(persons: Person[], relationships: Relationship[]): Map<string, number> {
  const parentChildren = new Map<string, string[]>();
  
  // Quét bảng quan hệ
  relationships.forEach(r => {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      if (!parentChildren.has(r.person_a)) parentChildren.set(r.person_a, []);
      parentChildren.get(r.person_a)!.push(r.person_b);
    }
  });

  // DỰ PHÒNG: Quét cột trực tiếp
  persons.forEach(p => {
    const pid = p.id;
    const pAny = p as any;
    const parents = [pAny.father_id, pAny.mother_id].filter(Boolean);
    parents.forEach(parentId => {
      if (!parentChildren.has(parentId)) parentChildren.set(parentId, []);
      if (!parentChildren.get(parentId)!.includes(pid)) {
        parentChildren.get(parentId)!.push(pid);
      }
    });
  });

  const personsById = new Map(persons.map(p => [p.id, p]));
  const orderMap = new Map<string, number>();

  parentChildren.forEach(childIds => {
    const sorted = childIds
      .map(id => personsById.get(id))
      .filter(p => p && !p.is_in_law)
      .sort((a, b) => {
        const yearA = a?.birth_year ?? 9999;
        const yearB = b?.birth_year ?? 9999;
        if (yearA !== yearB) return yearA - yearB;
        return (a?.full_name || "").localeCompare(b?.full_name || "", "vi");
      });
    sorted.forEach((p, index) => { if (p) orderMap.set(p.id, index + 1); });
  });

  return orderMap;
}

// ─── COMPONENT CHÍNH ─────────────────────────────────────────────────────────

export default function LineageManager({ persons, relationships }: LineageManagerProps) {
  const supabase = createClient();
  const [updates, setUpdates] = useState<ComputedUpdate[] | null>(null);
  const [computing, setComputing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const handleCompute = () => {
    setComputing(true);
    setApplied(false);
    setError(null);
    setUpdates(null);

    setTimeout(() => {
      try {
        const genMap = computeGenerations(persons, relationships);
        const orderMap = computeBirthOrders(persons, relationships);
        
        const result: ComputedUpdate[] = persons.map(p => {
          const newGen = genMap.get(p.id) || null;
          const newOrder = orderMap.get(p.id) || null;
          return {
            id: p.id,
            full_name: p.full_name,
            old_generation: p.generation,
            new_generation: newGen,
            old_birth_order: p.birth_order,
            new_birth_order: newOrder,
            changed: newGen !== p.generation || newOrder !== p.birth_order
          };
        });

        // Đưa người bị lệch lên trên
        result.sort((a, b) => {
          if (a.changed !== b.changed) return a.changed ? -1 : 1;
          return (a.new_generation || 0) - (b.new_generation || 0);
        });

        setUpdates(result);
      } catch (err: any) {
        setError(err.message || "Lỗi tính toán dữ liệu.");
      } finally {
        setComputing(false);
      }
    }, 150); // Timeout tạo cảm giác mượt mà cho UI
  };

  const handleApply = async () => {
    if (!updates) return;
    setApplying(true);
    const changedOnly = updates.filter(u => u.changed);
    try {
      for (let i = 0; i < changedOnly.length; i += 10) {
        const chunk = changedOnly.slice(i, i + 10);
        await Promise.all(chunk.map(u => 
          supabase.from("persons").update({
            generation: u.new_generation,
            birth_order: u.new_birth_order
          }).eq("id", u.id)
        ));
      }
      setApplied(true);
      setUpdates(null);
    } catch (err) {
      setError("Không thể lưu dữ liệu vào Supabase.");
    } finally {
      setApplying(false);
    }
  };

  const displayedRows = showAll ? (updates || []) : (updates || []).slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <button
          onClick={handleCompute}
          disabled={computing || applying}
          className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-2xl hover:bg-amber-700 disabled:opacity-50 font-bold shadow-lg shadow-amber-200 transition-all active:scale-95"
        >
          {computing ? <Loader2 className="animate-spin size-5" /> : <Sparkles className="size-5" />}
          {computing ? "Đang quét toàn bộ họ..." : "Tính toán lại đời & thứ tự sinh"}
        </button>

        {updates && updates.some(u => u.changed) && !applied && (
          <button
            onClick={handleApply}
            disabled={applying}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 disabled:opacity-50 font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95"
          >
            {applying ? <Loader2 className="animate-spin size-5" /> : <RefreshCw className="size-5" />}
            Xác nhận cập nhật {updates.filter(u => u.changed).length} người
          </button>
        )}
      </div>

      {error && (
        <div className="p-5 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl flex items-start gap-3 shadow-sm">
          <ShieldAlert className="size-6 shrink-0 text-rose-600" />
          <div>
            <p className="font-bold">Lỗi phả hệ!</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      )}

      {applied && (
        <div className="p-5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl flex items-center gap-3 font-bold shadow-sm">
          <CheckCircle2 className="size-6" /> Đã cập nhật xong dữ liệu mới.
        </div>
      )}

      {updates && (
        <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold">
                <tr>
                  <th className="px-6 py-4">Họ và Tên</th>
                  <th className="px-6 py-4 text-center">Thế hệ (Cũ → Mới)</th>
                  <th className="px-6 py-4 text-center">Thứ tự sinh</th>
                  <th className="px-6 py-4 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {displayedRows.map(u => (
                  <tr key={u.id} className={u.changed ? "bg-amber-50/40" : ""}>
                    <td className="px-6 py-4 font-bold text-stone-800 flex items-center gap-2">
                      <User className={`size-4 ${u.changed ? 'text-amber-600' : 'text-stone-300'}`} />
                      {u.full_name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-stone-400">{u.old_generation ?? "?"}</span>
                      {u.old_generation !== u.new_generation && (
                        <span className="font-bold text-amber-700 ml-2">→ {u.new_generation}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-stone-600">
                      {u.new_birth_order || "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.changed ? (
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase border border-amber-200">Cần cập nhật</span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-stone-100 text-stone-400 text-[10px] font-bold uppercase">Hợp lệ</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {!showAll && updates.length > 20 && (
            <button 
              onClick={() => setShowAll(true)}
              className="w-full py-4 text-stone-500 hover:text-amber-700 font-bold bg-stone-50/30 border-t border-stone-200 transition-colors"
            >
              Hiển thị toàn bộ {updates.length} người...
            </button>
          )}
        </div>
      )}
    </div>
  );
}
