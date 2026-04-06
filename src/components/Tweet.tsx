"use client";

import { useRef, useEffect } from "react";

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

interface TweetProps {
  tweet: TweetData;
  isThreadPart?: boolean;
  isThreadLast?: boolean;
  onBookmark: (tweetId: string) => void;
  onSeen: (tweetId: string) => void;
}

export default function Tweet({
  tweet,
  isThreadPart = false,
  isThreadLast = false,
  onBookmark,
  onSeen,
}: TweetProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
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
        {/* Avatar - source initial */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-semibold text-sm">
          {tweet.article.source.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1 text-sm">
            <span className="font-bold text-gray-900 truncate">
              {tweet.article.source.name}
            </span>
            <span className="text-gray-400 truncate">
              &middot; {tweet.article.title.slice(0, 40)}
              {tweet.article.title.length > 40 ? "..." : ""}
            </span>
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
          </div>
        </div>
      </div>
    </div>
  );
}
