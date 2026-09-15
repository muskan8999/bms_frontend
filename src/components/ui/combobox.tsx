"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Extra text matched against the query but shown as a secondary line. */
  hint?: string;
  right?: React.ReactNode;
  disabled?: boolean;
  keywords?: string;
};

type ComboboxProps = {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  footer?: (query: string, close: () => void) => React.ReactNode;
  id?: string;
  invalid?: boolean;
  className?: string;
  /** Clear the query and keep the list open after choosing — handy for adding rows. */
  keepOpenOnSelect?: boolean;
};

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Type to search",
  emptyMessage = "Nothing matches that search.",
  footer,
  id,
  invalid,
  className,
  keepOpenOnSelect = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlight, setHighlight] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const selected = options.find((option) => option.value === value);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) =>
      `${option.label} ${option.hint ?? ""} ${option.keywords ?? ""}`.toLowerCase().includes(q),
    );
  }, [options, query]);

  React.useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  React.useEffect(() => {
    if (!open) return;
    const onClickAway = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  React.useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 10);
    else setQuery("");
  }, [open]);

  React.useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const choose = (option: ComboboxOption) => {
    if (option.disabled) return;
    onChange(option.value);
    if (keepOpenOnSelect) {
      setQuery("");
      inputRef.current?.focus();
    } else {
      setOpen(false);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((current) => Math.min(current + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[highlight];
      if (option) choose(option);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-surface px-3 text-left text-sm transition-colors",
          "hover:border-line-strong focus-visible:ring-2 focus-visible:ring-brand/20",
          invalid ? "border-danger" : "border-line-strong",
          selected ? "text-ink" : "text-ink-muted",
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-ink-muted" />
      </button>

      {open ? (
        <div className="animate-pop absolute z-40 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-xl">
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search className="size-4 shrink-0 text-ink-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="h-9 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
            />
          </div>

          <ul ref={listRef} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-[13px] text-ink-muted">{emptyMessage}</li>
            ) : (
              filtered.map((option, index) => (
                <li key={option.value} data-index={index}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    disabled={option.disabled}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => choose(option)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-sm",
                      index === highlight ? "bg-surface-muted" : "",
                      option.disabled ? "cursor-not-allowed opacity-45" : "",
                    )}
                  >
                    <Check
                      className={cn(
                        "size-4 shrink-0 text-brand",
                        option.value === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ink">{option.label}</span>
                      {option.hint ? (
                        <span className="block truncate text-[12px] text-ink-muted">
                          {option.hint}
                        </span>
                      ) : null}
                    </span>
                    {option.right ? <span className="shrink-0">{option.right}</span> : null}
                  </button>
                </li>
              ))
            )}
          </ul>

          {footer ? (
            <div className="border-t border-line p-1.5">{footer(query, () => setOpen(false))}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
