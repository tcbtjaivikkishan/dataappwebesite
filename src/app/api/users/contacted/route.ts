import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, isContacted, assignee, remark } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = await getDb();
    const contactedCol = db.collection("user_is_conttacted");

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

    const setFields: Record<string, any> = {
      userId: userId.toString(),
      userid: userId.toString(),
      updatedAt: now,
    };

    if (isContacted !== undefined) {
      const isContactedBool = Boolean(isContacted);
      setFields.isContacted = isContactedBool;
      setFields.iscontacted = isContactedBool;
    }

    if (assignee !== undefined) {
      setFields.contactedBy = assignee;
    }

    if (remark !== undefined) {
      setFields.remark = typeof remark === "string" ? remark.trim() : "";
    }

    await contactedCol.updateOne(
      { $or: orConditions },
      {
        $set: setFields,
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      userId: userId.toString(),
      ...(isContacted !== undefined ? { isContacted: Boolean(isContacted) } : {}),
      ...(assignee !== undefined ? { contactedBy: assignee } : {}),
      ...(remark !== undefined ? { remark: typeof remark === "string" ? remark.trim() : "" } : {}),
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
