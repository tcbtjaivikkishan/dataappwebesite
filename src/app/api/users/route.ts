import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// Normalize phone: strip +91/91 prefix, spaces, dashes → last 10 digits
function normalizePhone(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/[^\d]/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

const ASSIGNEES = ["shivani", "ritika", "siksha"] as const;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const filter = searchParams.get("filter") || "all";
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const assignee = searchParams.get("assignee") || "";
  const perPage = 30;

  const db = await getDb();
  const usersCol = db.collection("users");
  const ordersCol = db.collection("orders");
  const registeredUsersCol = db.collection("registered_users");
  const contactedCol = db.collection("user_is_conttacted");

  // 1. Fetch app users, registered users, orders and contacted status in parallel
  const [appUsers, registeredUsers, orderAgg, contactedDocs] = await Promise.all([
    usersCol.find({}).sort({ created_at: -1 }).toArray(),
    registeredUsersCol.find({}).sort({ submittedAt: -1 }).toArray(),
    ordersCol
      .aggregate([
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ])
      .toArray(),
    contactedCol.find({}).toArray(),
  ]);

  // Build contacted map (supports userId, userid, and _id)
  const contactedMap = new Map<
    string,
    { isContacted: boolean; contactedBy?: string; updatedAt?: string }
  >();
  for (const doc of contactedDocs) {
    const uid = (doc.userId || doc.userid || doc._id)?.toString();
    const isC = Boolean(doc.isContacted ?? doc.iscontacted ?? false);
    if (uid) {
      contactedMap.set(uid, {
        isContacted: isC,
        contactedBy: doc.contactedBy || doc.assignee,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
      });
    }
  }

  // Order counts lookup
  const orderCounts: Record<string, number> = {};
  for (const a of orderAgg) {
    orderCounts[a._id] = a.count;
  }

  // 2. Build set of normalized phones from app users for deduplication
  const appPhones = new Set<string>();
  for (const u of appUsers) {
    const p = normalizePhone(u.mobile_number);
    if (p) appPhones.add(p);
  }

  // 3. Map app users
  const merged: any[] = appUsers.map((u: any) => {
    const uid = u._id.toString();
    const cInfo = contactedMap.get(uid);
    return {
      _id: uid,
      name: u.name || undefined,
      mobile_number: u.mobile_number,
      email: u.email || undefined,
      zoho_contact_id: u.zoho_contact_id || undefined,
      last_login_at: u.last_login_at ? new Date(u.last_login_at).toISOString() : null,
      created_at: u.created_at ? new Date(u.created_at).toISOString() : null,
      is_active: u.is_active,
      source: "app" as const,
      orderCount: orderCounts[uid] || 0,
      isContacted: cInfo ? cInfo.isContacted : false,
      contactedBy: cInfo?.contactedBy,
      contactedAt: cInfo?.updatedAt,
    };
  });

  // 4. Merge registered_users (excluding duplicates present in app users or within registered_users)
  const seenRegisteredPhones = new Set<string>();
  for (const ru of registeredUsers) {
    const p = normalizePhone(ru.phoneNumber);
    if (p && appPhones.has(p)) continue;
    if (p && seenRegisteredPhones.has(p)) continue;
    if (p) seenRegisteredPhones.add(p);

    const ruid = ru._id.toString();
    const cInfo = contactedMap.get(ruid);

    merged.push({
      _id: ruid,
      name: ru.fullName || undefined,
      mobile_number: ru.phoneNumber,
      email: undefined,
      zoho_contact_id: undefined,
      last_login_at: null,
      created_at: ru.submittedAt ? new Date(ru.submittedAt).toISOString() : null,
      is_active: undefined,
      state: ru.state,
      source: "registered" as const,
      orderCount: 0,
      isContacted: cInfo ? cInfo.isContacted : false,
      contactedBy: cInfo?.contactedBy,
      contactedAt: cInfo?.updatedAt,
    });
  }

  // 5. Sort master list by created_at descending
  merged.sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    return db - da;
  });

  // 6. Assign every user equally to shivani, ritika, siksha in round-robin order
  merged.forEach((u, index) => {
    u.assignee = ASSIGNEES[index % 3];
  });

  // 7. Calculate overall stats before filtering
  const stats = {
    total: merged.length,
    contacted: merged.filter((u) => u.isContacted).length,
    byAssignee: {
      shivani: {
        total: merged.filter((u) => u.assignee === "shivani").length,
        contacted: merged.filter((u) => u.assignee === "shivani" && u.isContacted).length,
      },
      ritika: {
        total: merged.filter((u) => u.assignee === "ritika").length,
        contacted: merged.filter((u) => u.assignee === "ritika" && u.isContacted).length,
      },
      siksha: {
        total: merged.filter((u) => u.assignee === "siksha").length,
        contacted: merged.filter((u) => u.assignee === "siksha" && u.isContacted).length,
      },
    },
  };

  // 8. Apply assignee filter if requested
  let filtered = merged;
  if (assignee && ASSIGNEES.includes(assignee as any)) {
    filtered = filtered.filter((u) => u.assignee === assignee);
  }

  // 9. Apply status/source/contacted filter
  if (filter === "contacted") {
    filtered = filtered.filter((u) => u.isContacted);
  } else if (filter === "not-contacted") {
    filtered = filtered.filter((u) => !u.isContacted);
  } else if (filter === "verified") {
    filtered = filtered.filter((u) => u.name && u.name.trim().length > 0);
  } else if (filter === "ghost") {
    filtered = filtered.filter((u) => !u.name || u.name.trim().length === 0);
  } else if (filter === "zoho-synced") {
    filtered = filtered.filter((u) => Boolean(u.zoho_contact_id));
  } else if (filter === "has-orders") {
    filtered = filtered.filter((u) => u.orderCount > 0);
  } else if (filter === "registered-only") {
    filtered = filtered.filter((u) => u.source === "registered");
  }

  // 10. Apply search query
  if (q) {
    filtered = filtered.filter((u) => {
      const nameMatch = u.name && u.name.toLowerCase().includes(q);
      const phoneMatch = u.mobile_number && u.mobile_number.includes(q);
      const emailMatch = u.email && u.email.toLowerCase().includes(q);
      return nameMatch || phoneMatch || emailMatch;
    });
  }

  // 11. Paginate
  const total = filtered.length;
  const skip = (page - 1) * perPage;
  const paginated = filtered.slice(skip, skip + perPage);

  return NextResponse.json({ users: paginated, total, stats });
}
