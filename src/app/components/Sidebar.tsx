"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Topbar */}
      <header className="mobile-topbar">
        <Link href="/" className="mobile-topbar-brand">
          <div className="sidebar-logo-icon">T</div>
          <span className="sidebar-logo-text">TCBT Data</span>
        </Link>
        <button
          className="mobile-menu-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </header>

      {/* Backdrop overlay for mobile drawer */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar drawer */}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header-row">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">T</div>
            <span className="sidebar-logo-text">TCBT Data</span>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
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
            <li>
              <Link href="/riya" className={`sidebar-link ${isActive("/riya") ? "active" : ""}`}>
                <span className="team-dot" style={{ background: "#f59e0b" }} />
                Riya
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
    </>
  );
}

