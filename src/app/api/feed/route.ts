import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { withAuth } from "../../../lib/auth";
import { getCurrentMonthKey } from "../../../lib/spaced-repetition";

const PAGE_SIZE = 20;

export const GET = withAuth(async (req: NextRequest) => {
  const monthKey = getCurrentMonthKey();
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");

  // 1. Get due spaced repetition bookmarks (max 3)
  const dueBookmarks = await prisma.bookmark.findMany({
    where: {
      nextDueAt: { lte: new Date() },
      completedAt: null,
    },
    include: {
      tweet: {
        include: {
          article: { include: { source: true } },
          bookmark: true,
        },
      },
    },
    take: 3,
  });

  const srTweetIds = new Set(dueBookmarks.map((b) => b.tweetId));
  const remainingSlots = PAGE_SIZE - srTweetIds.size;

  // 2. Get unseen tweets (no impression for current month)
  const unseenTweets = await prisma.tweet.findMany({
    where: {
      id: { notIn: [...srTweetIds] },
      impressions: { none: { monthKey } },
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    include: {
      article: { include: { source: true } },
      bookmark: true,
    },
    orderBy: { createdAt: "desc" },
    take: remainingSlots,
  });

  let allTweets = [
    ...dueBookmarks.map((b) => ({ ...b.tweet, isDueForReview: true })),
    ...unseenTweets.map((t) => ({ ...t, isDueForReview: false })),
  ];

  // 3. Backfill if not enough unseen tweets
  if (allTweets.length < PAGE_SIZE) {
    const existingIds = new Set(allTweets.map((t) => t.id));
    const backfill = await prisma.tweet.findMany({
      where: {
        id: { notIn: [...existingIds] },
        impressions: {
          some: { monthKey: { not: monthKey } },
          none: { monthKey },
        },
      },
      include: {
        article: { include: { source: true } },
        bookmark: true,
      },
      take: PAGE_SIZE - allTweets.length,
    });
    allTweets = [
      ...allTweets,
      ...backfill.map((t) => ({ ...t, isDueForReview: false })),
    ];
  }

  // 4. Shuffle
  for (let i = allTweets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allTweets[i], allTweets[j]] = [allTweets[j], allTweets[i]];
  }

  // 5. Group threads together (keep shuffle order for first tweet of each thread)
  const threadGroups = new Map<string, typeof allTweets>();
  const ordered: typeof allTweets = [];
  const seen = new Set<string>();

  for (const tweet of allTweets) {
    if (tweet.threadId) {
      if (!threadGroups.has(tweet.threadId)) {
        threadGroups.set(tweet.threadId, []);
      }
      threadGroups.get(tweet.threadId)!.push(tweet);
    }
  }

  // Sort thread tweets by threadOrder
  for (const group of threadGroups.values()) {
    group.sort((a, b) => a.threadOrder - b.threadOrder);
  }

  for (const tweet of allTweets) {
    if (seen.has(tweet.id)) continue;

    if (tweet.threadId && threadGroups.has(tweet.threadId)) {
      const group = threadGroups.get(tweet.threadId)!;
      for (const t of group) {
        if (!seen.has(t.id)) {
          ordered.push(t);
          seen.add(t.id);
        }
      }
    } else {
      ordered.push(tweet);
      seen.add(tweet.id);
    }
  }

  // Compute next cursor
  const nextCursor =
    unseenTweets.length === remainingSlots && unseenTweets.length > 0
      ? unseenTweets[unseenTweets.length - 1].createdAt.toISOString()
      : null;

  return NextResponse.json({
    tweets: ordered,
    nextCursor,
  });
});
