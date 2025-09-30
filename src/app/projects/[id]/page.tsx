
import Image from "next/image";
import Link from "next/link";
import { getProjectById, getAdjacentProjects } from "../../../lib/projects";
import TextPressure from "../../../components/ui/TextPressure";
import type { Project, MediaSource } from "../../../lib/types";
import TrueFocus from "../../../components/TrueFocus";
function extractYouTubeId(input: string | undefined | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  // If plain ID
  if (/^[A-Za-z0-9_-]{6,}$/.test(trimmed) && !trimmed.includes("/")) return trimmed;
  try {
    const u = new URL(trimmed);
    // https://www.youtube.com/watch?v=ID
    const v = u.searchParams.get("v");
    if (v) return v;
    // https://youtu.be/ID
    if ((u.hostname.includes("youtu.be") || u.hostname.includes("youtube.com")) && u.pathname) {
      const parts = u.pathname.split("/").filter(Boolean);
      // /embed/ID or /v/ID or just /ID
      const idx = parts.findIndex((p) => ["embed", "v"].includes(p));
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
      if (parts[0]) return parts[0];
    }
  } catch {
    // not a URL
  }
  return null;
}

export default async function ProjectDetail(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const id = params.id;
  const project: Project | null = await getProjectById(id);
  if (!project) {
    return (
      <div className="min-h-screen p-8">
        <p className="mb-6">Project not found.</p>
        <Link href="/projects" className="underline">Back to projects</Link>
      </div>
    );
  }

  const adjacent = await getAdjacentProjects(id);

  return (
    <div className="min-h-screen">
      <section className="relative h-72 w-full bg-white flex items-center justify-center">
        {/* Show TextPressure on md+ screens, fallback text on small screens */}
        <div className="hidden md:block w-full h-full">
          <TextPressure
            text={project.title}
            flex={true}
            alpha={false}
            stroke={false}
            width={true}
            weight={true}
            italic={true}
            textColor="#000000ff"
            strokeColor="#ff0000"
            minFontSize={20}
          />
        </div>
        <div className="block md:hidden w-full text-center">
          <TrueFocus sentence={project.title} borderColor="blue" blurAmount={2}/>
        </div>
      </section>

      <div className="mx-auto max-w-4xl p-6">
        {/* Project Information Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{project.title}</h1>
              {project.shortDescription && (
                <p className="text-lg text-gray-600 dark:text-gray-300">{project.shortDescription}</p>
              )}
            </div>
            {/* Project Dates */}
            <div className="flex flex-col sm:items-end gap-2">
              {project.startDate && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Start Date:</span> {new Date(project.startDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              )}
              {project.endDate && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">End Date:</span> {new Date(project.endDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project Description */}
        <div className="mb-8">
          <article className="prose prose-zinc dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: project.description }} />
        </div>

        {/* Project Video (YouTube, Google Drive, OneDrive) */}
        {project.media && project.media.kind === "youtube" && project.media.url ? (
          (() => {
            const videoId = extractYouTubeId(project.media.url);
            if (videoId) {
              return (
                <div className="aspect-video w-full mb-8">
                  <iframe
                    className="w-full h-full rounded-lg shadow-lg"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title={project.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              );
            } else {
              return (
                <div className="mb-8 text-red-600">Invalid or non-embeddable YouTube link.</div>
              );
            }
          })()
        ) : null}
        {/* Fallback: always embed the video link in an iframe for any non-YouTube link */}
        {project.media && project.media.kind !== "youtube" && project.media.kind !== "upload" && "url" in project.media ? (
          <div className="aspect-video w-full mb-8">
            <iframe
              className="w-full h-full rounded-lg shadow-lg"
              src={(() => {
                const url = (project.media as Extract<MediaSource, { url: string }>).url;
                if (url.includes("drive.google.com")) return url.replace("/view", "/preview");
                return url;
              })()}
              title={project.title}
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        ) : null}

        {/* Showcase Photos Gallery */}
        {project.showcasePhotos && project.showcasePhotos.length > 0 && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Showcase Photos</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {project.showcasePhotos.map((url: string, idx: number) => (
                <Image
                  key={idx}
                  src={url}
                  alt={`Showcase ${idx + 1}`}
                  className="w-full h-64 sm:h-80 object-cover rounded-lg border shadow-md"
                  width={600}
                  height={320}
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        )}

        {/* Project Poster */}
        {project.poster ? (
          <div className="w-full mb-8">
            <Image 
              src={project.poster} 
              alt={`${project.title} poster`} 
              className="w-full h-auto rounded-lg shadow-lg object-contain" 
              width={800} 
              height={400} 
            />
          </div>
        ) : null}

        {Array.isArray(project.techStack) && project.techStack.length ? (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Tech Stack</h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:justify-start justify-center">
              {project.techStack.map((t: string, i: number) => (
                <div
                  key={i}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow px-3 py-2 text-base font-medium text-zinc-800 dark:text-zinc-100 flex items-center justify-center min-h-[36px]"
                  style={{ boxShadow: '0 1px 4px 0 rgba(0,0,0,0.04)' }}
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {project.contributors?.length ? (
          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-4">Contributors</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {project.contributors.map((c) => (
                <li key={c.id} className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                  {c.profileUrl || c.avatarUrl ? (
                    <Image src={c.profileUrl || c.avatarUrl || "/default-avatar.png"} alt={c.name} className="w-10 h-10 rounded-full object-cover" width={40} height={40} />
                  ) : null}
                  <div>
                    <p className="font-medium">{c.name}</p>
                  {c.projectRole ? <p className="text-sm text-zinc-500">{c.projectRole}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex justify-between items-center mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <Link href="/projects" className="inline-flex items-center px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            ← Back to Projects
          </Link>
          <div className="flex gap-4">
            {adjacent.prev ? (
              <Link href={`/projects/${adjacent.prev}`} className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                ← Previous
              </Link>
            ) : null}
            {adjacent.next ? (
              <Link href={`/projects/${adjacent.next}`} className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                Next →
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}


