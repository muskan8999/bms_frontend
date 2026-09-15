"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, LogOut, PanelsTopLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/formatters";
import { currentAdmin } from "@/lib/mock-data";
import { useAppStore } from "@/store/app-store";
import { isActive, navItems } from "@/components/layout/nav-items";
import { Tooltip } from "@/components/ui/tooltip";

export function Sidebar() {
  const pathname = usePathname();
  const { state, updateSettings } = useAppStore();
  const collapsed = state.settings.sidebarCollapsed;

  return (
    <aside
      className={cn(
        "no-print sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex",
        collapsed ? "w-[4.5rem]" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center gap-2.5 border-b border-line px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
          <PanelsTopLeft className="size-4.5" />
        </span>
        {!collapsed ? (
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold leading-tight text-ink">
              BuildRent
            </span>
            <span className="block truncate text-[11.5px] leading-tight text-ink-muted">
              Building material rental
            </span>
          </span>
        ) : null}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
        {navItems.map((item) => {
          const active = isActive(item, pathname);
          const link = (
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9.5 items-center gap-3 rounded-md px-2.5 text-[13.5px] font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-brand-soft text-brand-ink"
                  : "text-ink-soft hover:bg-surface-muted hover:text-ink",
              )}
            >
              <item.icon className={cn("size-4.5 shrink-0", active && "text-brand")} />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );

          return (
            <div key={item.href}>
              {collapsed ? (
                <Tooltip label={item.label} className="w-full">
                  {link}
                </Tooltip>
              ) : (
                link
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-line p-2.5">
        <div
          className={cn(
            "flex items-center gap-3 rounded-md p-2",
            collapsed && "justify-center p-0 py-2",
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[12px] font-semibold text-brand-ink">
            {initials(currentAdmin.name)}
          </span>
          {!collapsed ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink">
                {currentAdmin.name}
              </span>
              <span className="block truncate text-[11.5px] text-ink-muted">
                {currentAdmin.role}
              </span>
            </span>
          ) : null}
          {!collapsed ? (
            <Tooltip label="Sign out" side="top">
              <button
                type="button"
                className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            </Tooltip>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
          className={cn(
            "mt-1 flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-[13px] text-ink-muted hover:bg-surface-muted hover:text-ink",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <ChevronsRight className="size-4.5" />
          ) : (
            <>
              <ChevronsLeft className="size-4.5" />
              Collapse
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
