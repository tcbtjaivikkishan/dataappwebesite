import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default async function DashboardPage() {
  const db = await getDb();
  const usersCol = db.collection("users");
  const ordersCol = db.collection("orders");

  // ── Stats ─────────────────────────────────────────────────────
  const totalUsers = await usersCol.countDocuments();
  const verifiedUsers = await usersCol.countDocuments({ name: { $exists: true, $nin: [null, ""] } });
  const ghostUsers = totalUsers - verifiedUsers;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const usersToday = await usersCol.countDocuments({ created_at: { $gte: todayStart } });

  const totalOrders = await ordersCol.countDocuments();
  const paidOrders = await ordersCol.countDocuments({ paymentStatus: "paid" });

  // ── Recent Users ──────────────────────────────────────────────
  const recentUsers = await usersCol
    .find({})
    .sort({ created_at: -1 })
    .limit(15)
    .toArray();

  // ── Recent Orders ─────────────────────────────────────────────
  const recentOrders = await ordersCol
    .find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of users and sales data</p>
      </div>

      {/* ── Stats Grid ─────────────────────────────────────── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">👥</div>
          <div className="stat-value">{totalUsers.toLocaleString()}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-value">{verifiedUsers.toLocaleString()}</div>
          <div className="stat-label">Verified Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">👻</div>
          <div className="stat-value">{ghostUsers.toLocaleString()}</div>
          <div className="stat-label">Ghost Users (no name)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">📅</div>
          <div className="stat-value">{usersToday.toLocaleString()}</div>
          <div className="stat-label">New Users Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">🛒</div>
          <div className="stat-value">{totalOrders.toLocaleString()}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">💰</div>
          <div className="stat-value">{paidOrders.toLocaleString()}</div>
          <div className="stat-label">Paid Orders</div>
        </div>
      </div>

      {/* ── Recent Signups ─────────────────────────────────── */}
      <div className="table-container" style={{ marginBottom: 28 }}>
        <div className="table-header">
          <div>
            <span className="table-title">Recent Signups</span>
            <span className="table-count">Last 15</span>
          </div>
          <a href="/users" className="filter-pill" style={{ textDecoration: "none" }}>
            View All →
          </a>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Status</th>
              <th>Zoho</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {recentUsers.map((u: any) => (
              <tr key={u._id.toString()} className="clickable-row" onClick={undefined}>
                <td>
                  <a href={`/users/${u._id.toString()}`} style={{ fontWeight: 600 }}>
                    {u.name || <span style={{ color: "var(--text-muted)" }}>—</span>}
                  </a>
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
                <td>
                  {u.zoho_contact_id ? (
                    <span className="badge synced">✓ Synced</span>
                  ) : (
                    <span className="badge not-synced">Not synced</span>
                  )}
                </td>
                <td style={{ color: "var(--text-secondary)" }}>
                  {u.created_at ? timeAgo(new Date(u.created_at)) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Recent Orders ──────────────────────────────────── */}
      <div className="table-container">
        <div className="table-header">
          <div>
            <span className="table-title">Recent Orders</span>
            <span className="table-count">Last 10</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Items</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.length === 0 ? (
              <tr><td colSpan={6} className="empty-state"><div className="empty-state-text">No orders yet</div></td></tr>
            ) : (
              recentOrders.map((o: any) => (
                <tr key={o._id.toString()}>
                  <td className="phone-text">{o.orderId || o._id.toString().slice(-8)}</td>
                  <td style={{ fontWeight: 600 }}>₹{o.finalAmount?.toLocaleString() || "—"}</td>
                  <td><span className={`badge ${o.orderStatus || "created"}`}>{o.orderStatus || "created"}</span></td>
                  <td><span className={`badge ${o.paymentStatus || "pending"}`}>{o.paymentStatus || "pending"}</span></td>
                  <td>{o.items?.length || 0} items</td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {o.createdAt ? timeAgo(new Date(o.createdAt)) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
