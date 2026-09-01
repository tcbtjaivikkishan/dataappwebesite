"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";

interface UserRow {
  _id: string;
  name?: string;
  mobile_number: string;
  email?: string;
  zoho_contact_id?: string;
  last_login_at?: string;
  created_at?: string;
  is_active?: boolean;
  orderCount?: number;
}

function UsersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const page = parseInt(searchParams.get("page") || "1");
  const filter = searchParams.get("filter") || "all";
  const search = searchParams.get("q") || "";

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), filter, q: search });
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    if (updates.filter || updates.q) params.set("page", "1");
    router.push(`/users?${params}`);
  };

  const perPage = 30;
  const totalPages = Math.ceil(total / perPage);

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return "—";
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <p className="page-subtitle">{total.toLocaleString()} total users in database</p>
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
            { key: "verified", label: "Verified" },
            { key: "ghost", label: "Ghost" },
            { key: "has-orders", label: "Has Orders" },
            { key: "zoho-synced", label: "Zoho Synced" },
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
                    <td colSpan={8}>
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

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="loading-container"><div className="loading-spinner" /></div>}>
      <UsersContent />
    </Suspense>
  );
}
