"use client";

import { BranchConfig, Person } from "@/types";
import { GitBranch, Plus, Search } from "lucide-react";
import React, { useState } from "react";
import PersonSelector from "./PersonSelector";

interface BranchEmptyStateProps {
  branch: BranchConfig;
  allPersons: Person[];
  canEdit?: boolean;
  onCreateFirstMember: () => void;
  onAssignExistingMember: (personId: string) => void;
}

export default function BranchEmptyState({
  branch,
  allPersons,
  canEdit = false,
  onCreateFirstMember,
  onAssignExistingMember,
}: BranchEmptyStateProps) {
  const [isSelecting, setIsSelecting] = useState(false);

  return (
    <div className="max-w-2xl mx-auto my-12 px-6 py-12 bg-white/80 backdrop-blur-xl border border-stone-200/80 rounded-3xl shadow-sm text-center flex flex-col items-center">
      <div className="size-16 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 shadow-inner mb-6">
        <GitBranch className="size-8" />
      </div>

      <span className="px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider border border-emerald-200/50 mb-3">
        Không gian riêng
      </span>

      <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mb-3">
        {branch.name} chưa có dữ liệu
      </h2>

      <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-lg mb-8">
        Bạn có thể bắt đầu xây dựng phả hệ cho cành này hoàn toàn độc lập từ
        người xưa nhất mà cành này biết. Khi xác định được gốc tích, bạn có thể
        nối toàn bộ cành vào <strong>Cây Đại Phả Hệ</strong> chỉ với 1 cú click!
      </p>

      {canEdit ? (
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full justify-center">
          {!isSelecting ? (
            <>
              <button
                onClick={onCreateFirstMember}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold rounded-2xl shadow-md transition-all duration-200 hover:-translate-y-0.5"
              >
                <Plus className="size-4" strokeWidth={2.5} />
                Thêm người đầu tiên cho {branch.name}
              </button>

              <button
                onClick={() => setIsSelecting(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-semibold rounded-2xl border border-stone-200/60 transition-colors"
              >
                <Search className="size-4" />
                Chọn người có sẵn làm đầu cành
              </button>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-md bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div className="flex-1 w-full">
                <PersonSelector
                  persons={allPersons}
                  onSelect={(id) => {
                    if (id) {
                      onAssignExistingMember(id);
                      setIsSelecting(false);
                    }
                  }}
                  placeholder="Tìm người làm đầu cành..."
                  label="Chọn người đứng đầu"
                  className="w-full"
                />
              </div>
              <button
                onClick={() => setIsSelecting(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800"
              >
                Hủy
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-stone-400 italic">
          Cành này đang chờ Quản trị viên cập nhật thành viên đầu tiên.
        </div>
      )}
    </div>
  );
}
