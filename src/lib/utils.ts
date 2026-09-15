import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Short, human-readable ids for mock records (REN-1042, CUS-0007, ...). */
export function makeId(prefix: string, seq: number, pad = 4) {
  return `${prefix}-${String(seq).padStart(pad, "0")}`;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
