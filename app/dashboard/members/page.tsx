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

  // 1. Luôn xác định chính xác Cụ Thủy Tổ của Toàn Dòng Họ (đời 1, huyết thống, sinh sớm nhất)
  let ancestralRootId: string | null = null;
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
      ancestralRootId = [...bloodlineGen1].sort(sortByBirthYear)[0].id;
    } else if (anyGen1.length > 0) {
      ancestralRootId = [...anyGen1].sort(sortByBirthYear)[0].id;
    } else if (bloodlineRoots.length > 0) {
      ancestralRootId = [...bloodlineRoots].sort(sortByBirthYear)[0].id;
    } else {
      ancestralRootId = [...rootsFallback].sort(sortByBirthYear)[0].id;
    }
  } else if (persons.length > 0) {
    ancestralRootId = persons[0].id;
  }

  // 2. Xác định Cành đang chọn (nếu có)
  const activeBranch = currentBranchNum
    ? branches.find((b) => b.id === currentBranchNum)
    : null;

  // 3. Xác định rootId ban đầu
  let initialRootId: string | null = null;
  if (activeBranch?.headId && personsMap.has(activeBranch.headId)) {
    initialRootId = activeBranch.headId;
  } else if (rootId && personsMap.has(rootId)) {
    initialRootId = rootId;
  } else {
    initialRootId = ancestralRootId;
  }

  return (
    <DashboardProvider
      initialView={view as ViewMode}
      initialRootId={initialRootId}
      initialBranch={currentBranchNum}
    >
      <ViewToggle />
      <DashboardViews
        persons={persons}
        relationships={relationships}
        branches={branches}
        canEdit={canEdit}
        ancestralRootId={ancestralRootId}
      />
      <MemberDetailModal />
    </DashboardProvider>
  );
}
