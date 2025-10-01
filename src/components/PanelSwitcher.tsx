"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface PanelSwitcherProps {
  currentPanel: "admin" | "contributor";
}

export function PanelSwitcher({ currentPanel }: PanelSwitcherProps) {
  const { data: session } = useSession();
  
  // Only show if user has "both" role
  const role = (session?.user as { role?: string })?.role;
  if (role !== "both") return null;

  const switchTo = currentPanel === "admin" ? "contributor" : "admin";
  const switchUrl = currentPanel === "admin" ? "/contributor/dashboard" : "/admin";
  const switchLabel = currentPanel === "admin" ? "Switch to Contributor Panel" : "Switch to Admin Panel";

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Link
        href={switchUrl}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 text-sm font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        {switchLabel}
      </Link>
    </div>
  );
}
