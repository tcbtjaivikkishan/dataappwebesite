import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const filter = searchParams.get("filter") || "all";
  const q = (searchParams.get("q") || "").trim();
  const perPage = 30;
  const skip = (page - 1) * perPage;

  const db = await getDb();
  const usersCol = db.collection("users");
  const ordersCol = db.collection("orders");

  // ── Build query ──────────────────────────────────────────────
  const query: any = {};

  if (filter === "verified") {
    query.name = { $exists: true, $nin: [null, ""] };
  } else if (filter === "ghost") {
    query.$or = [
      { name: { $exists: false } },
      { name: null },
      { name: "" },
    ];
  } else if (filter === "zoho-synced") {
    query.zoho_contact_id = { $exists: true, $ne: null };
  }

  if (q) {
    const regex = { $regex: q, $options: "i" };
    const searchConditions = [
      { name: regex },
      { mobile_number: regex },
      { email: regex },
    ];

    if (query.$or) {
      // Combine existing $or with search
      query.$and = [{ $or: query.$or }, { $or: searchConditions }];
      delete query.$or;
    } else {
      query.$or = searchConditions;
    }
  }

  // ── Fetch users ──────────────────────────────────────────────
  const [users, total] = await Promise.all([
    usersCol.find(query).sort({ created_at: -1 }).skip(skip).limit(perPage).toArray(),
    usersCol.countDocuments(query),
  ]);

  // ── Enrich with order counts ─────────────────────────────────
  const userIds = users.map((u) => u._id.toString());

  let orderCounts: Record<string, number> = {};

  if (userIds.length > 0) {
    // "has-orders" filter: only show users that have orders
    if (filter === "has-orders") {
      const pipeline = [
        { $group: { _id: "$userId", count: { $sum: 1 } } },
        { $match: { count: { $gt: 0 } } },
      ];
      const agg = await ordersCol.aggregate(pipeline).toArray();
      const userIdsWithOrders = new Set(agg.map((a: any) => a._id));
      orderCounts = {};
      for (const a of agg) {
        orderCounts[a._id] = a.count;
      }

      // Re-fetch with filter
      const filteredQuery = { ...query };
      delete filteredQuery.$or;
      const usersWithOrders = await usersCol
        .find({ _id: { $in: users.filter((u) => userIdsWithOrders.has(u._id.toString())).map((u) => u._id) } })
        .sort({ created_at: -1 })
        .toArray();

      const enriched = usersWithOrders.map((u: any) => ({
        _id: u._id.toString(),
        name: u.name,
        mobile_number: u.mobile_number,
        email: u.email,
        zoho_contact_id: u.zoho_contact_id,
        last_login_at: u.last_login_at,
        created_at: u.created_at,
        is_active: u.is_active,
        orderCount: orderCounts[u._id.toString()] || 0,
      }));

      return NextResponse.json({ users: enriched, total: enriched.length });
    }

    // Normal enrichment
    const orderAgg = await ordersCol
      .aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ])
      .toArray();

    for (const a of orderAgg) {
      orderCounts[a._id] = a.count;
    }
  }

  const enriched = users.map((u: any) => ({
    _id: u._id.toString(),
    name: u.name,
    mobile_number: u.mobile_number,
    email: u.email,
    zoho_contact_id: u.zoho_contact_id,
    last_login_at: u.last_login_at,
    created_at: u.created_at,
    is_active: u.is_active,
    orderCount: orderCounts[u._id.toString()] || 0,
  }));

  return NextResponse.json({ users: enriched, total });
}
