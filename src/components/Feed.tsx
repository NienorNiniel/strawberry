"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Tweet from "./Tweet";

interface TweetData {
  id: string;
  content: string;
  threadId: string | null;
  threadOrder: number;
  isDueForReview: boolean;
  articleId: string;
  bookmark: { id: string; srStage: number } | null;
  article: {
    url: string;
    title: string;
    publishedAt: string | null;
    savedArticle: { id: string } | null;
    source: { name: string; iconUrl: string | null };
  };
}

export default function Feed({ token }: { token: string }) {
  const [tweets, setTweets] = useState<TweetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const seenBuffer = useRef<Set<string>>(new Set());
  const flushTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const headers = { "x-auth-token": token };

  const loadedIds = useRef<Set<string>>(new Set());

  const fetchFeed = useCallback(
    async () => {
      const params = new URLSearchParams();
      const ids = [...loadedIds.current];
      if (ids.length > 0) params.set("exclude", ids.join(","));

      const res = await fetch(`/api/feed?${params}`, { headers });
      if (!res.ok) return;

      const data = await res.json();
      if (data?.tweets) {
        data.tweets.forEach((t: { id: string }) => loadedIds.current.add(t.id));
      }
      return data;
    },
    [token]
  );

  // Initial load
  useEffect(() => {
    fetchFeed().then((data) => {
      if (data) {
        setTweets(data.tweets);
        setHasMore(!!data.nextCursor);
      }
      setLoading(false);
    });
  }, [fetchFeed]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          fetchFeed().then((data) => {
            if (data) {
              setTweets((prev) => [...prev, ...data.tweets]);
              setHasMore(!!data.nextCursor);
            }
            setLoadingMore(false);
          });
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, fetchFeed]);

  // Flush seen tweets in batches
  const flushSeen = useCallback(() => {
    if (seenBuffer.current.size === 0) return;
    const ids = [...seenBuffer.current];
    seenBuffer.current.clear();

    fetch("/api/seen", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ tweetIds: ids }),
    }).catch(() => {});
  }, [token]);

  const handleSeen = useCallback(
    (tweetId: string) => {
      seenBuffer.current.add(tweetId);
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(flushSeen, 2000);
    },
    [flushSeen]
  );

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushSeen();
    };
  }, [flushSeen]);

  const [savedArticleIds, setSavedArticleIds] = useState<Set<string>>(new Set());

  // Track saved articles from initial data
  useEffect(() => {
    const ids = new Set<string>();
    tweets.forEach((t) => {
      if (t.article.savedArticle) ids.add(t.articleId);
    });
    setSavedArticleIds((prev) => {
      const merged = new Set(prev);
      ids.forEach((id) => merged.add(id));
      return merged;
    });
  }, [tweets]);

  const handleSaveArticle = async (articleId: string) => {
    const res = await fetch("/api/saved-articles", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ articleId }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setSavedArticleIds((prev) => {
      const next = new Set(prev);
      if (data.saved) next.add(articleId);
      else next.delete(articleId);
      return next;
    });
  };

  const handleBookmark = async (tweetId: string) => {
    const res = await fetch("/api/bookmark", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ tweetId }),
    });
    if (!res.ok) return;
    const data = await res.json();

    setTweets((prev) =>
      prev.map((t) =>
        t.id === tweetId
          ? {
              ...t,
              bookmark: data.bookmarked
                ? data.bookmark
                : null,
            }
          : t
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-3 border-rose-300 border-t-rose-600 rounded-full" />
      </div>
    );
  }

  if (tweets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 px-6 text-center">
        <p className="text-lg">No tweets yet!</p>
        <p className="text-sm mt-2">
          Add some sources and sync them to fill your feed.
        </p>
      </div>
    );
  }

  // Group tweets for rendering (keep threads together)
  const rendered = new Set<string>();

  return (
    <div>
      {tweets.map((tweet) => {
        if (rendered.has(tweet.id)) return null;
        rendered.add(tweet.id);

        // If part of a thread, render all thread tweets together
        if (tweet.threadId) {
          const threadTweets = tweets
            .filter((t) => t.threadId === tweet.threadId)
            .sort((a, b) => a.threadOrder - b.threadOrder);

          threadTweets.forEach((t) => rendered.add(t.id));

          return (
            <div key={tweet.threadId} className="border-b border-gray-100">
              {threadTweets.map((t, i) => (
                <Tweet
                  key={t.id}
                  tweet={{ ...t, articleId: t.articleId, articleUrl: t.article.url, isArticleSaved: savedArticleIds.has(t.articleId) }}
                  isThreadPart={true}
                  isThreadLast={i === threadTweets.length - 1}
                  onBookmark={handleBookmark}
                  onSaveArticle={handleSaveArticle}
                  onSeen={handleSeen}
                />
              ))}
            </div>
          );
        }

        return (
          <Tweet
            key={tweet.id}
            tweet={{ ...tweet, articleId: tweet.articleId, articleUrl: tweet.article.url, isArticleSaved: savedArticleIds.has(tweet.articleId) }}
            onBookmark={handleBookmark}
            onSaveArticle={handleSaveArticle}
            onSeen={handleSeen}
          />
        );
      })}

      <div ref={sentinelRef} className="h-20 flex items-center justify-center">
        {loadingMore && (
          <div className="animate-spin w-6 h-6 border-2 border-rose-300 border-t-rose-600 rounded-full" />
        )}
        {!hasMore && tweets.length > 0 && (
          <p className="text-gray-400 text-sm">You&apos;re all caught up!</p>
        )}
      </div>
    </div>
  );
}
