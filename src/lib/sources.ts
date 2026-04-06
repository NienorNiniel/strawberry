import Parser from "rss-parser";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "Strawberry/1.0 (RSS Reader)",
  },
});

export interface ResolvedSource {
  name: string;
  feedUrl: string;
  type: "SUBSTACK" | "RSS";
}

export async function resolveSourceUrl(url: string): Promise<ResolvedSource> {
  const trimmed = url.trim().replace(/\/+$/, "");

  // Case 1: Substack profile URL like https://substack.com/@handle
  const profileMatch = trimmed.match(
    /^https?:\/\/substack\.com\/@([\w-]+)/
  );
  if (profileMatch) {
    return resolveSubstackProfile(trimmed);
  }

  // Case 2: Substack publication URL like https://name.substack.com
  const pubMatch = trimmed.match(
    /^https?:\/\/([\w-]+)\.substack\.com/
  );
  if (pubMatch) {
    const feedUrl = `https://${pubMatch[1]}.substack.com/feed`;
    const feed = await parser.parseURL(feedUrl);
    return {
      name: feed.title || pubMatch[1],
      feedUrl,
      type: "SUBSTACK",
    };
  }

  // Case 3: Direct RSS/XML feed URL
  if (
    trimmed.endsWith(".xml") ||
    trimmed.endsWith("/feed") ||
    trimmed.endsWith("/rss") ||
    trimmed.endsWith("/atom")
  ) {
    const feed = await parser.parseURL(trimmed);
    return {
      name: feed.title || new URL(trimmed).hostname,
      feedUrl: trimmed,
      type: "RSS",
    };
  }

  // Case 4: Try common feed paths
  const feedPaths = ["/feed", "/feed.xml", "/rss", "/rss.xml", "/atom.xml"];
  for (const path of feedPaths) {
    try {
      const candidate = trimmed + path;
      const feed = await parser.parseURL(candidate);
      if (feed.items && feed.items.length > 0) {
        return {
          name: feed.title || new URL(trimmed).hostname,
          feedUrl: candidate,
          type: "RSS",
        };
      }
    } catch {
      continue;
    }
  }

  // Case 5: Try the URL itself as a feed
  try {
    const feed = await parser.parseURL(trimmed);
    if (feed.items && feed.items.length > 0) {
      return {
        name: feed.title || new URL(trimmed).hostname,
        feedUrl: trimmed,
        type: "RSS",
      };
    }
  } catch {
    // fall through
  }

  throw new Error(
    `Could not find an RSS feed for "${url}". Try providing a direct feed URL.`
  );
}

async function resolveSubstackProfile(
  profileUrl: string
): Promise<ResolvedSource> {
  const res = await fetch(profileUrl, {
    headers: { "User-Agent": "Strawberry/1.0" },
    redirect: "follow",
  });
  const html = await res.text();

  // Look for substack publication links in the profile page
  const substackLinks = html.match(
    /https?:\/\/([\w-]+)\.substack\.com/g
  );

  if (substackLinks) {
    const skipSubdomains = new Set([
      "open",
      "support",
      "api",
      "cdn",
      "email",
      "substack",
    ]);
    for (const link of substackLinks) {
      const match = link.match(/https?:\/\/([\w-]+)\.substack\.com/);
      if (match && !skipSubdomains.has(match[1])) {
        const subdomain = match[1];
        const feedUrl = `https://${subdomain}.substack.com/feed`;
        try {
          const feed = await parser.parseURL(feedUrl);
          // Extract better name: try the profile page title, fall back to feed title
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const profileName = titleMatch
            ? titleMatch[1].replace(/\s*[-|].*$/, "").trim()
            : null;
          return {
            name: profileName || feed.title || subdomain,
            feedUrl,
            type: "SUBSTACK",
          };
        } catch {
          continue;
        }
      }
    }
  }

  throw new Error(
    `Could not resolve Substack profile "${profileUrl}" to a publication feed.`
  );
}

export interface FetchedArticle {
  url: string;
  title: string;
  content: string;
  publishedAt: Date | null;
}

export async function fetchArticlesFromFeed(
  feedUrl: string
): Promise<FetchedArticle[]> {
  const feed = await parser.parseURL(feedUrl);
  return (feed.items || [])
    .filter((item) => item.link && item.title)
    .map((item) => ({
      url: item.link!,
      title: item.title!,
      content:
        item["content:encoded"] ||
        item.content ||
        item.contentSnippet ||
        item.summary ||
        "",
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
    }));
}
