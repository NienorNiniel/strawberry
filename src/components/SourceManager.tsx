"use client";

import { useState, useEffect } from "react";

interface Source {
  id: string;
  url: string;
  name: string;
  type: string;
  feedUrl: string;
  _count: { articles: number };
}

export default function SourceManager({ token }: { token: string }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [syncStatus, setSyncStatus] = useState<Record<string, string>>({});

  const headers = { "x-auth-token": token, "Content-Type": "application/json" };

  useEffect(() => {
    fetch("/api/sources", { headers: { "x-auth-token": token } })
      .then((r) => r.json())
      .then(setSources)
      .finally(() => setLoading(false));
  }, [token]);

  const addSource = async () => {
    if (!url.trim()) return;
    setAdding(true);
    setError("");

    const res = await fetch("/api/sources", {
      method: "POST",
      headers,
      body: JSON.stringify({ url: url.trim() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to add source");
    } else {
      setSources((prev) => [{ ...data, _count: { articles: 0 } }, ...prev]);
      setUrl("");
    }
    setAdding(false);
  };

  const deleteSource = async (id: string) => {
    await fetch("/api/sources", {
      method: "DELETE",
      headers,
      body: JSON.stringify({ id }),
    });
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const syncSource = async (id: string) => {
    setSyncing((prev) => new Set(prev).add(id));
    setSyncStatus((prev) => ({ ...prev, [id]: "Fetching articles..." }));

    let hasMore = true;
    let totalTweets = 0;
    let totalArticles = 0;

    while (hasMore) {
      const res = await fetch(`/api/sources/${id}/sync`, {
        method: "POST",
        headers,
      });

      if (!res.ok) {
        setSyncStatus((prev) => ({ ...prev, [id]: "Sync failed" }));
        break;
      }

      const data = await res.json();
      totalArticles += data.articlesProcessed;
      totalTweets += data.tweetsGenerated;
      hasMore = data.hasMore;

      setSyncStatus((prev) => ({
        ...prev,
        [id]: hasMore
          ? `Processed ${totalArticles} articles (${data.remainingArticles} remaining)...`
          : `Done! ${totalArticles} articles, ${totalTweets} tweets`,
      }));
    }

    setSyncing((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    // Refresh sources to get updated article counts
    fetch("/api/sources", { headers: { "x-auth-token": token } })
      .then((r) => r.json())
      .then(setSources);
  };

  const syncAll = async () => {
    for (const source of sources) {
      await syncSource(source.id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-3 border-rose-300 border-t-rose-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Add source */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add a source
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSource()}
            placeholder="Paste a Substack or RSS URL..."
            className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
            disabled={adding}
          />
          <button
            onClick={addSource}
            disabled={adding || !url.trim()}
            className="bg-rose-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-rose-600 disabled:opacity-50 transition-colors"
          >
            {adding ? "Adding..." : "Add"}
          </button>
        </div>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>

      {/* Sync all button */}
      {sources.length > 0 && (
        <button
          onClick={syncAll}
          disabled={syncing.size > 0}
          className="w-full mb-4 bg-rose-50 text-rose-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-rose-100 disabled:opacity-50 transition-colors"
        >
          {syncing.size > 0 ? "Syncing..." : "Sync all sources"}
        </button>
      )}

      {/* Source list */}
      {sources.length === 0 ? (
        <p className="text-gray-400 text-center text-sm py-8">
          No sources yet. Add a Substack or RSS feed above.
        </p>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className="border border-gray-100 rounded-xl p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-semibold text-xs flex-shrink-0">
                      {source.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {source.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {source._count.articles} articles &middot;{" "}
                        {source.type.toLowerCase()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0 ml-2">
                  <button
                    onClick={() => syncSource(source.id)}
                    disabled={syncing.has(source.id)}
                    className="text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                  >
                    {syncing.has(source.id) ? "..." : "Sync"}
                  </button>
                  <button
                    onClick={() => deleteSource(source.id)}
                    className="text-xs text-gray-400 px-2 py-1.5 rounded-lg hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {syncStatus[source.id] && (
                <p className="text-xs text-gray-500 mt-2 pl-10">
                  {syncStatus[source.id]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
