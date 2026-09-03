"use client";

import { useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { ViewMode } from "./ViewToggle";

interface DashboardState {
  memberModalId: string | null;
  setMemberModalId: (id: string | null) => void;
  showCreateMember: boolean;
  setShowCreateMember: (show: boolean) => void;
  showAvatar: boolean;
  setShowAvatar: (show: boolean) => void;
  view: ViewMode;
  setView: (view: ViewMode) => void;
  rootId: string | null;
  setRootId: (id: string | null) => void;
  branch: number | null;
  setBranch: (branch: number | null) => void;
}

export const DashboardContext = createContext<DashboardState | undefined>(
  undefined,
);

export function DashboardProvider({
  children,
  initialView,
  initialRootId,
  initialBranch,
}: {
  children: React.ReactNode;
  initialView?: ViewMode;
  initialRootId?: string | null;
  initialBranch?: number | null;
}) {
  const searchParams = useSearchParams();
  const [memberModalId, setMemberModalId] = useState<string | null>(null);
  const [showCreateMember, setShowCreateMember] = useState(false);
  const [showAvatar, setShowAvatar] = useState<boolean>(true);
  const [view, setViewState] = useState<ViewMode>(initialView || "list");
  const [rootId, setRootIdState] = useState<string | null>(
    initialRootId || null,
  );
  const [branch, setBranchState] = useState<number | null>(
    initialBranch ?? null,
  );

  // Initialize from URL and listen to Next.js route changes
  useEffect(() => {
    const syncFromURL = () => {
      if (typeof window === "undefined") return;

      const sp = new URLSearchParams(window.location.search);

      const avatarParam = sp.get("avatar");
      setShowAvatar(avatarParam !== "hide");

      const viewParam = sp.get("view") as ViewMode;
      if (viewParam) setViewState(viewParam);

      const rootIdParam = sp.get("rootId");
      setRootIdState(rootIdParam);

      const modalId = sp.get("memberModalId");
      setMemberModalId(modalId);

      const branchParam = sp.get("branch");
      if (branchParam) {
        const num = parseInt(branchParam, 10);
        setBranchState(isNaN(num) ? null : num);
      } else {
        setBranchState(null);
      }
    };

    syncFromURL();
  }, [searchParams]);

  // Sync to URL silently
  const updateModalId = (id: string | null) => {
    setMemberModalId(id);
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      if (id) {
        newUrl.searchParams.set("memberModalId", id);
      } else {
        newUrl.searchParams.delete("memberModalId");
      }
      window.history.replaceState(null, "", newUrl.toString());
    }
  };

  const updateAvatar = (show: boolean) => {
    setShowAvatar(show);
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      if (!show) {
        newUrl.searchParams.set("avatar", "hide");
      } else {
        newUrl.searchParams.delete("avatar");
      }
      window.history.replaceState(null, "", newUrl.toString());
    }
  };

  const setView = (v: ViewMode) => {
    setViewState(v);
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("view", v);
      window.history.replaceState(null, "", newUrl.toString());
    }
  };

  const setRootId = (id: string | null) => {
    setRootIdState(id);
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      if (id) {
        newUrl.searchParams.set("rootId", id);
      } else {
        newUrl.searchParams.delete("rootId");
      }
      window.history.replaceState(null, "", newUrl.toString());
    }
  };

  const setBranch = (b: number | null) => {
    setBranchState(b);
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      if (b !== null) {
        newUrl.searchParams.set("branch", b.toString());
      } else {
        newUrl.searchParams.delete("branch");
      }
      window.history.replaceState(null, "", newUrl.toString());
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        memberModalId,
        setMemberModalId: updateModalId,
        showCreateMember,
        setShowCreateMember,
        showAvatar,
        setShowAvatar: updateAvatar,
        view,
        setView,
        rootId,
        setRootId,
        branch,
        setBranch,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardState {
  const context = useContext(DashboardContext);
  // Return a safe no-op fallback when used outside DashboardProvider
  // (e.g., on the /dashboard/members/[id] standalone page)
  if (context === undefined) {
    return {
      memberModalId: null,
      setMemberModalId: () => {},
      showCreateMember: false,
      setShowCreateMember: () => {},
      showAvatar: true,
      setShowAvatar: () => {},
      view: "list",
      setView: () => {},
      rootId: null,
      setRootId: () => {},
      branch: null,
      setBranch: () => {},
    };
  }
  return context;
}
