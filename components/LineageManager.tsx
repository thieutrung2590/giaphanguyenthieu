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
  ArrowRight
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

// ─── Thuật toán đã được tối ưu & Chống treo trình duyệt ───────────────────────

function computeGenerations(persons: Person[], relationships: Relationship[]): Map<string, number> {
  const childParents = new Map<string, string[]>();
  const parentChildren = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();

  relationships.forEach(r => {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      if (!childParents.has(r.person_b)) childParents.set(r.person_b, []);
      childParents.get(r.person_b)!.push(r.person_a);
      if (!parentChildren.has(r.person_a)) parentChildren.set(r.person_a, []);
      parentChildren.get(r.person_a)!.push(r.person_b);
    } else if (r.type === "marriage") {
      if (!spouseMap.has(r.person_a)) spouseMap.set(r.person_a, []);
      spouseMap.get(r.person_a)!.push(r.person_b);
      if (!spouseMap.has(r.person_b)) spouseMap.set(r.person_b, []);
      spouseMap.get(r.person_b)!.push(r.person_a);
    }
  });

  // Tìm gốc: Ưu tiên người không có bố mẹ
  const roots = persons.filter(p => !childParents.has(p.id) && !p.is_in_law);
  const genMap = new Map<string, number>();
  const queue: { id: string; gen: number }[] = roots.map(r => ({ id: r.id, gen: 1 }));
  const visited = new Set<string>(); // Chống vòng lặp vô hạn

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!;
    if (visited.has(id)) continue; 
    visited.add(id);

    genMap.set(id, gen);

    // Lan tỏa cho con (Đời + 1)
    (parentChildren.get(id) || []).forEach(cid => {
      if (!visited.has(cid)) queue.push({ id: cid, gen: gen + 1 });
    });

    // Lan tỏa cho vợ/chồng (Cùng đời)
    (spouseMap.get(id) || []).forEach(sid => {
      if (!visited.has(sid)) queue.push({ id: sid, gen: gen });
    });
  }

  return genMap;
}

function computeBirthOrders(persons: Person[], relationships: Relationship[]): Map<string, number> {
  const parentChildren = new Map<string, Set<string>>();
  relationships.forEach(r => {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      if (!parentChildren.has(r.person_a)) parentChildren.set(r.person_a, new Set());
      parentChildren.get(r.person_a)!.add(r.person_b);
    }
  });

  const personsById = new Map(persons.map(p => [p.id, p]));
  const orderMap = new Map<string, number>();

  parentChildren.forEach(childIds => {
    const sorted = Array.from(childIds)
      .map(id => personsById.get(id))
      .filter(p => p && !p.is_in_law)
      .sort((a, b) => {
        const aYear = a?.birth_year ?? 9999;
        const bYear = b?.birth_year ?? 9999;
        return aYear !== bYear ? aYear - bYear : (a?.full_name || "").localeCompare(b?.full_name || "", "vi");
      });

    sorted.forEach((p, index) => {
      if (p) orderMap.set(p.id, index + 1);
    });
  });

  return orderMap;
}

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

      const result: ComputedUpdate[] = persons.map(p => ({
        id: p.id,
        full_name: p.full_name,
        old_generation: p.generation,
        new_generation: genMap.get(p.id) || null,
        old_birth_order: p.birth_order,
        new_birth_order: orderMap.get(p.id) || null,
        changed: (genMap.get(p.id) || null) !== p.generation || (orderMap.get(p.id) || null) !== p.birth_order
      }));

      // Đưa những người có thay đổi lên đầu
      result.sort((a, b) => (a.changed === b.changed ? 0 : a.changed ? -1 : 1));
      setUpdates(result);
    } catch (err) {
      setError("Lỗi dữ liệu phả hệ: Có thể tồn tại vòng lặp trong quan hệ cha con.");
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
    } catch (err) {
      setError("Không thể lưu dữ liệu vào Supabase.");
    } finally {
      setApplying(false);
    }
  };

  const changedCount = updates?.filter(u => u.changed).length ?? 0;
  const displayedRows = showAll ? (updates || []) : (updates || []).slice(0, 15);

  return (
    <div className="space-y-6">
      {/* Nút bấm dùng Tailwind chuẩn */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleCompute}
          disabled={computing || applying}
          className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-50 font-bold transition-all shadow-md"
        >
          {computing ? <Loader2 className="animate-spin size-4" /> : <Sparkles className="size-4" />}
          Tính toán lại thứ tự
        </button>

        {updates && changedCount > 0 && !applied && (
          <button
            onClick={handleApply}
            disabled={applying}
            className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 font-bold transition-all shadow-md"
          >
            {applying ? <Loader2 className="animate-spin size-4" /> : <RefreshCw className="size-4" />}
            Áp dụng {changedCount} thay đổi
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="size-5" /> {error}
        </div>
      )}

      {applied && (
        <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center gap-3 font-bold">
          <CheckCircle2 className="size-5" /> Cập nhật phả hệ thành công!
        </div>
      )}

      {updates && (
        <div className="border border-stone-200 rounded-2xl bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500">
              <tr>
                <th className="px-6 py-4">Thành viên</th>
                <th className="px-6 py-4 text-center">Đời (Cũ → Mới)</th>
                <th className="px-6 py-4 text-center">Thứ tự sinh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {displayedRows.map(u => (
                <tr key={u.id} className={u.changed ? "bg-amber-50/30" : ""}>
                  <td className="px-6 py-4 font-bold text-stone-800">{u.full_name}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-stone-400">{u.old_generation ?? "?"}</span>
                    {u.old_generation !== u.new_generation && (
                      <span className="font-bold text-amber-700 ml-2">→ {u.new_generation}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-stone-700">
                    {u.new_birth_order || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {!showAll && updates.length > 15 && (
            <button 
              onClick={() => setShowAll(true)}
              className="w-full py-3 text-stone-400 hover:text-amber-600 font-medium bg-stone-50/50 border-t border-stone-100"
            >
              Xem thêm {updates.length - 15} người khác...
            </button>
          )}
        </div>
      )}
    </div>
  );
}
