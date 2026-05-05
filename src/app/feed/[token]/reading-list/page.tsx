"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface SavedArticleData {
  id: string;
  createdAt: string;
  article: {
    id: string;
    url: string;
    title: string;
    publishedAt: string | null;
    source: {
      name: string;
      iconUrl: string | null;
    };
  };
}

export default function ReadingListPage() {
  const params = useParams();
  const token = params.token as string;
  const [saved, setSaved] = useState<SavedArticleData[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = { "x-auth-token": token };

  useEffect(() => {
    fetch("/api/saved-articles", { headers })
      .then((r) => r.json())
      .then((data) => {
        setSaved(data);
        setLoading(false);
      });
  }, []);

  const handleRemove = async (articleId: string) => {
    const res = await fetch("/api/saved-articles", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ articleId }),
    });
    if (!res.ok) return;
    setSaved((prev) => prev.filter((s) => s.article.id !== articleId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-3 border-rose-300 border-t-rose-600 rounded-full" />
      </div>
    );
  }

  if (saved.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 px-6 text-center">
        <p className="text-lg">No saved articles</p>
        <p className="text-sm mt-2">
          Tap the book icon on a tweet to save its article for later.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 py-3 bg-rose-50 border-b border-rose-100">
        <p className="text-sm font-medium text-rose-700">
          Reading list ({saved.length})
        </p>
      </div>
      {saved.map((s) => (
        <div
          key={s.id}
          className="px-4 py-3 border-b border-gray-100 flex gap-3"
        >
          {s.article.source.iconUrl ? (
            <img
              src={s.article.source.iconUrl}
              alt={s.article.source.name}
              className="flex-shrink-0 w-10 h-10 rounded-full object-cover bg-rose-50 mt-0.5"
            />
          ) : (
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-semibold text-sm mt-0.5">
              {s.article.source.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <a
              href={s.article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[15px] font-medium text-gray-900 hover:text-rose-600 leading-snug"
            >
              {s.article.title}
            </a>
            <div className="text-xs text-gray-400 mt-0.5">
              {s.article.source.name}
              {s.article.publishedAt && (
                <span>
                  {" "}· {String(new Date(s.article.publishedAt).getMonth() + 1).padStart(2, "0")}/{String(new Date(s.article.publishedAt).getFullYear()).slice(2)}
                </span>
              )}
            </div>
            <button
              onClick={() => handleRemove(s.article.id)}
              className="text-xs text-gray-400 hover:text-rose-500 mt-1"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
