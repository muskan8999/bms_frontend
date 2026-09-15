"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { LogOut, PanelsTopLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/formatters";
import { currentAdmin } from "@/lib/mock-data";
import { isActive, navItems } from "@/components/layout/nav-items";

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // Close the drawer whenever navigation lands somewhere new.
  React.useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="no-print fixed inset-0 z-50 lg:hidden">
      <div className="animate-fade absolute inset-0 bg-ink/45" onClick={onClose} aria-hidden />
      <div className="animate-slide-left relative flex h-full w-[17rem] flex-col border-r border-line bg-surface">
        <div className="flex h-16 items-center justify-between gap-2 border-b border-line px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-white">
              <PanelsTopLeft className="size-4.5" />
            </span>
            <span>
              <span className="block text-[15px] font-semibold leading-tight text-ink">
                BuildRent
              </span>
              <span className="block text-[11.5px] leading-tight text-ink-muted">
                Building material rental
              </span>
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink"
          >
            <X className="size-4.5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
          {navItems.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md px-2.5 text-sm font-medium",
                  active
                    ? "bg-brand-soft text-brand-ink"
                    : "text-ink-soft hover:bg-surface-muted hover:text-ink",
                )}
              >
                <item.icon className={cn("size-4.5", active && "text-brand")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 border-t border-line p-4">
          <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-[12px] font-semibold text-brand-ink">
            {initials(currentAdmin.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">
              {currentAdmin.name}
            </span>
            <span className="block truncate text-[11.5px] text-ink-muted">{currentAdmin.role}</span>
          </span>
          <button
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
