import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { withAuth } from "../../../lib/auth";

export const GET = withAuth(async () => {
  const bookmarks = await prisma.bookmark.findMany({
    where: { completedAt: null },
    include: {
      tweet: {
        include: {
          article: { include: { source: true } },
        },
      },
    },
    orderBy: { nextDueAt: "asc" },
  });

  return NextResponse.json(
    bookmarks.map((b) => ({
      ...b,
      tweet: {
        ...b.tweet,
        isDueForReview: new Date(b.nextDueAt) <= new Date(),
        bookmark: { id: b.id, srStage: b.srStage },
      },
    }))
  );
});
