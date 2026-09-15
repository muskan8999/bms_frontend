import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppStoreProvider } from "@/store/app-store";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "BuildRent — Building material rental",
  description:
    "Admin dashboard for a building material rental shop: issue material, track what is out, record returns and raise the bill.",
};

export const viewport: Viewport = {
  themeColor: "#124c46",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppStoreProvider>
          <ThemeProvider>
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </ThemeProvider>
        </AppStoreProvider>
      </body>
    </html>
  );
}
