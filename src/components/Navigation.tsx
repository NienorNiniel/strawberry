"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation({ token }: { token: string }) {
  const pathname = usePathname();
  const base = `/feed/${token}`;

  const tabs = [
    {
      href: base,
      label: "Feed",
      icon: (active: boolean) => (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={active ? "#e11d48" : "none"}
          stroke={active ? "#e11d48" : "#9ca3af"}
          strokeWidth="2"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      href: `${base}/bookmarks`,
      label: "Saved",
      icon: (active: boolean) => (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={active ? "#e11d48" : "none"}
          stroke={active ? "#e11d48" : "#9ca3af"}
          strokeWidth="2"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      href: `${base}/reading-list`,
      label: "Read",
      icon: (active: boolean) => (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={active ? "#e11d48" : "none"}
          stroke={active ? "#e11d48" : "#9ca3af"}
          strokeWidth="2"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
    {
      href: `${base}/sources`,
      label: "Sources",
      icon: (active: boolean) => (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke={active ? "#e11d48" : "#9ca3af"}
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
          <path d="M12 6v5M12 13v5" />
          <path d="M6 12h5M13 12h5" />
          <circle cx="5" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
      <div className="max-w-lg mx-auto flex justify-around py-2">
        {tabs.map((tab) => {
          const isActive =
            tab.href === base
              ? pathname === base
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-0.5 px-4 py-1"
            >
              {tab.icon(isActive)}
              <span
                className={`text-[10px] ${
                  isActive ? "text-rose-600 font-medium" : "text-gray-400"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
