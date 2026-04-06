"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Tweet from "./Tweet";

interface TweetData {
  id: string;
  content: string;
  threadId: string | null;
  threadOrder: number;
  isDueForReview: boolean;
  bookmark: { id: string; srStage: number } | null;
  article: {
    title: string;
    source: { name: string };
  };
}

export default function Feed({ token }: { token: string }) {
  const [tweets, setTweets] = useState<TweetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const seenBuffer = useRef<Set<string>>(new Set());
  const flushTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const headers = { "x-auth-token": token };

  const fetchFeed = useCallback(
    async (cursorVal?: string | null) => {
      const params = new URLSearchParams();
      if (cursorVal) params.set("cursor", cursorVal);

      const res = await fetch(`/api/feed?${params}`, { headers });
      if (!res.ok) return;

      const data = await res.json();
      return data;
    },
    [token]
  );

  // Initial load
  useEffect(() => {
    fetchFeed().then((data) => {
      if (data) {
        setTweets(data.tweets);
        setCursor(data.nextCursor);
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
          fetchFeed(cursor).then((data) => {
            if (data) {
              setTweets((prev) => [...prev, ...data.tweets]);
              setCursor(data.nextCursor);
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
  }, [cursor, hasMore, loadingMore, fetchFeed]);

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
                  tweet={t}
                  isThreadPart={true}
                  isThreadLast={i === threadTweets.length - 1}
                  onBookmark={handleBookmark}
                  onSeen={handleSeen}
                />
              ))}
            </div>
          );
        }

        return (
          <Tweet
            key={tweet.id}
            tweet={tweet}
            onBookmark={handleBookmark}
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
