"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";

interface UserRow {
  _id: string;
  name?: string;
  mobile_number: string;
  email?: string;
  zoho_contact_id?: string;
  last_login_at?: string | null;
  created_at?: string | null;
  is_active?: boolean;
  orderCount?: number;
  source?: "app" | "registered";
  state?: string;
  isContacted?: boolean;
  contactedBy?: string;
  contactedAt?: string;
}

interface TeamStats {
  total: number;
  contacted: number;
  byAssignee: Record<string, { total: number; contacted: number }>;
}

const TEAM_COLORS: Record<string, string> = {
  shivani: "#e056a0",
  ritika: "#56b4e0",
  siksha: "#56e0a0",
};

function TeamContent({ assignee }: { assignee: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const page = parseInt(searchParams.get("page") || "1");
  const filter = searchParams.get("filter") || "all";
  const search = searchParams.get("q") || "";

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        filter,
        q: search,
        assignee,
      });
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filter, search, assignee]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const basePath = `/${assignee}`;

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    if (updates.filter || updates.q) params.set("page", "1");
    router.push(`${basePath}?${params}`);
  };

  const toggleContacted = async (user: UserRow, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't navigate to user detail
    const newStatus = !user.isContacted;

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) => (u._id === user._id ? { ...u, isContacted: newStatus } : u))
    );

    // Also update local stats
    setStats((prev) => {
      if (!prev) return prev;
      const currentAssigneeStats = prev.byAssignee[assignee] || { total: 0, contacted: 0 };
      const diff = newStatus ? 1 : -1;
      return {
        ...prev,
        contacted: prev.contacted + diff,
        byAssignee: {
          ...prev.byAssignee,
          [assignee]: {
            ...currentAssigneeStats,
            contacted: Math.max(0, currentAssigneeStats.contacted + diff),
          },
        },
      };
    });

    try {
      setUpdatingId(user._id);
      const res = await fetch("/api/users/contacted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          isContacted: newStatus,
          assignee,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save contacted status");
      }
    } catch (err) {
      console.error("Failed to toggle contacted status:", err);
      // Revert on error
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isContacted: !newStatus } : u))
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const perPage = 30;
  const totalPages = Math.ceil(total / perPage);

  const timeAgo = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const displayName = assignee.charAt(0).toUpperCase() + assignee.slice(1);
  const accentColor = TEAM_COLORS[assignee] || "#6c5ce7";

  const memberStats = stats?.byAssignee[assignee] || { total: 0, contacted: 0 };
  const contactedCount = memberStats.contacted;
  const assignedTotal = memberStats.total || total;
  const pendingCount = Math.max(0, assignedTotal - contactedCount);
  const progressPct = assignedTotal > 0 ? Math.round((contactedCount / assignedTotal) * 100) : 0;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: accentColor,
              display: "inline-block",
              boxShadow: `0 0 10px ${accentColor}80`,
            }}
          />
          {displayName}&apos;s Users
        </h1>
        <p className="page-subtitle">
          {assignedTotal.toLocaleString()} total users assigned to {displayName}
        </p>
      </div>

      {/* ── Progress & Contact Summary Card ──────────────── */}
      <div className="progress-card">
        <div className="progress-header">
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              Contact Progress
            </span>
            <span style={{ marginLeft: 8, fontSize: 12, color: "var(--text-secondary)" }}>
              {contactedCount} of {assignedTotal} contacted ({progressPct}%)
            </span>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
            <span style={{ color: "var(--green-text)", fontWeight: 600 }}>
              ✅ {contactedCount} Contacted
            </span>
            <span style={{ color: "var(--amber)", fontWeight: 600 }}>
              ⏳ {pendingCount} Pending
            </span>
          </div>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${progressPct}%`,
              background: `linear-gradient(90deg, ${accentColor}, var(--green))`,
            }}
          />
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="toolbar">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            placeholder="Search by name, phone, or email..."
            defaultValue={search}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParams({ q: (e.target as HTMLInputElement).value });
              }
            }}
          />
        </div>
        <div className="filter-pills">
          {[
            { key: "all", label: "All" },
            { key: "not-contacted", label: "⏳ Pending Call" },
            { key: "contacted", label: "✅ Contacted" },
            { key: "verified", label: "Verified" },
            { key: "ghost", label: "Ghost" },
            { key: "has-orders", label: "Has Orders" },
            { key: "zoho-synced", label: "Zoho Synced" },
            { key: "registered-only", label: "Flash Only" },
          ].map((f) => (
            <button
              key={f.key}
              className={`filter-pill ${filter === f.key ? "active" : ""}`}
              onClick={() => updateParams({ filter: f.key === "all" ? "" : f.key })}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="table-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Contact Status</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Orders</th>
                  <th>Zoho</th>
                  <th>Last Login</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <div className="empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <div className="empty-state-text">No users found</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u._id}
                      className="clickable-row"
                      onClick={() => router.push(`/users/${u._id}`)}
                    >
                      <td style={{ fontWeight: 600 }}>
                        {u.name || <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td className="phone-text">{u.mobile_number}</td>
                      <td>{u.email || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                      <td>
                        <button
                          type="button"
                          className={`contact-toggle-btn ${u.isContacted ? "contacted" : "pending"}`}
                          disabled={updatingId === u._id}
                          onClick={(e) => toggleContacted(u, e)}
                          title={
                            u.isContacted
                              ? `Marked Contacted${u.contactedBy ? ` by ${u.contactedBy}` : ""}. Click to mark Pending.`
                              : "Click to mark as Contacted"
                          }
                        >
                          {updatingId === u._id ? (
                            "..."
                          ) : u.isContacted ? (
                            <>✓ Contacted</>
                          ) : (
                            <>○ Mark Contacted</>
                          )}
                        </button>
                      </td>
                      <td>
                        {u.source === "registered" ? (
                          <span className="badge registered-source" title={u.state ? `State: ${u.state}` : undefined}>
                            ⚡ Flash
                          </span>
                        ) : (
                          <span className="badge app-source">📱 App</span>
                        )}
                      </td>
                      <td>
                        {u.name ? (
                          <span className="badge verified">● Verified</span>
                        ) : (
                          <span className="badge ghost">● Ghost</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{u.orderCount || 0}</td>
                      <td>
                        {u.zoho_contact_id ? (
                          <span className="badge synced">✓ Synced</span>
                        ) : (
                          <span className="badge not-synced">—</span>
                        )}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {timeAgo(u.last_login_at)}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {timeAgo(u.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* ── Pagination ─────────────────────────────── */}
            <div className="pagination">
              <span className="pagination-info">
                Showing {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}
              </span>
              <div className="pagination-buttons">
                <button
                  className="pagination-btn"
                  disabled={page <= 1}
                  onClick={() => updateParams({ page: String(page - 1) })}
                >
                  ← Prev
                </button>
                <button
                  className="pagination-btn"
                  disabled={page >= totalPages}
                  onClick={() => updateParams({ page: String(page + 1) })}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function TeamPage({ assignee }: { assignee: string }) {
  return (
    <Suspense fallback={<div className="loading-container"><div className="loading-spinner" /></div>}>
      <TeamContent assignee={assignee} />
    </Suspense>
  );
}
