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
  User
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

// ─── THUẬT TOÁN ĐA CHIỀU (ROBUST GENERATION ALGORITHM) ───────────────────────

function computeGenerations(persons: Person[], relationships: Relationship[]): Map<string, number> {
  const genMap = new Map<string, number>();
  const parentToChildren = new Map<string, string[]>();
  const childToParents = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();

  // 1. Bản đồ hóa các mối quan hệ
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

  const visited = new Set<string>();

  // Hàm lan tỏa đời từ một người bất kỳ (theo cả 2 hướng lên/xuống)
  const processComponent = (startId: string, startGen: number) => {
    const queue: { id: string; gen: number }[] = [{ id: startId, gen: startGen }];
    while (queue.length > 0) {
      const { id, gen } = queue.shift()!;
      
      // Nếu đã ghé thăm nhưng tìm thấy đời cao hơn (nhỏ hơn về số), ta cập nhật lại
      if (visited.has(id)) {
        if (gen < (genMap.get(id) || 999)) {
          genMap.set(id, gen);
        } else {
          continue;
        }
      }

      visited.add(id);
      genMap.set(id, gen);

      // 1. Con cái = Đời + 1
      (parentToChildren.get(id) || []).forEach(cid => queue.push({ id: cid, gen: gen + 1 }));
      // 2. Vợ/Chồng = Cùng đời
      (spouseMap.get(id) || []).forEach(sid => queue.push({ id: sid, gen: gen }));
      // 3. Cha mẹ = Đời - 1 (Lan tỏa ngược lên trên)
      (childToParents.get(id) || []).forEach(pid => queue.push({ id: pid, gen: gen - 1 }));
    }
  };

  // Ưu tiên bắt đầu từ những "Cụ Tổ" thật sự (Không cha mẹ, không phải dâu rể)
  persons.filter(p => !childToParents.has(p.id) && !p.is_in_law).forEach(p => {
    if (!visited.has(p.id)) processComponent(p.id, 1);
  });

  // Vét nốt những người bị đứt đoạn quan hệ
  persons.forEach(p => {
    if (!visited.has(p.id)) processComponent(p.id, 1);
  });

  // CHUẨN HÓA: Đảm bảo đời nhỏ nhất luôn là 1 (không bị âm hoặc bằng 0)
  let minGen = Infinity;
  genMap.forEach(g => { if (g < minGen) minGen = g; });
  if (minGen !== Infinity && minGen !== 1) {
    const shift = 1 - minGen;
    genMap.forEach((g, id) => genMap.set(id, g + shift));
  }

  return genMap;
}

function computeBirthOrders(persons: Person[], relationships: Relationship[]): Map<string, number> {
  const parentChildren = new Map<string, string[]>();
  relationships.forEach(r => {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      if (!parentChildren.has(r.person_a)) parentChildren.set(r.person_a, []);
      parentChildren.get(r.person_a)!.push(r.person_b);
    }
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
        return yearA !== yearB ? yearA - yearB : (a?.full_name || "").localeCompare(b?.full_name || "", "vi");
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

      result.sort((a, b) => (a.changed === b.changed ? 0 : a.changed ? -1 : 1));
      setUpdates(result);
    } catch (err) {
      setError("Lỗi tính toán phả hệ.");
    } finally {
      setComputing(false);
    }
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
      setError("Không thể lưu dữ liệu.");
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
          className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-2xl hover:bg-amber-700 disabled:opacity-50 font-bold shadow-lg shadow-amber-200 transition-all"
        >
          {computing ? <Loader2 className="animate-spin size-5" /> : <Sparkles className="size-5" />}
          Tính toán lại đời & thứ tự sinh
        </button>

        {updates && updates.some(u => u.changed) && !applied && (
          <button
            onClick={handleApply}
            disabled={applying}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 disabled:opacity-50 font-bold shadow-lg shadow-emerald-200 transition-all"
          >
            {applying ? <Loader2 className="animate-spin size-5" /> : <RefreshCw className="size-5" />}
            Áp dụng {updates.filter(u => u.changed).length} thay đổi
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl flex items-center gap-3">
          <AlertCircle className="size-5" /> {error}
        </div>
      )}

      {applied && (
        <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl flex items-center gap-3 font-bold">
          <CheckCircle2 className="size-5" /> Đã cập nhật xong! Hãy tải lại trang.
        </div>
      )}

      {updates && (
        <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
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
                        <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-[10px] font-bold uppercase border border-amber-200">Thay đổi</span>
                      ) : (
                        <span className="px-2 py-1 rounded-lg bg-stone-100 text-stone-400 text-[10px] font-bold uppercase">Giữ nguyên</span>
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
              className="w-full py-4 text-stone-400 hover:text-amber-700 font-bold bg-stone-50/50 border-t border-stone-200 transition-colors"
            >
              Xem tất cả {updates.length} thành viên...
            </button>
          )}
        </div>
      )}
    </div>
  );
}
