"use client";

import { useRef, useEffect } from "react";

interface TweetData {
  id: string;
  content: string;
  threadId: string | null;
  threadOrder: number;
  isDueForReview: boolean;
  bookmark: { id: string; srStage: number } | null;
  articleId: string;
  articleUrl: string;
  isArticleSaved: boolean;
  article: {
    title: string;
    publishedAt: string | null;
    source: { name: string; iconUrl: string | null };
  };
}

interface TweetProps {
  tweet: TweetData;
  isThreadPart?: boolean;
  isThreadLast?: boolean;
  onBookmark: (tweetId: string) => void;
  onSaveArticle: (articleId: string) => void;
  onSeen: (tweetId: string) => void;
}

export default function Tweet({
  tweet,
  isThreadPart = false,
  isThreadLast = false,
  onBookmark,
  onSaveArticle,
  onSeen,
}: TweetProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let wasVisible = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          wasVisible = true;
        } else if (wasVisible) {
          onSeen(tweet.id);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [tweet.id, onSeen]);

  return (
    <div
      ref={ref}
      className={`px-4 py-3 ${
        isThreadPart && !isThreadLast
          ? "border-l-2 border-rose-200 ml-4"
          : ""
      } ${!isThreadPart || isThreadLast ? "border-b border-gray-100" : ""}`}
    >
      <div className="flex gap-3">
        {/* Avatar - source icon or initial */}
        {tweet.article.source.iconUrl ? (
          <img
            src={tweet.article.source.iconUrl}
            alt={tweet.article.source.name}
            className="flex-shrink-0 w-10 h-10 rounded-full object-cover bg-rose-50"
          />
        ) : (
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-semibold text-sm">
            {tweet.article.source.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="text-sm">
            <span className="font-bold text-gray-900">
              {tweet.article.source.name}
            </span>
          </div>
          <div className="text-xs text-gray-400 leading-snug">
            {tweet.article.title}
            {tweet.article.publishedAt && (
              <span className="text-gray-300">
                {" "}· {String(new Date(tweet.article.publishedAt).getMonth() + 1).padStart(2, "0")}/{String(new Date(tweet.article.publishedAt).getFullYear()).slice(2)}
              </span>
            )}
          </div>

          {/* Thread indicator */}
          {isThreadPart && tweet.threadOrder === 0 && (
            <div className="text-xs text-rose-400 mt-0.5 font-medium">
              Thread
            </div>
          )}

          {/* SR badge */}
          {tweet.isDueForReview && (
            <div className="inline-block text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mt-1">
              Review
            </div>
          )}

          {/* Content */}
          <p className="text-gray-900 mt-1 text-[15px] leading-relaxed">
            {tweet.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-6 mt-2">
            <button
              onClick={() => onBookmark(tweet.id)}
              className="group flex items-center gap-1"
              title={tweet.bookmark ? "Remove bookmark" : "Bookmark for spaced repetition"}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={tweet.bookmark ? "#e11d48" : "none"}
                stroke={tweet.bookmark ? "#e11d48" : "#9ca3af"}
                strokeWidth="2"
                className="group-hover:stroke-rose-500 transition-colors"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              {tweet.bookmark && (
                <span className="text-xs text-rose-500">
                  {tweet.bookmark.srStage + 1}/6
                </span>
              )}
            </button>
            <button
              onClick={() => onSaveArticle(tweet.articleId)}
              className="group flex items-center gap-1"
              title={tweet.isArticleSaved ? "Remove from reading list" : "Save article for later"}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={tweet.isArticleSaved ? "#e11d48" : "none"}
                stroke={tweet.isArticleSaved ? "#e11d48" : "#9ca3af"}
                strokeWidth="2"
                className="group-hover:stroke-rose-500 transition-colors"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
