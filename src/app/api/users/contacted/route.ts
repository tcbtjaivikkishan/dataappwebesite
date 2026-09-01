import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, isContacted, assignee } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = await getDb();
    const contactedCol = db.collection("user_is_conttacted");

    const isContactedBool = Boolean(isContacted);
    const now = new Date();

    // Support both string and ObjectId match
    const orConditions: any[] = [
      { userId: userId.toString() },
      { userid: userId.toString() },
    ];
    try {
      orConditions.push({ userId: new ObjectId(userId) });
      orConditions.push({ userid: new ObjectId(userId) });
    } catch {
      // Not a valid ObjectId, string query is sufficient
    }

    const updateResult = await contactedCol.updateOne(
      { $or: orConditions },
      {
        $set: {
          userId: userId.toString(),
          userid: userId.toString(),
          isContacted: isContactedBool,
          iscontacted: isContactedBool,
          contactedBy: assignee || undefined,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      userId: userId.toString(),
      isContacted: isContactedBool,
      contactedBy: assignee,
      updatedAt: now.toISOString(),
    });
  } catch (err: any) {
    console.error("Failed to update contacted status:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
