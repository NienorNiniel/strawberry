import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { withAuth } from "../../../lib/auth";
import { resolveSourceUrl } from "../../../lib/sources";

export const GET = withAuth(async () => {
  const sources = await prisma.source.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { articles: true } },
    },
  });
  return NextResponse.json(sources);
});

export const POST = withAuth(async (req: NextRequest) => {
  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const resolved = await resolveSourceUrl(url);

    const existing = await prisma.source.findUnique({
      where: { url: resolved.feedUrl },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Source already added", source: existing },
        { status: 409 }
      );
    }

    const source = await prisma.source.create({
      data: {
        url: url.trim(),
        name: resolved.name,
        type: resolved.type,
        feedUrl: resolved.feedUrl,
        iconUrl: resolved.iconUrl,
      },
    });

    return NextResponse.json(source, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to resolve source";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});

export const DELETE = withAuth(async (req: NextRequest) => {
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }
  await prisma.source.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
