import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { withAuth } from "../../../../../lib/auth";
import { fetchArticlesFromFeed } from "../../../../../lib/sources";
import { generateTweets } from "../../../../../lib/claude";

const MAX_ARTICLES_PER_SYNC = 5;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export const POST = withAuth(async (
  req: NextRequest
) => {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const id = segments[segments.indexOf("sources") + 1];

  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  // Fetch articles from feed
  const feedArticles = await fetchArticlesFromFeed(source.feedUrl);

  // Find which articles we already have
  const existingUrls = new Set(
    (
      await prisma.article.findMany({
        where: { sourceId: source.id },
        select: { url: true },
      })
    ).map((a) => a.url)
  );

  const newArticles = feedArticles.filter((a) => !existingUrls.has(a.url));

  // Process up to MAX_ARTICLES_PER_SYNC new articles
  const batch = newArticles.slice(0, MAX_ARTICLES_PER_SYNC);
  let tweetsGenerated = 0;

  for (const articleData of batch) {
    const plainContent = stripHtml(articleData.content);
    if (plainContent.length < 100) continue;

    const article = await prisma.article.create({
      data: {
        sourceId: source.id,
        url: articleData.url,
        title: articleData.title,
        content: plainContent.slice(0, 20000),
        publishedAt: articleData.publishedAt,
      },
    });

    try {
      const tweets = await generateTweets(article.title, article.content);

      // Generate unique threadIds per article
      const threadIdMap = new Map<string, string>();
      const articleCuid = article.id;

      for (const tweet of tweets) {
        let resolvedThreadId: string | null = null;
        if (tweet.threadId) {
          if (!threadIdMap.has(tweet.threadId)) {
            threadIdMap.set(
              tweet.threadId,
              `${articleCuid}-${threadIdMap.size}`
            );
          }
          resolvedThreadId = threadIdMap.get(tweet.threadId)!;
        }

        await prisma.tweet.create({
          data: {
            articleId: article.id,
            content: tweet.content,
            threadId: resolvedThreadId,
            threadOrder: tweet.threadOrder,
          },
        });
        tweetsGenerated++;
      }
    } catch (e) {
      console.error(`Failed to generate tweets for article ${article.id}:`, e);
    }
  }

  return NextResponse.json({
    articlesProcessed: batch.length,
    tweetsGenerated,
    hasMore: newArticles.length > MAX_ARTICLES_PER_SYNC,
    remainingArticles: Math.max(0, newArticles.length - MAX_ARTICLES_PER_SYNC),
  });
});
