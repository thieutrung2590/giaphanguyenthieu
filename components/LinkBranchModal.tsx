"use client";

import { linkBranchHeadToParent } from "@/app/actions/branch";
import { Person } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Link2, Loader2, X } from "lucide-react";
import React, { useState } from "react";
import PersonSelector from "./PersonSelector";

interface LinkBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchName: string;
  branchHead: Person;
  branchMemberIds: Set<string>;
  allPersons: Person[];
  onSuccess: () => void;
}

export default function LinkBranchModal({
  isOpen,
  onClose,
  branchName,
  branchHead,
  branchMemberIds,
  allPersons,
  onSuccess,
}: LinkBranchModalProps) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chỉ cho phép chọn những người KHÔNG thuộc cành này (tránh vòng lặp phả hệ)
  const candidateParents = allPersons.filter(
    (p) => !branchMemberIds.has(p.id) && p.id !== branchHead.id,
  );

  const handleLink = async () => {
    if (!selectedParentId) {
      setError("Vui lòng chọn người làm Cha/Mẹ trên Cây Tổng Thể.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await linkBranchHeadToParent(branchHead.id, selectedParentId);
      if (res?.error) {
        setError(res.error);
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError((err as Error).message || "Không thể tạo liên kết.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden flex flex-col relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-stone-100 bg-stone-50/50">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center shadow-xs">
                <Link2 className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900 font-serif">
                  Nối {branchName} vào Cây Tổng Thể
                </h3>
                <p className="text-xs text-stone-500">
                  Tự động sáp nhập toàn bộ con cháu của cành vào đại phả hệ
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
          <div className="p-5 sm:p-6 space-y-4">
            <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-2xl p-4 text-xs sm:text-sm text-emerald-900 leading-relaxed">
              <p className="font-semibold mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Người đứng đầu cành: <strong>{branchHead.full_name}</strong>
              </p>
              <p className="text-emerald-800/90 text-xs">
                Khi chọn Cha/Mẹ bên dưới, toàn bộ {branchMemberIds.size} thành viên
                thuộc cành này sẽ tự động xuất hiện trên Cây Đại Phả Hệ.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Chọn Cha hoặc Mẹ trên Cây Tổng Thể:
              </label>
              <PersonSelector
                persons={candidateParents}
                selectedId={selectedParentId}
                onSelect={(id) => {
                  setSelectedParentId(id);
                  setError(null);
                }}
                placeholder="Tìm tên cụ làm cha/mẹ..."
                label="Chọn người"
                className="w-full"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="size-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleLink}
              disabled={loading || !selectedParentId}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Xác nhận kết nối Cành
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
