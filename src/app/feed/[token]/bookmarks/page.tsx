"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Tweet from "../../../../components/Tweet";

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
    source: { name: string; iconUrl: string | null };
  };
}

interface BookmarkData {
  id: string;
  srStage: number;
  nextDueAt: string;
  tweet: TweetData;
}

export default function BookmarksPage() {
  const params = useParams();
  const token = params.token as string;
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = { "x-auth-token": token };

  useEffect(() => {
    fetch("/api/bookmarks", { headers })
      .then((r) => r.json())
      .then((data) => {
        setBookmarks(data);
        setLoading(false);
      });
  }, [token]);

  const handleBookmark = useCallback(
    async (tweetId: string) => {
      await fetch("/api/bookmark", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ tweetId }),
      });
      setBookmarks((prev) => prev.filter((b) => b.tweet.id !== tweetId));
    },
    [token]
  );

  const handleSeen = useCallback(() => {}, []);
  const handleSaveArticle = useCallback(() => {}, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-3 border-rose-300 border-t-rose-600 rounded-full" />
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 px-6 text-center">
        <p className="text-lg">No bookmarks yet</p>
        <p className="text-sm mt-2">
          Tap the bookmark icon on any tweet to save it for spaced repetition.
        </p>
      </div>
    );
  }

  const due = bookmarks.filter(
    (b) => new Date(b.nextDueAt) <= new Date()
  );
  const upcoming = bookmarks.filter(
    (b) => new Date(b.nextDueAt) > new Date()
  );

  return (
    <div>
      {due.length > 0 && (
        <>
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
            <p className="text-sm font-medium text-amber-700">
              Due for review ({due.length})
            </p>
          </div>
          {due.map((b) => (
            <Tweet
              key={b.tweet.id}
              tweet={{
                ...b.tweet,
                isDueForReview: true,
                bookmark: { id: b.id, srStage: b.srStage },
                articleId: b.tweet.articleId,
                articleUrl: b.tweet.article.url,
                isArticleSaved: false,
              }}
              onBookmark={handleBookmark}
              onSaveArticle={handleSaveArticle}
              onSeen={handleSeen}
            />
          ))}
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-500">
              Upcoming ({upcoming.length})
            </p>
          </div>
          {upcoming.map((b) => (
            <Tweet
              key={b.tweet.id}
              tweet={{
                ...b.tweet,
                isDueForReview: false,
                bookmark: { id: b.id, srStage: b.srStage },
                articleId: b.tweet.articleId,
                articleUrl: b.tweet.article.url,
                isArticleSaved: false,
              }}
              onBookmark={handleBookmark}
              onSaveArticle={handleSaveArticle}
              onSeen={handleSeen}
            />
          ))}
        </>
      )}
    </div>
  );
}
