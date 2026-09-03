"use client";

import { setBranchHead } from "@/app/actions/branch";
import { BranchConfig, Person } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import React, { useState } from "react";
import PersonSelector from "./PersonSelector";

interface ChangeBranchHeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: BranchConfig;
  allPersons: Person[];
  onHeadChanged: (newHeadId: string | null) => void;
}

export default function ChangeBranchHeadModal({
  isOpen,
  onClose,
  branch,
  allPersons,
  onHeadChanged,
}: ChangeBranchHeadModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(branch.headId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (newId: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const res = await setBranchHead(branch.id, newId);
      if (res?.error) {
        setError(res.error);
      } else {
        onHeadChanged(newId);
        onClose();
      }
    } catch (err) {
      setError((err as Error).message || "Không thể cập nhật người đứng đầu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden flex flex-col relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-stone-100 bg-stone-50/60">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center shadow-xs">
                <RefreshCw className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900 font-serif">
                  Đổi người đứng đầu {branch.name}
                </h3>
                <p className="text-xs text-stone-500">
                  Cập nhật khi có dữ liệu đầy đủ hơn về phả hệ
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-full transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Chọn người đứng đầu mới:
              </label>
              <PersonSelector
                persons={allPersons}
                selectedId={selectedId}
                onSelect={(id) => {
                  setSelectedId(id);
                  setError(null);
                }}
                placeholder="Tìm tên người đứng đầu..."
                label="Chọn người"
                className="w-full"
              />
              <p className="text-[11px] text-stone-500 pt-1">
                Toàn bộ con cháu dưới người này sẽ tạo thành sơ đồ của {branch.name}.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="size-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-2">
            <button
              onClick={() => handleSave(null)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors"
              title="Gỡ bỏ người này để nhập mới từ đầu"
            >
              <Trash2 className="size-3.5" />
              Gỡ người đầu cành
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => handleSave(selectedId)}
                disabled={loading || !selectedId}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                {loading && <Loader2 className="size-3.5 animate-spin" />}
                Lưu người đầu cành
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
