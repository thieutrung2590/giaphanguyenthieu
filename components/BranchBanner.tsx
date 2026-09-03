"use client";

import { BranchConfig, Person, Relationship } from "@/types";
import {
  ArrowLeft,
  CheckCircle2,
  GitBranch,
  Link2,
  Plus,
  RefreshCw,
  Unlink,
  Users,
} from "lucide-react";
import Link from "next/link";
import React from "react";

interface BranchBannerProps {
  branch: BranchConfig;
  branchHead: Person;
  branchMemberCount: number;
  relationships: Relationship[];
  allPersonsMap: Map<string, Person>;
  canEdit?: boolean;
  onOpenLinkModal: () => void;
  onOpenChangeHeadModal: () => void;
  onBackToMainTree: () => void;
}

export default function BranchBanner({
  branch,
  branchHead,
  branchMemberCount,
  relationships,
  allPersonsMap,
  canEdit = false,
  onOpenLinkModal,
  onOpenChangeHeadModal,
  onBackToMainTree,
}: BranchBannerProps) {
  // Tìm xem người đầu cành đã có cha/mẹ trong relationships chưa
  const parentRel = relationships.find(
    (r) =>
      r.person_b === branchHead.id &&
      (r.type === "biological_child" || r.type === "adopted_child"),
  );

  const parentPerson = parentRel ? allPersonsMap.get(parentRel.person_a) : null;
  const isLinked = !!parentPerson;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-1">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-stone-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Thông tin Cành */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="size-11 rounded-2xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-800 shadow-xs shrink-0">
            <GitBranch className="size-6" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold font-serif text-stone-900">
                {branch.name}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200/60">
                <Users className="size-3" />
                {branchMemberCount} thành viên
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-xs sm:text-sm text-stone-500">
                Người đứng đầu cành:{" "}
                <strong className="text-stone-800">{branchHead.full_name}</strong>
                {branchHead.birth_year ? ` (sinh ${branchHead.birth_year})` : ""}
              </p>
              {canEdit && (
                <button
                  onClick={onOpenChangeHeadModal}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 px-2 py-0.5 rounded-lg transition-colors shadow-2xs"
                  title="Thay đổi người đứng đầu cành này khi có dữ liệu đầy đủ hơn"
                >
                  <RefreshCw className="size-3" />
                  Đổi người đứng đầu
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Trạng thái kết nối & Các nút hành động */}
        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto justify-start md:justify-end">
          {/* Huy hiệu trạng thái kết nối */}
          {isLinked ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>
                Đã nối vào Cây Tổng Thể (con cụ{" "}
                <strong>{parentPerson.full_name}</strong>)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-medium">
                <Unlink className="size-4 text-amber-600 shrink-0" />
                <span>Nhập liệu độc lập (chưa nối vào Cây Tổng)</span>
              </div>

              {canEdit && (
                <button
                  onClick={onOpenLinkModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-xs transition-all duration-200 hover:-translate-y-0.5"
                >
                  <Link2 className="size-3.5" />
                  Nối vào Cây Tổng Thể
                </button>
              )}
            </div>
          )}

          {/* Nút thêm thành viên mới */}
          {canEdit && (
            <Link
              href="/dashboard/members/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="size-3.5" />
              Thêm người
            </Link>
          )}

          {/* Nút quay lại cây tổng */}
          <button
            onClick={onBackToMainTree}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Toàn phả hệ
          </button>
        </div>
      </div>
    </div>
  );
}
