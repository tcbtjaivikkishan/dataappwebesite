import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/app/components/Sidebar";

export const metadata: Metadata = {
  title: "TCBT Sales Dashboard",
  description: "Internal sales team dashboard — user data & analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
