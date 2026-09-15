"use client";

import Link from "next/link";
import {  ChevronRight, Menu, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/formatters";
import { currentAdmin } from "@/lib/mock-data";
import { useAppStore } from "@/store/app-store";

export type Crumb = { label: string; href?: string };

export function Header({
  title,
  crumbs,
  onOpenMenu,
}: {
  title: string;
  crumbs?: Crumb[];
  onOpenMenu: () => void;
}) {
  const { state, updateSettings } = useAppStore();
  const isDark = state.settings.theme === "dark";

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="rounded-md p-2 text-ink-soft hover:bg-surface-muted lg:hidden"
        >
          <Menu className="size-5" />
        </button>

        <div className="min-w-0 flex-1">
          {crumbs?.length ? (
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12px] text-ink-muted">
              {crumbs.map((crumb, index) => (
                <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                  {index > 0 ? <ChevronRight className="size-3" /> : null}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-ink">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="truncate text-ink-soft">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          ) : null}
          <h1 className="truncate text-[17px] font-semibold leading-tight text-ink">{title}</h1>
        </div>

        <button
          onClick={() => updateSettings({ theme: isDark ? "light" : "dark" })}
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          className="rounded-md p-2 text-ink-soft hover:bg-surface-muted hover:text-ink"
        >
          {isDark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
        </button>


        <div className={cn("hidden items-center gap-2.5 border-l border-line pl-3 sm:flex")}>
          <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-[12px] font-semibold text-brand-ink">
            {initials(currentAdmin.name)}
          </span>
          <span className="hidden xl:block">
            <span className="block text-[13px] font-medium leading-tight text-ink">
              {currentAdmin.name}
            </span>
            <span className="block text-[11.5px] leading-tight text-ink-muted">
              {currentAdmin.role}
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
