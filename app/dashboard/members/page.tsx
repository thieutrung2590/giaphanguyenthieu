import { DashboardProvider } from "@/components/DashboardContext";
import DashboardViews from "@/components/DashboardViews";
import MemberDetailModal from "@/components/MemberDetailModal";
import ViewToggle from "@/components/ViewToggle";
import { getProfile, getSupabase } from "@/utils/supabase/queries";

interface PageProps {
  searchParams: Promise<{ view?: string; rootId?: string }>;
}

export default async function FamilyTreePage({ searchParams }: PageProps) {
  const { rootId } = await searchParams;

  const profile = await getProfile();
  const canEdit = profile?.role === "admin" || profile?.role === "editor";

  const supabase = await getSupabase();

  const [personsRes, relsRes] = await Promise.all([
    supabase
      .from("persons")
      .select("*")
      .order("birth_year", { ascending: true, nullsFirst: false }),
    supabase.from("relationships").select("*"),
  ]);

  // Ghi log lỗi từ Supabase nếu có để dễ dàng debug
  if (personsRes.error) console.error("Error fetching persons:", personsRes.error);
  if (relsRes.error) console.error("Error fetching relationships:", relsRes.error);

  const persons = personsRes.data || [];
  const relationships = relsRes.data || [];

  // Khởi tạo Map ngắn gọn hơn
  const personsMap = new Map(persons.map((p) => [p.id, p]));

  const childIds = new Set(
    relationships
      .filter(
        (r) => r.type === "biological_child" || r.type === "adopted_child"
      )
      .map((r) => r.person_b)
  );

  let finalRootId = rootId;

  // Nếu không có rootId hợp lệ, lấy fallback
  if (!finalRootId || !personsMap.has(finalRootId)) {
    const rootsFallback = persons.filter((p) => !childIds.has(p.id));
    if (rootsFallback.length > 0) {
      finalRootId = rootsFallback[0].id;
    } else if (persons.length > 0) {
      finalRootId = persons[0].id; // ultimate fallback
    }
  }

  return (
    <DashboardProvider>
      <ViewToggle />
      <DashboardViews
        persons={persons}
        relationships={relationships}
        canEdit={canEdit}
        rootId={finalRootId} /* Đã truyền biến này xuống component */
      />
      <MemberDetailModal />
    </DashboardProvider>
  );
}
