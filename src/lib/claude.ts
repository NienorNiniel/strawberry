import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You extract interesting, surprising, or useful facts from articles and write them as tweets (max 280 characters each).

Rules:
- Each tweet must be under 280 characters. This is a hard limit.
- Write 5-8 tweets from this article.
- About 80% should be standalone single tweets. About 20% should be part of a short thread (2-3 tweets that flow together).
- Be direct, casual, and informative. Write like a smart friend sharing something cool they learned.
- Focus on specific facts, counterintuitive insights, practical tips, or surprising numbers.
- DO NOT use any of these phrases or patterns: "Did you know", "Here's the thing", "Let me explain", "Thread:", "It turns out", "Turns out", "Actually,", "Fun fact:", "Hot take:", "Unpopular opinion:", "PSA:", "Reminder:", "Important:", "Breaking:"
- DO NOT use hashtags or emojis.
- DO NOT start tweets with "So" or "Basically"
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

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

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
