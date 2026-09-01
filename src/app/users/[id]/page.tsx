import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatDate(dateStr?: string | Date): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();

  let user: any;
  try {
    user = await db.collection("users").findOne({ _id: new ObjectId(id) });
  } catch {
    return (
      <div>
        <Link href="/users" className="back-link">← Back to Users</Link>
        <div className="empty-state">
          <div className="empty-state-icon">❌</div>
          <div className="empty-state-text">Invalid user ID</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <Link href="/users" className="back-link">← Back to Users</Link>
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-text">User not found</div>
        </div>
      </div>
    );
  }

  // ── Fetch orders ────────────────────────────────────────────
  const orders = await db
    .collection("orders")
    .find({ userId: id })
    .sort({ createdAt: -1 })
    .toArray();

  const totalSpent = orders
    .filter((o: any) => o.paymentStatus === "paid")
    .reduce((sum: number, o: any) => sum + (o.finalAmount || 0), 0);

  const initials = user.name
    ? user.name
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <>
      <Link href="/users" className="back-link">← Back to Users</Link>

      {/* ── Hero ────────────────────────────────────────── */}
      <div className="user-hero">
        <div className="user-avatar">{initials}</div>
        <div className="user-hero-info">
          <h1>{user.name || "Unnamed User"}</h1>
          <p>
            {user.mobile_number}
            {user.email ? ` · ${user.email}` : ""}
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {user.name ? (
            <span className="badge verified">● Verified</span>
          ) : (
            <span className="badge ghost">● Ghost</span>
          )}
          {user.zoho_contact_id ? (
            <span className="badge synced">✓ Zoho Synced</span>
          ) : (
            <span className="badge not-synced">Not synced</span>
          )}
        </div>
      </div>

      {/* ── Detail Cards ────────────────────────────────── */}
      <div className="detail-grid">
        {/* Profile Info */}
        <div className="detail-card">
          <div className="detail-card-title">Profile Information</div>
          <div className="detail-row">
            <span className="detail-label">Full Name</span>
            <span className="detail-value">{user.name || "—"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Phone</span>
            <span className="detail-value mono">{user.mobile_number}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Email</span>
            <span className="detail-value">{user.email || "—"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Active</span>
            <span className="detail-value">{user.is_active ? "Yes" : "No"}</span>
          </div>
        </div>

        {/* Meta */}
        <div className="detail-card">
          <div className="detail-card-title">Account Details</div>
          <div className="detail-row">
            <span className="detail-label">User ID</span>
            <span className="detail-value mono">{user._id.toString()}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Created</span>
            <span className="detail-value">{formatDate(user.created_at)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Last Login</span>
            <span className="detail-value">{formatDate(user.last_login_at)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Zoho Contact ID</span>
            <span className="detail-value mono">{user.zoho_contact_id || "—"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">OTP Pending</span>
            <span className="detail-value">{user.otp ? "Yes ⚠️" : "No"}</span>
          </div>
        </div>

        {/* Addresses */}
        <div className="detail-card">
          <div className="detail-card-title">
            Addresses ({user.addresses?.length || 0})
          </div>
          {!user.addresses || user.addresses.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <div className="empty-state-text">No addresses saved</div>
            </div>
          ) : (
            user.addresses.map((addr: any, i: number) => (
              <div className="address-card" key={i}>
                {addr.label && <div className="address-label">{addr.label}</div>}
                <div className="address-text">
                  {addr.receiver_name && <strong>{addr.receiver_name}</strong>}
                  {addr.receiver_phone && <span> ({addr.receiver_phone})</span>}
                  <br />
                  {addr.line1}
                  {addr.line2 ? `, ${addr.line2}` : ""}
                  <br />
                  {addr.city}, {addr.state} - {addr.pincode}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order Summary */}
        <div className="detail-card">
          <div className="detail-card-title">Order Summary</div>
          <div className="detail-row">
            <span className="detail-label">Total Orders</span>
            <span className="detail-value" style={{ fontSize: 18, fontWeight: 800 }}>
              {orders.length}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Total Spent</span>
            <span className="detail-value" style={{ fontSize: 18, fontWeight: 800, color: "var(--green-text)" }}>
              ₹{totalSpent.toLocaleString()}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Paid Orders</span>
            <span className="detail-value">
              {orders.filter((o: any) => o.paymentStatus === "paid").length}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Pending Orders</span>
            <span className="detail-value">
              {orders.filter((o: any) => o.paymentStatus === "pending").length}
            </span>
          </div>
        </div>
      </div>

      {/* ── Orders Table ────────────────────────────────── */}
      {orders.length > 0 && (
        <div className="table-container">
          <div className="table-header">
            <span className="table-title">Order History</span>
            <span className="table-count">{orders.length} orders</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Coupon</th>
                <th>Zoho SO</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o._id.toString()}>
                  <td className="phone-text">{o.orderId || o._id.toString().slice(-8)}</td>
                  <td>
                    <div style={{ maxWidth: 200 }}>
                      {o.items?.map((item: any, i: number) => (
                        <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {item.quantity}× {item.name}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>₹{o.finalAmount?.toLocaleString() || "—"}</td>
                  <td>
                    <span className={`badge ${o.orderStatus || "created"}`}>
                      {o.orderStatus || "created"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${o.paymentStatus || "pending"}`}>
                      {o.paymentStatus || "pending"}
                    </span>
                  </td>
                  <td>
                    {o.couponName ? (
                      <span style={{ color: "var(--accent)", fontWeight: 600, fontSize: 12 }}>
                        {o.couponName} (-₹{o.discount || 0})
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td>
                    {o.zohoSalesOrderId ? (
                      <span className="badge synced">✓</span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    {formatDate(o.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
