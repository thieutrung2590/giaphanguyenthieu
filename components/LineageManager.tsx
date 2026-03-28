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

// ─── THUẬT TOÁN AN TOÀN (SAFE BFS ALGORITHM) ───────────────────────────────

function computeGenerations(persons: Person[], relationships: Relationship[]): Map<string, number> {
  const genMap = new Map<string, number>();
  const parentToChildren = new Map<string, string[]>();
  const childToParents = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();

  // 1. Khởi tạo bản đồ quan hệ
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
  const queue: { id: string; gen: number }[] = [];

  // 2. Tìm các "gốc" (Những người không có cha mẹ trong hệ thống)
  const roots = persons.filter(p => !childToParents.has(p.id));
  roots.forEach(r => queue.push({ id: r.id, gen: 1 }));

  // 3. Chạy vòng lặp an toàn (Safety break để chống treo trình duyệt)
  let safetyCounter = 0;
  const MAX_SAFE_ITERATIONS = 5000;

  while (queue.length > 0 && safetyCounter < MAX_SAFE_ITERATIONS) {
    safetyCounter++;
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;

    visited.add(current.id);
    genMap.set(current.id, current.gen);

    // Lan tỏa cho con cái (Đời + 1)
    const children = parentToChildren.get(current.id) || [];
    children.forEach(cid => {
      if (!visited.has(cid)) queue.push({ id: cid, gen: current.gen + 1 });
    });

    // Lan tỏa cho vợ/chồng (Cùng đời)
    const spouses = spouseMap.get(current.id) || [];
    spouses.forEach(sid => {
      if (!visited.has(sid)) queue.push({ id: sid, gen: current.gen });
    });
  }

  if (safetyCounter >= MAX_SAFE_ITERATIONS) {
    throw new Error("Phát hiện vòng lặp vô hạn trong dữ liệu quan hệ (Ví dụ: Cha là con của chính mình). Hãy kiểm tra lại phả hệ.");
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
        if (yearA !== yearB) return yearA - yearB;
        return (a?.full_name || "").localeCompare(b?.full_name || "", "vi");
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
    setUpdates(null);

    // Sử dụng setTimeout để UI không bị đơ trong khi tính toán
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

        // Sắp xếp: Những người có thay đổi lên đầu
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
    }, 100);
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
          {computing ? "Đang xử lý..." : "Tính toán lại đời & thứ tự sinh"}
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
