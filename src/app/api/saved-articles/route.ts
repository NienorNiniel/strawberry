import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { withAuth } from "../../../lib/auth";

export const GET = withAuth(async () => {
  const saved = await prisma.savedArticle.findMany({
    include: {
      article: {
        include: { source: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(saved);
});

export const POST = withAuth(async (req: NextRequest) => {
  const { articleId } = await req.json();
  if (!articleId) {
    return NextResponse.json({ error: "articleId is required" }, { status: 400 });
  }

  const existing = await prisma.savedArticle.findUnique({
    where: { articleId },
  });

  if (existing) {
    // Toggle off — unsave
    await prisma.savedArticle.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  }

  await prisma.savedArticle.create({
    data: { articleId },
  });
  return NextResponse.json({ saved: true });
});
