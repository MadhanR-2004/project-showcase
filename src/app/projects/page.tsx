import Link from "next/link";
import Image from "next/image";
import { BackgroundGradient } from "../../components/ui/background-gradient";
import { listProjects } from "../../lib/projects";

import { Project } from "../../lib/types";

export default async function ProjectsPage() {
  const projects = await listProjects();

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

  return (
    <div className="min-h-screen px-6 py-16 bg-black text-white">
      <h1 className="text-3xl sm:text-5xl font-bold mb-10">Projects</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.map((p: Project) => (
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
                ) : p.media && (p.media.kind === "gdrive" || p.media.kind === "onedrive") ? (
                  <iframe
                    className="w-full h-44 rounded-md"
                    src={(() => {
                      if (p.media.kind === "gdrive" && "url" in p.media && p.media.url.includes("drive.google.com")) {
                        return p.media.url.replace("/view", "/preview");
                      }
                      return "url" in p.media ? p.media.url : "";
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
    </div>
  );
}


