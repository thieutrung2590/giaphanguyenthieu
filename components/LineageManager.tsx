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

// ─── THUẬT TOÁN GIA CỐ (FIXED SYNTAX) ───────────────────────────────

function computeGenerations(persons: Person[], relationships: Relationship[]): Map<string, number> {
  const genMap = new Map<string, number>();
  const childToParents = new Map<string, string[]>();
  const parentToChildren = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();

  relationships.forEach(r => {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      if (!childToParents.has(r.person_b)) childToParents.set(r.person_b, []);
      childToParents.get(r.person_b)!.push(r.person_a);
      if (!parentToChildren.has(r.person_a)) parentToChildren.set(r.person_a, []);
      parentToChildren.get(r.person_a)!.push(r.person_b);
    } else if (r.type === "marriage") {
      if (!spouseMap.has(r.person_a)) spouseMap.set(r.person_a, []);
      spouseMap.get(r.person_a)!.push(r.person_b);
      if (!spouseMap.has(r.person_b)) spouseMap.set(r.person_b, []);
      spouseMap.get(r.person_b)!.push(r.person_a);
    }
  });

  const roots = persons.filter(p => !childToParents.has(p.id) && !p.is_in_law);
  let queue: { id: string; gen: number }[] = roots.map(r => ({ id: r.id, gen: 1 }));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    genMap.set(id, gen);

    (spouseMap.get(id) || []).forEach(sId => {
      if (!visited.has(sId)) {
        genMap.set(sId, gen);
        queue.push({ id: sId, gen: gen }); 
      }
    });

    (parentToChildren.get(id) || []).forEach(cId => {
      if (!visited.has(cId)) {
        queue.push({ id: cId, gen: gen + 1 });
      }
    });
  }

  let retry = true;
  while (retry) {
    retry = false;
    persons.forEach(p => {
      if (!genMap.has(p.id)) {
        const spouses = spouseMap.get(p.id) || [];
        const foundGenFromSpouse = spouses.find(sId => genMap.has(sId));
        if (foundGenFromSpouse) {
          genMap.set(p.id, genMap.get(foundGenFromSpouse)!);
          retry = true;
        }
      }
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
    sorted.forEach((p, index) => { if (p) orderMap.set(p.id, index + 1); });
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
      setError("Lỗi thuật toán tính đời.");
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
      setError("Lỗi khi lưu dữ liệu.");
    } finally {
      setApplying(false);
    }
  };

  const changedCount = updates?.filter(u => u.changed).length ?? 0;
  const displayedRows = showAll ? (updates || []) : (updates || []).slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        {/* DÒNG 214 ĐÃ ĐƯỢC FIX DƯỚI ĐÂY */}
        <button
          onClick={handleCompute}
          disabled={computing || applying}
          className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-2xl hover:bg-amber-700 disabled:opacity-50 font-bold shadow-lg shadow-amber-200 transition-all"
        >
          {computing ? <Loader2 className="animate-spin size-5" /> : <Sparkles className="size-5" />}
          Tính toán đời & thứ tự sinh
        </button>

        {updates && changedCount > 0 && !applied && (
          <button
            onClick={handleApply}
            disabled={applying}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 disabled:opacity-50 font-bold shadow-lg shadow-emerald-200 transition-all"
          >
            {applying ? <Loader2 className="animate-spin size-5" /> : <RefreshCw className="size-5" />}
            Áp dụng {changedCount} thay đổi
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
          <CheckCircle2 className="size-5" /> Đã cập nhật xong! Hãy tải lại trang để xem kết quả.
        </div>
      )}

      {updates && (
        <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
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
                  <td className="px-6 py-4 font-bold text-stone-800">{u.full_name}</td>
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
