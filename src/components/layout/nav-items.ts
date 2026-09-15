import {
  BarChart3,
  Boxes,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Marks the item active for nested routes too. */
  match?: (pathname: string) => boolean;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/rentals",
    label: "Rentals",
    icon: ClipboardList,
    match: (pathname) => pathname.startsWith("/rentals"),
  },
  {
    href: "/customers",
    label: "Customers",
    icon: Users,
    match: (pathname) => pathname.startsWith("/customers"),
  },
  { href: "/materials", label: "Materials", icon: Boxes },
  { href: "/history", label: "Rental history", icon: History },
  { href: "/bills", label: "Bills", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(item: NavItem, pathname: string) {
  return item.match ? item.match(pathname) : pathname === item.href;
}
