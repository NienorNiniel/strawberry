import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { withAuth } from "../../../lib/auth";
import { getCurrentMonthKey } from "../../../lib/spaced-repetition";

const PAGE_SIZE = 50;

export const GET = withAuth(async (req: NextRequest) => {
  const monthKey = getCurrentMonthKey();
  const excludeParam = new URL(req.url).searchParams.get("exclude");
  const excludeIds = new Set(excludeParam ? excludeParam.split(",").filter(Boolean) : []);

  // 1. Get due spaced repetition bookmarks (max 3)
  const dueBookmarks = await prisma.bookmark.findMany({
    where: {
      nextDueAt: { lte: new Date() },
      completedAt: null,
    },
    include: {
      tweet: {
        include: {
          article: { include: { source: true, savedArticle: { select: { id: true } } } },
          bookmark: true,
        },
      },
    },
    take: 3,
  });

  const srTweetIds = new Set(dueBookmarks.map((b) => b.tweetId));
  const allExcludeIds = [...srTweetIds, ...excludeIds];
  const remainingSlots = PAGE_SIZE - srTweetIds.size;

  // 2. Get all sources that have unseen tweets
  const sources = await prisma.source.findMany({
    select: { id: true },
  });

  // 3. Round-robin: fetch a few unseen tweets per source, then interleave
  const perSource = Math.max(3, Math.ceil(remainingSlots / sources.length));
  const unseenBySource = await Promise.all(
    sources.map((s) =>
      prisma.tweet.findMany({
        where: {
          id: { notIn: allExcludeIds },
          article: { sourceId: s.id },
          impressions: { none: { monthKey } },
        },
        include: {
          article: { include: { source: true, savedArticle: { select: { id: true } } } },
          bookmark: true,
        },
        orderBy: { article: { publishedAt: "desc" } },
        take: perSource,
      })
    )
  );

  // Round-robin pick from each source's unseen tweets
  const unseenTweets: typeof unseenBySource[0] = [];
  let added = true;
  let idx = 0;
  while (added && unseenTweets.length < remainingSlots) {
    added = false;
    for (const bucket of unseenBySource) {
      if (idx < bucket.length && unseenTweets.length < remainingSlots) {
        unseenTweets.push(bucket[idx]);
        added = true;
      }
    }
    idx++;
  }

  let allTweets = [
    ...dueBookmarks.map((b) => ({ ...b.tweet, isDueForReview: true })),
    ...unseenTweets.map((t) => ({ ...t, isDueForReview: false })),
  ];

  // 4. Backfill with stalest seen tweets if not enough unseen
  if (allTweets.length < PAGE_SIZE) {
    const existingIds = new Set([...allTweets.map((t) => t.id), ...excludeIds]);
    const backfill = await prisma.tweet.findMany({
      where: {
        id: { notIn: [...existingIds] },
        impressions: { some: {} },
      },
      include: {
        article: { include: { source: true, savedArticle: { select: { id: true } } } },
        bookmark: true,
        impressions: {
          orderBy: { seenAt: "desc" },
          take: 1,
        },
      },
      take: (PAGE_SIZE - allTweets.length) * 3,
    });

    // Sort by oldest last-seen time first
    backfill.sort((a, b) => {
      const aTime = a.impressions[0]?.seenAt?.getTime() ?? 0;
      const bTime = b.impressions[0]?.seenAt?.getTime() ?? 0;
      return aTime - bTime;
    });

    allTweets = [
      ...allTweets,
      ...backfill
        .slice(0, PAGE_SIZE - allTweets.length)
        .map((t) => ({ ...t, isDueForReview: false })),
    ];
  }

  // 5. Shuffle
  for (let i = allTweets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allTweets[i], allTweets[j]] = [allTweets[j], allTweets[i]];
  }

  // 6. Group threads together (keep shuffle order for first tweet of each thread)
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

  // 7. Interleave by source: avoid back-to-back posts from the same source (threads exempt)
  const interleaved: typeof ordered = [];
  const remaining = [...ordered];

  while (remaining.length > 0) {
    const lastSourceId =
      interleaved.length > 0
        ? interleaved[interleaved.length - 1].article.sourceId
        : null;

    let picked = -1;
    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      const isThreadContinuation = item.threadId && item.threadOrder > 0;
      if (isThreadContinuation || item.article.sourceId !== lastSourceId) {
        picked = i;
        break;
      }
    }

    if (picked === -1) picked = 0;
    interleaved.push(remaining.splice(picked, 1)[0]);
  }

  // Cursor: signal more content if we filled the page
  const nextCursor = unseenTweets.length >= remainingSlots ? "more" : null;

  return NextResponse.json({
    tweets: interleaved,
    nextCursor,
  });
});
