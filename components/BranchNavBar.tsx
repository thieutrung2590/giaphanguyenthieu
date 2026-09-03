"use client";

import { BranchConfig } from "@/types";
import { motion } from "framer-motion";
import { Crown, GitBranch, Settings } from "lucide-react";
import React from "react";

interface BranchNavBarProps {
  branches: BranchConfig[];
  selectedBranchId: number | null; // null = Toàn phả hệ, 1..5 = Cành
  onSelectBranch: (branchId: number | null) => void;
  canEdit?: boolean;
  onOpenSettings?: () => void;
}

export default function BranchNavBar({
  branches,
  selectedBranchId,
  onSelectBranch,
  canEdit = false,
  onOpenSettings,
}: BranchNavBarProps) {
  return (
    <div className="w-full flex items-center justify-between gap-2 px-4 sm:px-6 lg:px-8 pt-2 pb-1 max-w-7xl mx-auto">
      {/* Scrollable branch tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1.5 custom-scrollbar flex-1">
        {/* Nút Toàn phả hệ */}
        <button
          onClick={() => onSelectBranch(null)}
          className={`relative shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 border shadow-xs ${
            selectedBranchId === null
              ? "bg-amber-800 text-white border-amber-900 shadow-amber-900/20"
              : "bg-white/80 text-stone-700 border-stone-200/80 hover:bg-stone-100 hover:text-stone-900"
          }`}
        >
          <Crown className={`size-3.5 sm:size-4 ${selectedBranchId === null ? "text-amber-200" : "text-amber-600"}`} />
          <span>Toàn Dòng Họ</span>
          {selectedBranchId === null && (
            <motion.div
              layoutId="activeBranchIndicator"
              className="absolute inset-0 rounded-full border-2 border-amber-500/40 pointer-events-none"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>

        {/* Danh sách 5 cành */}
        {branches.map((branch) => {
          const isSelected = selectedBranchId === branch.id;
          const hasHead = !!branch.headId;

          return (
            <button
              key={branch.id}
              onClick={() => onSelectBranch(branch.id)}
              className={`relative shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 border shadow-xs ${
                isSelected
                  ? "bg-emerald-800 text-white border-emerald-900 shadow-emerald-900/20"
                  : "bg-white/80 text-stone-700 border-stone-200/80 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              <GitBranch className={`size-3.5 sm:size-4 ${isSelected ? "text-emerald-200" : "text-emerald-600"}`} />
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                {branch.name}
              </span>

              {/* Chấm tròn báo trạng thái có/chưa có dữ liệu */}
              <span
                className={`size-2 rounded-full shrink-0 ${
                  hasHead ? "bg-emerald-400" : "bg-amber-400/80"
                }`}
                title={hasHead ? "Đã có dữ liệu" : "Chưa có dữ liệu"}
              />

              {isSelected && (
                <motion.div
                  layoutId="activeBranchIndicator"
                  className="absolute inset-0 rounded-full border-2 border-emerald-500/40 pointer-events-none"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Nút cài đặt cành (chỉ Admin/Editor) */}
      {canEdit && onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className="shrink-0 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 border border-stone-200/60 shadow-xs transition-colors"
          title="Cấu hình danh sách Cành"
        >
          <Settings className="size-4" />
        </button>
      )}
    </div>
  );
}
