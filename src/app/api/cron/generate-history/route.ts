import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import OpenAI from "openai";

export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export const GET = async (req: NextRequest) => {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find the British History source
  const source = await prisma.source.findFirst({
    where: { name: "British History" },
  });
  if (!source) {
    return NextResponse.json({ error: "British History source not found" }, { status: 404 });
  }

  // Get all existing article titles to avoid repeating topics
  const existingArticles = await prisma.article.findMany({
    where: { sourceId: source.id },
    select: { title: true },
  });
  const existingTopics = existingArticles.map((a) => a.title).join("\n");

  // Ask the LLM to generate 5 new British History facts
  const response = await openai.chat.completions.create({
    model: "google/gemini-3-flash-preview",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You write tweet-style British History facts — punchy, surprising, and educational. Each fact should be something a curious person would want to share with a friend.

Generate exactly 5 new British history topics. For each topic, write 1–2 tweets:
- If 1 tweet: a standalone fact (max 280 chars).
- If 2 tweets: a short thread where tweet 1 sets the scene and tweet 2 delivers the payoff or continuation.

Rules:
- Each tweet must be under 280 characters.
- Be direct, casual, and specific. Concrete numbers and dates are good.
- Include a memory hook or surprising angle where natural.
- DO NOT use phrases like "Did you know", "Fun fact:", hashtags, or emojis.
- Cover a wide range of British history — ancient, medieval, Tudor, Empire, 20th century, etc.
- Avoid topics already covered (listed below).

Already covered topics (do not repeat these):
${existingTopics}

Return ONLY valid JSON in this exact format:
{
  "items": [
    {
      "title": "Short descriptive title for this topic",
      "tweets": ["single tweet text"]
    },
    {
      "title": "Another topic title",
      "tweets": ["first tweet in thread", "second tweet in thread"]
    }
  ]
}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "Failed to parse LLM response" }, { status: 500 });
  }

  let items: Array<{ title: string; tweets: string[] }>;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    items = parsed.items;
  } catch {
    return NextResponse.json({ error: "Invalid JSON from LLM" }, { status: 500 });
  }

  let articlesCreated = 0;
  let tweetsCreated = 0;

  for (const item of items) {
    if (!item.title || !item.tweets?.length) continue;

    const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
    const url = `internal://british-history/${slug}-${Date.now()}`;

    const article = await prisma.article.create({
      data: {
        sourceId: source.id,
        url,
        title: item.title,
        content: "",
        publishedAt: new Date(),
      },
    });
    articlesCreated++;

    if (item.tweets.length === 1) {
      await prisma.tweet.create({
        data: {
          articleId: article.id,
          content: item.tweets[0].slice(0, 280),
          threadId: null,
          threadOrder: 0,
        },
      });
      tweetsCreated++;
    } else {
      const threadId = crypto.randomUUID();
      for (let i = 0; i < item.tweets.length; i++) {
        await prisma.tweet.create({
          data: {
            articleId: article.id,
            content: item.tweets[i].slice(0, 280),
            threadId,
            threadOrder: i,
          },
        });
        tweetsCreated++;
      }
    }
  }

  return NextResponse.json({ articlesCreated, tweetsCreated });
};
