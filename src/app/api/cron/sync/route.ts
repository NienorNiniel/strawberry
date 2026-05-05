import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { fetchArticlesFromFeed, fetchArticlesFromSitemap } from "../../../../lib/sources";
import { generateTweets } from "../../../../lib/claude";

export const maxDuration = 60; // Vercel Hobby max

const MAX_ARTICLES_PER_SOURCE = 3; // Conservative limit to stay within timeout

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

export const GET = async (req: NextRequest) => {
  // Vercel cron auth — checks Authorization header with CRON_SECRET
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sources = await prisma.source.findMany();
  const results: Record<string, { articlesProcessed: number; tweetsGenerated: number }> = {};

  for (const source of sources) {
    try {
      const feedArticles = await fetchArticlesFromFeed(source.feedUrl);

      const existingUrls = new Set(
        (await prisma.article.findMany({
          where: { sourceId: source.id },
          select: { url: true },
        })).map((a) => a.url)
      );

      let newArticles = feedArticles.filter((a) => !existingUrls.has(a.url));

      // Always try sitemap for historical backfill
      try {
        const allKnownUrls = new Set([...existingUrls, ...newArticles.map(a => a.url)]);
        const sitemapArticles = await fetchArticlesFromSitemap(source.feedUrl, allKnownUrls, 100);
        newArticles = [...newArticles, ...sitemapArticles];
      } catch {
        // non-fatal
      }

      const batch = newArticles.slice(0, MAX_ARTICLES_PER_SOURCE);
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
          const threadIdMap = new Map<string, string>();

          for (const tweet of tweets) {
            let resolvedThreadId: string | null = null;
            if (tweet.threadId) {
              if (!threadIdMap.has(tweet.threadId)) {
                threadIdMap.set(tweet.threadId, `${article.id}-${threadIdMap.size}`);
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

      results[source.name] = { articlesProcessed: batch.length, tweetsGenerated };
    } catch (e) {
      console.error(`Failed to sync source ${source.name}:`, e);
      results[source.name] = { articlesProcessed: 0, tweetsGenerated: 0 };
    }
  }

  console.log("Cron sync complete:", JSON.stringify(results));
  return NextResponse.json({ ok: true, results });
};
