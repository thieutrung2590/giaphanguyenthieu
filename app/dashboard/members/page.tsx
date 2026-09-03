import { getBranchConfigs } from "@/app/actions/branch";
import { DashboardProvider } from "@/components/DashboardContext";
import DashboardViews from "@/components/DashboardViews";
import MemberDetailModal from "@/components/MemberDetailModal";
import ViewToggle, { ViewMode } from "@/components/ViewToggle";
import { getProfile, getSupabase } from "@/utils/supabase/queries";

interface PageProps {
  searchParams: Promise<{ view?: string; rootId?: string; branch?: string }>;
}

export default async function FamilyTreePage({ searchParams }: PageProps) {
  const { rootId, view, branch } = await searchParams;
  const currentBranchNum = branch ? parseInt(branch, 10) : null;

  const supabase = await getSupabase();

  const [profile, personsRes, relsRes, branches] = await Promise.all([
    getProfile(),
    supabase
      .from("persons")
      .select("*")
      .order("birth_year", { ascending: true, nullsFirst: false }),
    supabase.from("relationships").select("*"),
    getBranchConfigs(),
  ]);

  const canEdit = profile?.role === "admin" || profile?.role === "editor";

  // Ghi log lỗi từ Supabase nếu có để dễ dàng debug
  if (personsRes.error) console.error("Error fetching persons:", personsRes.error);
  if (relsRes.error) console.error("Error fetching relationships:", relsRes.error);

  const persons = personsRes.data || [];
  const relationships = relsRes.data || [];

  // Khởi tạo Map ngắn gọn hơn
  const personsMap = new Map(persons.map((p) => [p.id, p]));

  let finalRootId = rootId;

  // Nếu đang xem một Cành cụ thể và cành đó có người đứng đầu:
  const activeBranch = currentBranchNum
    ? branches.find((b) => b.id === currentBranchNum)
    : null;

  if (activeBranch && activeBranch.headId && personsMap.has(activeBranch.headId)) {
    finalRootId = activeBranch.headId;
  } else if (!finalRootId || !personsMap.has(finalRootId)) {
    const childIds = new Set(
      relationships
        .filter(
          (r) => r.type === "biological_child" || r.type === "adopted_child"
        )
        .map((r) => r.person_b)
    );

    const rootsFallback = persons.filter((p) => !childIds.has(p.id));
    if (rootsFallback.length > 0) {
      const bloodlineGen1 = rootsFallback.filter(
        (p) => p.generation === 1 && !p.is_in_law
      );
      const anyGen1 = rootsFallback.filter((p) => p.generation === 1);
      const bloodlineRoots = rootsFallback.filter((p) => !p.is_in_law);

      const sortByBirthYear = (
        a: (typeof persons)[0],
        b: (typeof persons)[0]
      ) => {
        const ya = a.birth_year ?? Infinity;
        const yb = b.birth_year ?? Infinity;
        return ya - yb;
      };

      if (bloodlineGen1.length > 0) {
        finalRootId = [...bloodlineGen1].sort(sortByBirthYear)[0].id;
      } else if (anyGen1.length > 0) {
        finalRootId = [...anyGen1].sort(sortByBirthYear)[0].id;
      } else if (bloodlineRoots.length > 0) {
        finalRootId = [...bloodlineRoots].sort(sortByBirthYear)[0].id;
      } else {
        finalRootId = [...rootsFallback].sort(sortByBirthYear)[0].id;
      }
    } else if (persons.length > 0) {
      finalRootId = persons[0].id; // ultimate fallback
    }
  }

  return (
    <DashboardProvider
      initialView={view as ViewMode}
      initialRootId={finalRootId}
      initialBranch={currentBranchNum}
    >
      <ViewToggle />
      <DashboardViews
        persons={persons}
        relationships={relationships}
        branches={branches}
        canEdit={canEdit}
        rootId={finalRootId}
      />
      <MemberDetailModal />
    </DashboardProvider>
  );
}
