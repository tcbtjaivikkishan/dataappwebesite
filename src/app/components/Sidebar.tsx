"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">T</div>
        <span className="sidebar-logo-text">TCBT Data</span>
      </div>

      <nav>
        <ul className="sidebar-nav">
          <li>
            <Link href="/" className={`sidebar-link ${isActive("/") ? "active" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Dashboard
            </Link>
          </li>
          <li>
            <Link href="/users" className={`sidebar-link ${isActive("/users") ? "active" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Users
            </Link>
          </li>
        </ul>

        <div className="sidebar-section-label">Team</div>
        <ul className="sidebar-nav">
          <li>
            <Link href="/shivani" className={`sidebar-link ${isActive("/shivani") ? "active" : ""}`}>
              <span className="team-dot" style={{ background: "#e056a0" }} />
              Shivani
            </Link>
          </li>
          <li>
            <Link href="/ritika" className={`sidebar-link ${isActive("/ritika") ? "active" : ""}`}>
              <span className="team-dot" style={{ background: "#56b4e0" }} />
              Ritika
            </Link>
          </li>
          <li>
            <Link href="/siksha" className={`sidebar-link ${isActive("/siksha") ? "active" : ""}`}>
              <span className="team-dot" style={{ background: "#56e0a0" }} />
              Siksha
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
