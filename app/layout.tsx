import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HerdWatch Simulator | Jonglei–Bor–Sudd Corridor",
  description:
    "Satellite-powered ethical AI platform for cattle presence heat maps and early-warning simulation. Environmental signal analysis for prevention.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // #region agent log
  if (typeof globalThis !== "undefined") {
    fetch("http://127.0.0.1:7245/ingest/dacdc356-df59-402d-bb7c-df96680bea95", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "layout.tsx:RootLayout:enter",
        message: "layout entered",
        data: { env: typeof window === "undefined" ? "server" : "client" },
        timestamp: Date.now(),
        hypothesisId: "H1",
      }),
    }).catch(() => {});
    fetch("http://127.0.0.1:7245/ingest/dacdc356-df59-402d-bb7c-df96680bea95", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "layout.tsx:RootLayout:beforeReturn",
        message: "layout before return",
        data: {},
        timestamp: Date.now(),
        hypothesisId: "H2",
      }),
    }).catch(() => {});
  }
  // #endregion
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-900 text-gray-200 antialiased">
        {children}
      </body>
    </html>
  );
}
