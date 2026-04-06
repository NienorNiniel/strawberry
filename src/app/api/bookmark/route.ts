import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { withAuth } from "../../../lib/auth";
import { getNextDueDate } from "../../../lib/spaced-repetition";

export const POST = withAuth(async (req: NextRequest) => {
  const { tweetId } = await req.json();
  if (!tweetId) {
    return NextResponse.json(
      { error: "tweetId is required" },
      { status: 400 }
    );
  }

  const existing = await prisma.bookmark.findUnique({
    where: { tweetId },
  });

  if (existing) {
    // Toggle off — remove bookmark
    await prisma.bookmark.delete({ where: { tweetId } });
    return NextResponse.json({ bookmarked: false });
  }

  // Create bookmark with SR stage 0
  const bookmark = await prisma.bookmark.create({
    data: {
      tweetId,
      srStage: 0,
      nextDueAt: getNextDueDate(0),
    },
  });

  return NextResponse.json({ bookmarked: true, bookmark });
});
