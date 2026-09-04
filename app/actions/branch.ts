"use server";

import { BranchConfig } from "@/types";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";

const BRANCH_EVENT_NAME = "__CONFIG_BRANCHES__";

const DEFAULT_BRANCH_NAMES: Record<number, string> = {
  1: "Cành 1",
  2: "Cành 2",
  3: "Cành 3",
  4: "Cành 4",
  5: "Cành 5",
};

/**
 * Lấy danh sách 5 Cành từ database hoặc tự động suy luận từ con của Cụ Thủy Tổ.
 */
export async function getBranchConfigs(): Promise<BranchConfig[]> {
  const supabase = await getSupabase();

  try {
    const { data: configEvent } = await supabase
      .from("custom_events")
      .select("*")
      .eq("name", BRANCH_EVENT_NAME)
      .maybeSingle();

    if (configEvent?.content) {
      const parsed = JSON.parse(configEvent.content) as BranchConfig[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Đảm bảo luôn có đủ 5 cành 1..5
        const branchMap = new Map(parsed.map((b) => [b.id, b]));
        const fullBranches: BranchConfig[] = [];
        for (let i = 1; i <= 5; i++) {
          const existing = branchMap.get(i);
          fullBranches.push({
            id: i,
            name: existing?.name || DEFAULT_BRANCH_NAMES[i] || `Cành ${i}`,
            headId: existing?.headId || null,
            description: existing?.description || "",
          });
        }
        return fullBranches;
      }
    }
  } catch (err) {
    console.error("Error reading branch configs:", err);
  }

  // Mặc định cả 5 cành 1..5 đều để headId: null để người dùng tự do chọn hoặc nhập mới từ đầu
  return [1, 2, 3, 4, 5].map((i) => ({
    id: i,
    name: DEFAULT_BRANCH_NAMES[i] || `Cành ${i}`,
    headId: null,
  }));
}

/**
 * Lưu toàn bộ cấu hình các Cành vào database.
 */
export async function saveBranchConfigs(branches: BranchConfig[]) {
  const profile = await getProfile();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { error: "Bạn không có quyền thay đổi cấu hình Cành." };
  }

  const supabase = await getSupabase();

  try {
    const { data: existing } = await supabase
      .from("custom_events")
      .select("id")
      .eq("name", BRANCH_EVENT_NAME)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from("custom_events")
        .update({
          content: JSON.stringify(branches),
        })
        .eq("id", existing.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("custom_events")
        .insert({
          name: BRANCH_EVENT_NAME,
          content: JSON.stringify(branches),
          event_date: "2000-01-01",
          created_by: profile?.id,
        });

      if (insertError) throw insertError;
    }

    revalidatePath("/dashboard/members");
    return { success: true };
  } catch (err) {
    console.error("Error saving branch configs:", err);
    return { error: (err as Error).message || "Không thể lưu cấu hình Cành." };
  }
}

/**
 * Gán hoặc đổi người đứng đầu cho một Cành.
 */
export async function setBranchHead(branchId: number, headId: string | null) {
  const currentBranches = await getBranchConfigs();
  const updated = currentBranches.map((b) =>
    b.id === branchId ? { ...b, headId } : b,
  );
  return await saveBranchConfigs(updated);
}

/**
 * Đổi tên hiển thị của một Cành.
 */
export async function renameBranch(branchId: number, name: string) {
  const currentBranches = await getBranchConfigs();
  const updated = currentBranches.map((b) =>
    b.id === branchId ? { ...b, name } : b,
  );
  return await saveBranchConfigs(updated);
}

/**
 * Tạo quan hệ Cha/Mẹ - Con để nối người đầu Cành vào một người trên Cây Tổng Thể.
 */
export async function linkBranchHeadToParent(
  branchHeadId: string,
  parentId: string,
) {
  const profile = await getProfile();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { error: "Bạn không có quyền tạo mối quan hệ gia phả." };
  }

  if (branchHeadId === parentId) {
    return { error: "Người làm cha/mẹ không thể là chính người này." };
  }

  const supabase = await getSupabase();

  try {
    // Kiểm tra xem quan hệ đã tồn tại chưa
    const { data: existing } = await supabase
      .from("relationships")
      .select("id")
      .eq("person_a", parentId)
      .eq("person_b", branchHeadId)
      .maybeSingle();

    if (existing) {
      return { error: "Mối quan hệ này đã tồn tại trên hệ thống." };
    }

    const { error: insertError } = await supabase
      .from("relationships")
      .insert({
        person_a: parentId,
        person_b: branchHeadId,
        type: "biological_child",
      });

    if (insertError) throw insertError;

    revalidatePath("/dashboard/members");
    return { success: true };
  } catch (err) {
    console.error("Error linking branch head to parent:", err);
    return {
      error: (err as Error).message || "Không thể tạo liên kết vào Cây Tổng Thể.",
    };
  }
}
