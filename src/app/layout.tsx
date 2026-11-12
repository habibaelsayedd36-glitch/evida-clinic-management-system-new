import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import PwaRegister from "./pwa-register";
import PwaInstallGuide from "./pwa-install-guide";

export const metadata: Metadata = {
  title: "EVIDA | Clinic Management System",
  description:
    "EVIDA clinic management system: admin, doctor and client accounts with appointments, treatment plans, diet plans, medical records, dose tracking and notifications — with strict per-role access control.",
  applicationName: "Evida Clinic",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Evida Clinic" },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], apple: [{ url: "/icon.svg", type: "image/svg+xml" }] },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-sand-50 text-ink antialiased"><PwaRegister />{children}<PwaInstallGuide /></body>
    </html>
  );
}
