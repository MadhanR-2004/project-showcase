"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BackgroundGradient } from "../../components/ui/background-gradient";

type ApiProject = {
  _id?: string;
  title: string;
  shortDescription?: string;
  poster?: string;
  thumbnail?: string;
  media?: {
    kind: string;
    url: string;
    youtubeId?: string;
    fileId?: string;
    contentType?: string;
  };
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const PAGE_SIZE = 24;

  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects?limit=${PAGE_SIZE}&skip=${(page-1)*PAGE_SIZE}`);
        if (!res.ok) {
          setProjects([]);
          setTotal(0);
          return;
        }
        const data = await res.json();
        setProjects(data.projects || []);
        setTotal(data.total ?? (data.projects?.length || 0));
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        setProjects([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, [page]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    if (page !== 1) setPage(1);
  }, [searchQuery]);

  // Filter projects based on search query
  const filteredProjects = projects.filter(p => 
    (p.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.shortDescription?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  // Helper to extract YouTube ID
  function extractYouTubeId(input: string | undefined | null): string | null {
    if (!input) return null;
    const trimmed = input.trim();
    if (/^[A-Za-z0-9_-]{6,}$/.test(trimmed) && !trimmed.includes("/")) return trimmed;
    try {
      const u = new URL(trimmed);
      const v = u.searchParams.get("v");
      if (v) return v;
      if ((u.hostname.includes("youtu.be") || u.hostname.includes("youtube.com")) && u.pathname) {
        const parts = u.pathname.split("/").filter(Boolean);
        const idx = parts.findIndex((p) => ["embed", "v"].includes(p));
        if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
        if (parts[0]) return parts[0];
      }
    } catch {}
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen px-6 py-16 bg-black text-white flex items-center justify-center">
        <div className="text-xl">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-16 bg-black text-white">
      <h1 className="text-3xl sm:text-5xl font-bold mb-6">Projects</h1>
      
      {/* Search Bar */}
      <div className="mb-10 max-w-md">
        <input
          type="text"
          placeholder="Search projects by title or description..."
          className="w-full border border-zinc-700 rounded-md px-4 py-3 text-sm bg-zinc-900 text-white placeholder-zinc-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProjects.map((p) => (
          <Link key={p._id} href={`/projects/${p._id}`}>
            <BackgroundGradient className="rounded-[22px] p-6 bg-zinc-900">
              <div className="flex items-center justify-center h-48">
                {/* Video preview if available */}
                {(p.media && p.media.kind === "youtube" && p.media.url) ? (
                  (() => {
                    const videoId = extractYouTubeId(p.media.url);
                    if (videoId) {
                      return (
                        <iframe
                          className="w-full h-44 rounded-md"
                          src={`https://www.youtube.com/embed/${videoId}`}
                          title={p.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      );
                    }
                    return null;
                  })()
                ) : p.media && p.media.kind && p.media.url && (p.media.kind === "gdrive" || p.media.kind === "onedrive") ? (
                  <iframe
                    className="w-full h-44 rounded-md"
                    src={(() => {
                      if (p.media.kind === "gdrive" && p.media.url.includes("drive.google.com")) {
                        return p.media.url.replace("/view", "/preview");
                      }
                      return p.media.url;
                    })()}
                    title={p.title}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                ) : p.poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumbnail || p.poster} alt={p.title} className="object-contain max-h-44 max-w-full" />
                ) : (
                  <Image src="/next.svg" alt={p.title} width={160} height={160} className="object-contain" />
                )}
              </div>
              <p className="text-lg font-semibold mt-4">{p.title}</p>
              {p.shortDescription ? (
                <p className="text-sm text-neutral-300 mt-2">{p.shortDescription}</p>
              ) : null}
            </BackgroundGradient>
          </Link>
        ))}
      </div>
      {/* Pagination Controls */}
      <div className="flex justify-center items-center gap-2 mt-10">
        <button
          className="px-3 py-1 rounded bg-zinc-800 text-white disabled:opacity-50"
          onClick={() => setPage(page-1)}
          disabled={page === 1}
        >Prev</button>
        <span className="px-3">Page {page} of {Math.max(1, Math.ceil(total/PAGE_SIZE))}</span>
        <button
          className="px-3 py-1 rounded bg-zinc-800 text-white disabled:opacity-50"
          onClick={() => setPage(page+1)}
          disabled={page >= Math.ceil(total/PAGE_SIZE)}
        >Next</button>
      </div>
    </div>
  );
}


