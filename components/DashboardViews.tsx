"use client";

import { setBranchHead } from "@/app/actions/branch";
import BranchBanner from "@/components/BranchBanner";
import BranchEmptyState from "@/components/BranchEmptyState";
import BranchNavBar from "@/components/BranchNavBar";
import BranchSettingsModal from "@/components/BranchSettingsModal";
import { useDashboard } from "@/components/DashboardContext";
import DashboardMemberList from "@/components/DashboardMemberList";
import LinkBranchModal from "@/components/LinkBranchModal";
import RootSelector from "@/components/RootSelector";
import { BranchConfig, Person, Relationship } from "@/types";
import { buildAdjacencyLists, getBranchMemberIds } from "@/utils/treeHelpers";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const FamilyTree = dynamic(() => import("@/components/FamilyTree"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full p-8 text-stone-500">
      Đang tải sơ đồ gia phả...
    </div>
  ),
});

const MindmapTree = dynamic(() => import("@/components/MindmapTree"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full p-8 text-stone-500">
      Đang tải sơ đồ tư duy...
    </div>
  ),
});

interface DashboardViewsProps {
  persons: Person[];
  relationships: Relationship[];
  branches?: BranchConfig[];
  canEdit?: boolean;
  rootId?: string;
}

export default function DashboardViews({
  persons,
  relationships,
  branches = [],
  canEdit = false,
  rootId: propRootId,
}: DashboardViewsProps) {
  const router = useRouter();
  const {
    view: currentView,
    rootId: contextRootId,
    branch: contextBranch,
    setBranch,
    setRootId,
  } = useDashboard();

  const [localBranches, setLocalBranches] = useState<BranchConfig[]>(branches);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  const rootId = contextRootId || propRootId;

  // Build persons map
  const personsMap = useMemo(
    () => new Map<string, Person>(persons.map((p) => [p.id, p])),
    [persons],
  );

  // Build adjacency list for relationships
  const adj = useMemo(
    () => buildAdjacencyLists(relationships, personsMap),
    [relationships, personsMap],
  );

  // Active branch (if any)
  const activeBranch = useMemo(
    () => localBranches.find((b) => b.id === contextBranch) || null,
    [localBranches, contextBranch],
  );

  // Compute members belonging to active branch
  const { branchMemberIds, branchHead } = useMemo(() => {
    if (!activeBranch?.headId || !personsMap.has(activeBranch.headId)) {
      return { branchMemberIds: new Set<string>(), branchHead: null };
    }
    const head = personsMap.get(activeBranch.headId)!;
    const memberIds = getBranchMemberIds(head.id, adj);
    return { branchMemberIds: memberIds, branchHead: head };
  }, [activeBranch, personsMap, adj]);

  // Determine display persons based on branch
  const displayPersons = useMemo(() => {
    if (activeBranch && branchHead) {
      return persons.filter((p) => branchMemberIds.has(p.id));
    }
    return persons;
  }, [activeBranch, branchHead, persons, branchMemberIds]);

  // Determine roots for tree views
  const { roots, defaultRootId } = useMemo(() => {
    if (activeBranch && branchHead) {
      return {
        roots: [branchHead],
        defaultRootId: branchHead.id,
      };
    }

    const childIds = new Set(
      relationships
        .filter(
          (r) => r.type === "biological_child" || r.type === "adopted_child",
        )
        .map((r) => r.person_b),
    );

    let finalRootId = rootId;

    if (!finalRootId || !personsMap.has(finalRootId)) {
      const rootsFallback = persons.filter((p) => !childIds.has(p.id));
      if (rootsFallback.length > 0) {
        const gen1 = rootsFallback.filter((p) => p.generation === 1);
        const sortByBirthYear = (a: Person, b: Person) => {
          const ya = a.birth_year ?? Infinity;
          const yb = b.birth_year ?? Infinity;
          return ya - yb;
        };

        if (gen1.length > 0) {
          finalRootId = [...gen1].sort(sortByBirthYear)[0].id;
        } else {
          finalRootId = [...rootsFallback].sort(sortByBirthYear)[0].id;
        }
      } else if (persons.length > 0) {
        finalRootId = persons[0].id;
      }
    }

    let calculatedRoots: Person[] = [];
    if (finalRootId && personsMap.has(finalRootId)) {
      calculatedRoots = [personsMap.get(finalRootId)!];
    }

    return {
      roots: calculatedRoots,
      defaultRootId: finalRootId,
    };
  }, [activeBranch, branchHead, relationships, rootId, personsMap, persons]);

  const activeRootId = rootId || defaultRootId;

  // Handler khi gán người có sẵn làm đầu cành
  const handleAssignExistingHead = async (branchId: number, personId: string) => {
    await setBranchHead(branchId, personId);
    setLocalBranches((prev) =>
      prev.map((b) => (b.id === branchId ? { ...b, headId: personId } : b)),
    );
    setRootId(personId);
    router.refresh();
  };

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col">
      {/* 1. THANH ĐIỀU HƯỚNG 5 CÀNH */}
      <BranchNavBar
        branches={localBranches}
        selectedBranchId={contextBranch}
        onSelectBranch={(bId) => {
          setBranch(bId);
          if (bId) {
            const b = localBranches.find((x) => x.id === bId);
            if (b?.headId) setRootId(b.headId);
          } else {
            setRootId(null);
          }
        }}
        canEdit={canEdit}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 2. NẾU ĐANG CHỌN CÀNH VÀ CÀNH ĐÃ CÓ DỮ LIỆU: HIỂN THỊ BANNER CÀNH */}
      {activeBranch && branchHead && (
        <BranchBanner
          branch={activeBranch}
          branchHead={branchHead}
          branchMemberCount={branchMemberIds.size}
          relationships={relationships}
          allPersonsMap={personsMap}
          canEdit={canEdit}
          onOpenLinkModal={() => setIsLinkModalOpen(true)}
          onBackToMainTree={() => {
            setBranch(null);
            setRootId(null);
          }}
        />
      )}

      {/* 3. NẾU ĐANG CHỌN CÀNH NHƯNG CÀNH CHƯA CÓ NGƯỜI ĐẦU CÀNH: HIỂN THỊ EMPTY STATE */}
      {activeBranch && !branchHead ? (
        <div className="flex-1 w-full flex items-center justify-center p-4">
          <BranchEmptyState
            branch={activeBranch}
            allPersons={persons}
            canEdit={canEdit}
            onCreateFirstMember={() =>
              router.push(`/dashboard/members/new?branch=${activeBranch.id}`)
            }
            onAssignExistingMember={(personId) =>
              handleAssignExistingHead(activeBranch.id, personId)
            }
          />
        </div>
      ) : (
        <>
          {/* TOOLBAR VÀ ROOT SELECTOR KHI XEM TOÀN PHẢ HỆ HOẶC CÀNH ĐÃ CÓ DỮ LIỆU */}
          {currentView !== "list" && persons.length > 0 && activeRootId && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 w-full flex flex-col sm:flex-row flex-wrap items-center sm:justify-between gap-4 relative z-20">
              <RootSelector
                persons={displayPersons}
                currentRootId={activeRootId}
              />
              <div
                id="tree-toolbar-portal"
                className="flex items-center gap-2 flex-wrap justify-center"
              />
            </div>
          )}

          {/* CHẾ ĐỘ DANH SÁCH */}
          {currentView === "list" && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full relative z-10">
              <DashboardMemberList
                initialPersons={displayPersons}
                relationships={relationships}
                canEdit={canEdit}
              />
            </div>
          )}

          {/* CHẾ ĐỘ SƠ ĐỒ CÂY & MINDMAP */}
          <div className="flex-1 w-full relative z-10">
            {currentView === "tree" && (
              <FamilyTree
                personsMap={personsMap}
                relationships={relationships}
                roots={roots}
                canEdit={canEdit}
              />
            )}
            {currentView === "mindmap" && (
              <MindmapTree
                personsMap={personsMap}
                relationships={relationships}
                roots={roots}
                canEdit={canEdit}
              />
            )}
          </div>
        </>
      )}

      {/* MODALS */}
      {canEdit && (
        <>
          <BranchSettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            branches={localBranches}
            allPersons={persons}
            onSaved={(updated) => {
              setLocalBranches(updated);
              router.refresh();
            }}
          />

          {activeBranch && branchHead && (
            <LinkBranchModal
              isOpen={isLinkModalOpen}
              onClose={() => setIsLinkModalOpen(false)}
              branchName={activeBranch.name}
              branchHead={branchHead}
              branchMemberIds={branchMemberIds}
              allPersons={persons}
              onSuccess={() => {
                router.refresh();
              }}
            />
          )}
        </>
      )}
    </main>
  );
}
