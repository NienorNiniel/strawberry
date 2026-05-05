import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

interface GeneratedTweet {
  content: string;
  threadId: string | null;
  threadOrder: number;
}

export async function generateTweets(
  title: string,
  articleContent: string
): Promise<GeneratedTweet[]> {
  const truncated = articleContent.slice(0, 12000);

  const response = await openai.chat.completions.create({
    model: "google/gemini-3-flash-preview",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You extract the most interesting facts and insights from articles and write them as tweets (max 280 characters each).

Every tweet must be one of two types:
1. FUN FACT — a specific, surprising, or little-known fact from the article. Something someone would want to repeat to a friend.
2. KEY INSIGHT — a core argument or takeaway from the article, stated with enough context to stand alone. Include the "so what" — why it matters or what it changes.

Rules:
- Each tweet must be under 280 characters. This is a hard limit.
- Write 5-8 tweets from this article.
- Up to 50% can be threads (2-3 tweets that flow together). The rest are standalone.
- IMPORTANT: Every standalone tweet must make complete sense to someone who hasn't read the article. If a fact needs context to understand (who is "she"? what summit? what infrastructure?), it MUST be a thread where the first tweet gives the context and the second delivers the point. Never use pronouns or references that assume the reader knows the article.
- Each tweet must be self-contained and feel complete. No "setting the scene" — every single tweet should deliver a payoff. If a tweet doesn't contain a fact or insight, cut it.
- Be direct, casual, and informative. Write like a smart friend sharing something cool they learned.
- Focus on specific facts, counterintuitive insights, practical tips, or surprising numbers.
- DO NOT use any of these phrases or patterns: "Did you know", "Here's the thing", "Let me explain", "Thread:", "It turns out", "Turns out", "Actually,", "Fun fact:", "Hot take:", "Unpopular opinion:", "PSA:", "Reminder:", "Important:", "Breaking:"
- DO NOT use hashtags or emojis.
- DO NOT start tweets with "So" or "Basically"
- DO NOT write introductory or scene-setting tweets. No "X is a topic people don't talk about enough" or "Most people think X but..." without immediately following with the actual point.
- Vary your sentence structures. Mix short punchy statements with slightly longer ones.

Return ONLY valid JSON in this exact format:
{
  "tweets": [
    {"content": "tweet text here", "threadId": null, "threadOrder": 0},
    {"content": "first tweet in a thread", "threadId": "thread-1", "threadOrder": 0},
    {"content": "second tweet in thread", "threadId": "thread-1", "threadOrder": 1}
  ]
}

Article title: ${title}

Article content:
${truncated}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content || "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const tweets: GeneratedTweet[] = parsed.tweets
      .filter(
        (t: { content: string }) =>
          t.content && t.content.length > 0 && t.content.length <= 280
      )
      .map((t: { content: string; threadId?: string; threadOrder?: number }) => ({
        content: t.content,
        threadId: t.threadId || null,
        threadOrder: t.threadOrder || 0,
      }));
    return tweets;
  } catch {
    return [];
  }
}
