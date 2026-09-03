"use client";

import { saveBranchConfigs } from "@/app/actions/branch";
import { BranchConfig, Person } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, GitBranch, Loader2, X } from "lucide-react";
import React, { useState } from "react";
import PersonSelector from "./PersonSelector";

interface BranchSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: BranchConfig[];
  allPersons: Person[];
  onSaved: (updated: BranchConfig[]) => void;
}

export default function BranchSettingsModal({
  isOpen,
  onClose,
  branches,
  allPersons,
  onSaved,
}: BranchSettingsModalProps) {
  const [localBranches, setLocalBranches] = useState<BranchConfig[]>(branches);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNameChange = (id: number, newName: string) => {
    setLocalBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, name: newName } : b)),
    );
  };

  const handleHeadChange = (id: number, newHeadId: string | null) => {
    setLocalBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, headId: newHeadId } : b)),
    );
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await saveBranchConfigs(localBranches);
      if (res?.error) {
        setError(res.error);
      } else {
        onSaved(localBranches);
        onClose();
      }
    } catch (err) {
      setError((err as Error).message || "Không thể lưu cấu hình.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-stone-100 bg-stone-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-100/80 text-amber-800 flex items-center justify-center shadow-xs">
                <GitBranch className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900 font-serif">
                  Cấu hình 5 Cành Dòng Họ
                </h3>
                <p className="text-xs text-stone-500">
                  Tùy chỉnh tên gọi và người đứng đầu đại diện cho từng cành
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
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
            {localBranches.map((branch) => {
              return (
                <div
                  key={branch.id}
                  className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/80 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                    <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                      <span className="size-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">
                        {branch.id}
                      </span>
                      <input
                        type="text"
                        value={branch.name}
                        onChange={(e) => handleNameChange(branch.id, e.target.value)}
                        className="font-bold text-stone-900 bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                        placeholder={`Tên Cành ${branch.id}`}
                      />
                    </div>

                    {branch.headId && (
                      <button
                        onClick={() => handleHeadChange(branch.id, null)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-medium shrink-0"
                      >
                        Gỡ người đầu cành
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-1 border-t border-stone-200/40">
                    <span className="text-xs font-semibold text-stone-500 shrink-0">
                      Người đầu cành:
                    </span>
                    <div className="flex-1 w-full">
                      <PersonSelector
                        persons={allPersons}
                        selectedId={branch.headId}
                        onSelect={(id) => handleHeadChange(branch.id, id)}
                        placeholder="Chưa gán (bấm để chọn)..."
                        label="Chọn người"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="size-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-2.5 shrink-0">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Lưu cấu hình Cành
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
