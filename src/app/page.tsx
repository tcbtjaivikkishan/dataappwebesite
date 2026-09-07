import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import CopyablePhone from "@/app/components/CopyablePhone";

export const dynamic = "force-dynamic";

// Normalize phone: strip +91/91 prefix, spaces, dashes → last 10 digits
function normalizePhone(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/[^\d]/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

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
  const registeredUsersCol = db.collection("registered_users");

  // ── Stats ─────────────────────────────────────────────────────
  const totalUsers = await usersCol.countDocuments();
  const verifiedUsers = await usersCol.countDocuments({ name: { $exists: true, $nin: [null, ""] } });
  const ghostUsers = totalUsers - verifiedUsers;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const usersToday = await usersCol.countDocuments({ created_at: { $gte: todayStart } });

  const totalOrders = await ordersCol.countDocuments();
  const paidOrders = await ordersCol.countDocuments({ paymentStatus: "paid" });

  // ── Recent Users (merged & deduplicated) ───────────────────
  const recentAppUsers = await usersCol
    .find({})
    .sort({ created_at: -1 })
    .limit(30)
    .toArray();

  const recentRegistered = await registeredUsersCol
    .find({})
    .sort({ submittedAt: -1 })
    .limit(30)
    .toArray();

  // Deduplicate: collect phone numbers from app users
  const appPhones = new Set(
    recentAppUsers.map((u: any) => normalizePhone(u.mobile_number)).filter(Boolean)
  );

  // Merge: app users + registered users whose phone is NOT in app users
  const seenPhonesRecent = new Set<string>();
  const mergedRecent = [
    ...recentAppUsers.map((u: any) => ({
      _id: u._id.toString(),
      name: u.name,
      mobile_number: u.mobile_number,
      email: u.email,
      zoho_contact_id: u.zoho_contact_id,
      created_at: u.created_at,
      source: "app" as const,
    })),
    ...recentRegistered
      .filter((ru: any) => {
        const normPhone = normalizePhone(ru.phoneNumber);
        if (normPhone && appPhones.has(normPhone)) return false;
        if (normPhone && seenPhonesRecent.has(normPhone)) return false;
        seenPhonesRecent.add(normPhone);
        return true;
      })
      .map((ru: any) => ({
        _id: ru._id.toString(),
        name: ru.fullName || undefined,
        mobile_number: ru.phoneNumber,
        email: undefined,
        zoho_contact_id: undefined,
        created_at: ru.submittedAt,
        state: ru.state,
        source: "registered" as const,
      })),
  ]
    .sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db2 = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db2 - da;
    })
    .slice(0, 15);

  const contactedCol = db.collection("user_is_conttacted");
  const contactedDocs = await contactedCol.find({}).toArray();
  const contactedMap = new Map<string, { isContacted: boolean; contactedBy?: string }>();
  for (const doc of contactedDocs) {
    const uid = (doc.userId || doc.userid || doc._id)?.toString();
    const isC = Boolean(doc.isContacted ?? doc.iscontacted ?? false);
    if (uid && isC) {
      contactedMap.set(uid, { isContacted: true, contactedBy: doc.contactedBy });
    }
  }

  const ASSIGNEES = ["shivani", "ritika", "siksha"] as const;
  let rrIdx = 0;
  mergedRecent.forEach((u: any) => {
    const cInfo = contactedMap.get(u._id);
    u.isContacted = cInfo?.isContacted || false;
    if (cInfo?.contactedBy && ASSIGNEES.includes(cInfo.contactedBy as any)) {
      u.assignee = cInfo.contactedBy;
    } else {
      u.assignee = ASSIGNEES[rrIdx % 3];
      rrIdx++;
    }
  });

  // ── Registered Users count (unique, not in app) ────────────
  const allAppPhones = new Set(
    (await usersCol.find({}, { projection: { mobile_number: 1 } }).toArray())
      .map((u: any) => normalizePhone(u.mobile_number))
      .filter(Boolean)
  );
  const allRegistered = await registeredUsersCol
    .find({}, { projection: { phoneNumber: 1 } })
    .toArray();
  const seenPhonesCount = new Set<string>();
  const uniqueRegistered = allRegistered.filter((ru: any) => {
    const normPhone = normalizePhone(ru.phoneNumber);
    if (normPhone && allAppPhones.has(normPhone)) return false;
    if (normPhone && seenPhonesCount.has(normPhone)) return false;
    seenPhonesCount.add(normPhone);
    return true;
  }).length;

  const grandTotal = totalUsers + uniqueRegistered;

  // Contacted statistics
  const totalContacted = contactedDocs.filter((d: any) => Boolean(d.isContacted ?? d.iscontacted)).length;
  const contactedByAssignee: Record<string, number> = { shivani: 0, ritika: 0, siksha: 0 };
  for (const doc of contactedDocs) {
    const isC = Boolean(doc.isContacted ?? doc.iscontacted ?? false);
    if (isC && doc.contactedBy && contactedByAssignee[doc.contactedBy] !== undefined) {
      contactedByAssignee[doc.contactedBy]++;
    }
  }

  // ── All Orders ─────────────────────────────────────────────
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
          <div className="stat-value">{grandTotal.toLocaleString()}</div>
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
        <div className="stat-card">
          <div className="stat-icon amber">📋</div>
          <div className="stat-value">{uniqueRegistered.toLocaleString()}</div>
          <div className="stat-label">Flash Users (unique)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">📞</div>
          <div className="stat-value">{totalContacted.toLocaleString()}</div>
          <div className="stat-label">Total Contacted</div>
        </div>
      </div>

      {/* ── Team Allocation Grid ───────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div className="table-header" style={{ marginBottom: 12 }}>
          <div>
            <span className="table-title">Team User Allocation & Contact Progress</span>
            <span className="table-count">Divided equally ({Math.round(grandTotal / 3).toLocaleString()} each)</span>
          </div>
        </div>
        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <a href="/shivani" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="stat-card" style={{ borderLeft: "4px solid #e056a0" }}>
              <div className="stat-icon" style={{ background: "rgba(224, 86, 160, 0.15)", color: "#e056a0" }}>👤</div>
              <div className="stat-value">{Math.ceil(grandTotal / 3).toLocaleString()}</div>
              <div className="stat-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Shivani</span>
                <span style={{ color: "#e056a0", fontWeight: 600 }}>View Users →</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--green-text)", fontWeight: 500 }}>
                ✅ {contactedByAssignee.shivani} contacted ({Math.round((contactedByAssignee.shivani / Math.ceil(grandTotal / 3)) * 100)}%)
              </div>
            </div>
          </a>
          <a href="/ritika" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="stat-card" style={{ borderLeft: "4px solid #56b4e0" }}>
              <div className="stat-icon" style={{ background: "rgba(86, 180, 224, 0.15)", color: "#56b4e0" }}>👤</div>
              <div className="stat-value">{Math.floor((grandTotal + 1) / 3).toLocaleString()}</div>
              <div className="stat-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Ritika</span>
                <span style={{ color: "#56b4e0", fontWeight: 600 }}>View Users →</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--green-text)", fontWeight: 500 }}>
                ✅ {contactedByAssignee.ritika} contacted ({Math.round((contactedByAssignee.ritika / Math.floor((grandTotal + 1) / 3)) * 100)}%)
              </div>
            </div>
          </a>
          <a href="/siksha" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="stat-card" style={{ borderLeft: "4px solid #56e0a0" }}>
              <div className="stat-icon" style={{ background: "rgba(86, 224, 160, 0.15)", color: "#56e0a0" }}>👤</div>
              <div className="stat-value">{Math.floor(grandTotal / 3).toLocaleString()}</div>
              <div className="stat-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Siksha</span>
                <span style={{ color: "#56e0a0", fontWeight: 600 }}>View Users →</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--green-text)", fontWeight: 500 }}>
                ✅ {contactedByAssignee.siksha} contacted ({Math.round((contactedByAssignee.siksha / Math.floor(grandTotal / 3)) * 100)}%)
              </div>
            </div>
          </a>
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

              <th>Contact</th>
              <th>Source</th>
              <th>Assigned</th>
              <th>Status</th>
              <th>Zoho</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {mergedRecent.map((u: any) => (
              <tr key={u._id} className="clickable-row" onClick={undefined}>
                <td>
                  {u.source === "app" ? (
                    <a href={`/users/${u._id}`} style={{ fontWeight: 600 }}>
                      {u.name || <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </a>
                  ) : (
                    <a href={`/users/${u._id}`} style={{ fontWeight: 600 }}>
                      {u.name || <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </a>
                  )}
                </td>
                <td className="phone-text">
                  <CopyablePhone phone={u.mobile_number} />
                </td>

                <td>
                  {u.isContacted ? (
                    <span className="badge verified">✓ Contacted</span>
                  ) : (
                    <span className="badge not-synced">⏳ Pending</span>
                  )}
                </td>
                <td>
                  {u.source === "registered" ? (
                    <span className="badge registered-source" title={u.state ? `State: ${u.state}` : undefined}>⚡ Flash</span>
                  ) : (
                    <span className="badge app-source">📱 App</span>
                  )}
                </td>
                <td>
                  {u.assignee ? (
                    <a
                      href={`/${u.assignee}`}
                      className={`badge team-${u.assignee}`}
                      style={{ textDecoration: "none" }}
                    >
                      {u.assignee.charAt(0).toUpperCase() + u.assignee.slice(1)}
                    </a>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>—</span>
                  )}
                </td>
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

      {/* ── All Orders ──────────────────────────────────── */}
      <div className="table-container">
        <div className="table-header">
          <div>
            <span className="table-title">All Orders</span>
            <span className="table-count">{recentOrders.length} total</span>
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
              <tr><td colSpan={7} className="empty-state"><div className="empty-state-text">No orders yet</div></td></tr>
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
