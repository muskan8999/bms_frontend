"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Header, type Crumb } from "@/components/layout/header";
import { cn } from "@/lib/utils";

const PageMetaContext = React.createContext<{
  setMeta: (meta: { title: string; crumbs?: Crumb[] }) => void;
}>({ setMeta: () => {} });

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [meta, setMeta] = React.useState<{ title: string; crumbs?: Crumb[] }>({
    title: "Dashboard",
  });

  const value = React.useMemo(() => ({ setMeta }), []);

  return (
    <PageMetaContext.Provider value={value}>
      <div className="flex min-h-screen">
        <Sidebar />
        <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header title={meta.title} crumbs={meta.crumbs} onOpenMenu={() => setMenuOpen(true)} />
          <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
        </div>
      </div>
    </PageMetaContext.Provider>
  );
}

/** Each page declares its own header title and breadcrumbs. */
export function usePageMeta(title: string, crumbs?: Crumb[]) {
  const { setMeta } = React.useContext(PageMetaContext);
  const serialised = JSON.stringify(crumbs ?? []);
  React.useEffect(() => {
    setMeta({ title, crumbs: crumbs ?? undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, serialised]);
}

export function PageIntro({
  description,
  actions,
  className,
}: {
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  if (!description && !actions) return null;
  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {description ? (
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-muted">{description}</p>
      ) : (
        <span />
      )}
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
