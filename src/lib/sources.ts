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
  iconUrl: string | null;
}

async function fetchFavicon(feedUrl: string): Promise<string | null> {
  try {
    const url = new URL(feedUrl);
    const origin = url.origin;
    // Try Google's favicon service — reliable and returns consistent sizes
    const googleFavicon = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;
    const res = await fetch(googleFavicon, { method: "HEAD" });
    if (res.ok) return googleFavicon;
    // Fallback to /favicon.ico
    const fallback = `${origin}/favicon.ico`;
    const res2 = await fetch(fallback, { method: "HEAD" });
    if (res2.ok) return fallback;
  } catch {
    // ignore
  }
  return null;
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
    const iconUrl = await fetchFavicon(feedUrl);
    return {
      name: feed.title || pubMatch[1],
      feedUrl,
      type: "SUBSTACK",
      iconUrl,
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
    const iconUrl = await fetchFavicon(trimmed);
    return {
      name: feed.title || new URL(trimmed).hostname,
      feedUrl: trimmed,
      type: "RSS",
      iconUrl,
    };
  }

  // Case 4: Try common feed paths
  const feedPaths = ["/feed", "/feed.xml", "/rss", "/rss.xml", "/atom.xml"];
  for (const path of feedPaths) {
    try {
      const candidate = trimmed + path;
      const feed = await parser.parseURL(candidate);
      if (feed.items && feed.items.length > 0) {
        const iconUrl = await fetchFavicon(candidate);
        return {
          name: feed.title || new URL(trimmed).hostname,
          feedUrl: candidate,
          type: "RSS",
          iconUrl,
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
      const iconUrl = await fetchFavicon(trimmed);
      return {
        name: feed.title || new URL(trimmed).hostname,
        feedUrl: trimmed,
        type: "RSS",
        iconUrl,
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
          const iconUrl = await fetchFavicon(feedUrl);
          return {
            name: profileName || feed.title || subdomain,
            feedUrl,
            type: "SUBSTACK",
            iconUrl,
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

async function fetchSitemapUrls(baseUrl: string): Promise<string[]> {
  const origin = new URL(baseUrl).origin;
  const sitemapPaths = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-posts.xml"];
  const urls: string[] = [];

  for (const path of sitemapPaths) {
    try {
      const res = await fetch(`${origin}${path}`, {
        headers: { "User-Agent": "Strawberry/1.0 (RSS Reader)" },
      });
      if (!res.ok) continue;
      const xml = await res.text();

      // Check if this is a sitemap index (contains other sitemaps)
      const sitemapLocs = [...xml.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
      if (sitemapLocs.length > 0) {
        // Fetch each child sitemap
        for (const loc of sitemapLocs.slice(0, 5)) {
          try {
            const childRes = await fetch(loc, {
              headers: { "User-Agent": "Strawberry/1.0 (RSS Reader)" },
            });
            if (!childRes.ok) continue;
            const childXml = await childRes.text();
            const childUrls = [...childXml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
            urls.push(...childUrls);
          } catch {
            continue;
          }
        }
      }

      // Also extract direct URLs from this sitemap
      const directUrls = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
      urls.push(...directUrls);

      if (urls.length > 0) break;
    } catch {
      continue;
    }
  }

  // Filter to likely article URLs (skip homepages, category pages, tag pages, images)
  return urls.filter(u => {
    const path = new URL(u).pathname;
    return path !== "/" &&
      !path.match(/^\/(tag|category|author|page|search|about|contact|privacy|terms)\b/i) &&
      !path.match(/\.(jpg|png|gif|pdf|xml)$/i);
  });
}

async function fetchPageContent(url: string): Promise<{ title: string; content: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Strawberry/1.0 (RSS Reader)" },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
    const title = ogTitleMatch?.[1] || titleMatch?.[1]?.replace(/\s*[-|].*$/, "").trim() || "";

    // Extract article content - try <article>, then <main>, then <body>
    let content = "";
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);

    content = articleMatch?.[1] || mainMatch?.[1] || "";

    if (!content || content.length < 200) return null;
    if (!title) return null;

    return { title, content };
  } catch {
    return null;
  }
}

export async function fetchArticlesFromSitemap(
  feedUrl: string,
  existingUrls: Set<string>,
  limit: number = 50
): Promise<FetchedArticle[]> {
  const sitemapUrls = await fetchSitemapUrls(feedUrl);
  const newUrls = sitemapUrls.filter(u => !existingUrls.has(u)).slice(0, limit);

  const articles: FetchedArticle[] = [];
  // Fetch in small batches to avoid overwhelming the server
  for (let i = 0; i < newUrls.length; i += 3) {
    const batch = newUrls.slice(i, i + 3);
    const results = await Promise.all(batch.map(url => fetchPageContent(url)));
    for (let j = 0; j < batch.length; j++) {
      const result = results[j];
      if (result) {
        articles.push({
          url: batch[j],
          title: result.title,
          content: result.content,
          publishedAt: null,
        });
      }
    }
  }

  return articles;
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
