import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { withAuth } from "../../../lib/auth";
import {
  getCurrentMonthKey,
  getNextDueDate,
  getMaxStage,
} from "../../../lib/spaced-repetition";

export const POST = withAuth(async (req: NextRequest) => {
  const { tweetIds } = await req.json();
  if (!Array.isArray(tweetIds) || tweetIds.length === 0) {
    return NextResponse.json({ error: "tweetIds required" }, { status: 400 });
  }

  const monthKey = getCurrentMonthKey();

  // Record impressions (skip duplicates via upsert)
  for (const tweetId of tweetIds) {
    await prisma.impression.upsert({
      where: {
        tweetId_monthKey: { tweetId, monthKey },
      },
      create: { tweetId, monthKey },
      update: {},
    });
  }

  // Advance SR stage for bookmarked tweets that were due
  const dueBookmarks = await prisma.bookmark.findMany({
    where: {
      tweetId: { in: tweetIds },
      nextDueAt: { lte: new Date() },
      completedAt: null,
    },
  });

  for (const bookmark of dueBookmarks) {
    const newStage = Math.min(bookmark.srStage + 1, getMaxStage());
    const isComplete = newStage > getMaxStage();

    await prisma.bookmark.update({
      where: { id: bookmark.id },
      data: {
        srStage: newStage,
        nextDueAt: isComplete ? bookmark.nextDueAt : getNextDueDate(newStage),
        completedAt: isComplete ? new Date() : null,
      },
    });
  }

  return NextResponse.json({ ok: true, count: tweetIds.length });
});
