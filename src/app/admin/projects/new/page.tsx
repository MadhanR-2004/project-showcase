
"use client";

// Extract YouTube video ID from a link or ID
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
  } catch {
    // ignore
  }
  return null;
}

async function handleDeleteFile(url: string) {
  // expects url like /api/media/<fileId>
  if (!url || !url.startsWith('/api/media/')) {
    console.warn('Invalid GridFS URL:', url);
    return;
  }
  
  const fileId = url.split("/").pop();
  if (!fileId) {
    console.warn('Could not extract fileId from URL:', url);
    return;
  }
  
  try {
    const response = await fetch("/api/media/delete", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete file');
    }
    
    console.log('File deleted successfully:', fileId);
  } catch (error) {
    console.error('Error deleting file:', error);
    // You might want to show a toast notification here
    alert(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AdminCreateProject() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [posterUploading, setPosterUploading] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);
  const posterFileRef = useRef<HTMLInputElement | null>(null);
  const [posterFileKey, setPosterFileKey] = useState(0);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const thumbnailFileRef = useRef<HTMLInputElement | null>(null);
  const [thumbnailFileKey, setThumbnailFileKey] = useState(0);
  // Video links
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeValid, setYoutubeValid] = useState(true);
  const [gdriveUrl, setGdriveUrl] = useState("");
  const [onedriveUrl, setOnedriveUrl] = useState("");
  // Showcase photos: array of { url: string, file: File | null, uploading?: boolean, error?: string }
  const [photos, setPhotos] = useState<{ url: string; file: File | null; uploading?: boolean; error?: string }[]>([{ url: "", file: null }]);
  const photoFileRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allContributors, setAllContributors] = useState<{ _id: string; name: string; avatarUrl?: string; profileUrl?: string }[]>([]);
  const [selectedContribs, setSelectedContribs] = useState<{
    id: string;
    name?: string;
    projectRole: "mentor" | "team-leader" | "team-member" | "project-head" | "";
  }[]>([]);

  const isAdmin = !!session && (session.user as { role?: string })?.role === "admin";

  // Redirect if not admin; keep hooks order consistent
  useEffect(() => {
    if (status !== "loading" && !isAdmin) {
      router.replace("/admin/login");
    }
  }, [status, isAdmin, router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/contributors");
        if (!res.ok) {
          setAllContributors([]);
          return;
        }
        const data = await res.json();
  setAllContributors((data.contributors || []).map((c: { _id: string; name: string; avatarUrl?: string; profileUrl?: string }) => ({ _id: c._id, name: c.name, avatarUrl: c.avatarUrl, profileUrl: c.profileUrl })));
      } catch {
        setAllContributors([]);
      }
    })();
  }, []);

  function appendEmptyContributor() {
    setSelectedContribs([...selectedContribs, { id: "", name: "", projectRole: "" }]);
  }

  function setContributorId(index: number, id: string) {
    const next = [...selectedContribs];
    next[index].id = id;
    if (id) next[index].name = ""; // use selected name
    setSelectedContribs(next);
  }

  // function setContributorName(index: number, name: string) {
  //   const next = [...selectedContribs];
  //   next[index].name = name;
  //   if (name) next[index].id = ""; // manual entry overrides select
  //   setSelectedContribs(next);
  // }

  function updateRole(index: number, projectRole: "mentor" | "team-leader" | "team-member" | "project-head" | "") {
    const next = [...selectedContribs];
    next[index].projectRole = projectRole;
    setSelectedContribs(next);
  }

  function removeContributor(index: number) {
    const next = [...selectedContribs];
    next.splice(index, 1);
    setSelectedContribs(next);
  }

  async function uploadToGridFS(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/media/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    return (await res.json()) as { fileId: string; contentType?: string };
  }

  // function handlePhotoUpload(idx: number) {
  //   ...unused
  // }


  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
  // Frontend validation
  if (!title.trim()) return setError("Title is required");
  if (!posterUrl) return setError("Poster image is required");
  if (!youtubeUrl.trim() && !gdriveUrl.trim() && !onedriveUrl.trim()) return setError("At least one project video is required");
  if (!photos.length || !photos.some(p => p.url)) return setError("At least one showcase image is required");
  if (!shortDescription.trim()) return setError("Short description is required");
  if (!description.trim()) return setError("Description is required");
  if (!techStack.length) return setError("At least one tech stack is required");
  if (!selectedContribs.length || !selectedContribs.some(c => c.id || c.name)) return setError("At least one contributor is required");
  setSaving(true);
    try {
      const poster: string | undefined = posterUrl || undefined;
      const thumbnail: string | undefined = thumbnailUrl || undefined;

      // Video media
      let media: { kind: "youtube" | "gdrive" | "onedrive"; url: string; youtubeId?: string } | undefined = undefined;
      if (youtubeUrl && extractYouTubeId(youtubeUrl)) {
        media = { kind: "youtube", url: youtubeUrl, youtubeId: extractYouTubeId(youtubeUrl) ?? undefined };
      } else if (gdriveUrl) {
        media = { kind: "gdrive", url: gdriveUrl };
      } else if (onedriveUrl) {
        media = { kind: "onedrive", url: onedriveUrl };
      }

      // Only use already-uploaded photo URLs
      const showcasePhotos: string[] = photos.map((p) => p.url).filter(Boolean);

      const body = {
        title,
        shortDescription,
        description,
        startDate,
        endDate,
        techStack,
        poster,
        thumbnail,
        media,
        showcasePhotos,
        contributors: selectedContribs
          .filter((c) => c.id || c.name)
          .map((c) => ({
            id: c.id || crypto.randomUUID(),
            name: c.id ? (allContributors.find((a) => a._id === c.id)?.name || "") : (c.name || ""),
            profileUrl: c.id ? allContributors.find((a) => a._id === c.id)?.profileUrl : undefined,
            avatarUrl: c.id ? allContributors.find((a) => a._id === c.id)?.avatarUrl : undefined,
            projectRole: c.projectRole,
          })),
        isPublished: true,
      };
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Create failed");
      const project = await res.json();
      router.push(`/projects/${project._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  if (status === "loading" || !isAdmin) return null;

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Create Project</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title <span className="text-red-600">*</span></label>
          <input className="w-full border rounded-md px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Poster Image <span className="text-red-600">*</span></label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <input
              key={posterFileKey}
              ref={posterFileRef}
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0] ?? null;
                if (!file) return;
                setPosterUploading(true);
                setPosterError(null);
                try {
                  const up = await uploadToGridFS(file);
                  setPosterUrl(`/api/media/${up.fileId}`);
                } catch (err: unknown) {
                  if (err instanceof Error) {
                    setPosterError(err.message);
                  } else {
                    setPosterError("Upload failed");
                  }
                  // Clear failed file selection
                  if (posterFileRef.current) {
                    posterFileRef.current.value = "";
                  }
                  setPosterFileKey(k => k + 1);
                } finally {
                  setPosterUploading(false);
                }
              }}
              disabled={posterUploading}
            />
            {posterUploading && <span className="text-xs text-zinc-500">Uploading...</span>}
            {posterUrl && <Image src={posterUrl} alt="Poster" width={48} height={48} className="w-12 h-12 object-cover rounded border" unoptimized />}
            {posterUrl && (
              <button type="button" className="text-red-600 sm:ml-2" onClick={async () => { await handleDeleteFile(posterUrl); setPosterUrl(""); setPosterFileKey(k => k + 1); }}>Delete</button>
            )}
            {posterError && <span className="text-xs text-red-600">{posterError}</span>}
            <span className="text-xs text-zinc-500 block sm:inline sm:mx-1">or</span>
            <input className="border rounded-md px-3 py-2 w-full sm:flex-1" placeholder="Poster URL (optional)" value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Thumbnail (for lists/cards)</label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <input
              key={thumbnailFileKey}
              ref={thumbnailFileRef}
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0] ?? null;
                if (!file) return;
                setThumbnailUploading(true);
                setThumbnailError(null);
                try {
                  const up = await uploadToGridFS(file);
                  setThumbnailUrl(`/api/media/${up.fileId}`);
                } catch (err: unknown) {
                  if (err instanceof Error) {
                    setThumbnailError(err.message);
                  } else {
                    setThumbnailError("Upload failed");
                  }
                  // Clear failed file selection
                  if (thumbnailFileRef.current) {
                    thumbnailFileRef.current.value = "";
                  }
                  setThumbnailFileKey(k => k + 1);
                } finally {
                  setThumbnailUploading(false);
                }
              }}
              disabled={thumbnailUploading}
            />
            {thumbnailUploading && <span className="text-xs text-zinc-500">Uploading...</span>}
            {thumbnailUrl && <Image src={thumbnailUrl} alt="Thumbnail" width={48} height={48} className="w-12 h-12 object-cover rounded border" unoptimized />}
            {thumbnailUrl && (
              <button type="button" className="text-red-600 sm:ml-2" onClick={async () => { await handleDeleteFile(thumbnailUrl); setThumbnailUrl(""); setThumbnailFileKey(k => k + 1); }}>Delete</button>
            )}
            {thumbnailError && <span className="text-xs text-red-600">{thumbnailError}</span>}
            <span className="text-xs text-zinc-500 block sm:inline sm:mx-1">or</span>
            <input className="border rounded-md px-3 py-2 w-full sm:flex-1" placeholder="Thumbnail URL (optional)" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contributors <span className="text-red-600">*</span></label>
          <ul className="space-y-4 mb-4">
            {selectedContribs.map((c, idx) => (
              <li key={`${c.id}-${idx}`} className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 flex flex-wrap items-center gap-3 shadow-sm border border-zinc-200 dark:border-zinc-700">
                <div className="flex flex-col gap-1 min-w-[180px]">
                  <label className="text-xs text-zinc-500">Select Contributor</label>
                  <select className="border rounded-md px-3 py-2" value={c.id} onChange={(e) => setContributorId(idx, e.target.value)}>
                    <option value="">Select Contributor</option>
                    {allContributors.map((opt) => (
                      <option key={opt._id} value={opt._id}>{opt.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 min-w-[120px]">
                  <label className="text-xs text-zinc-500">Role</label>
                  <select className="border rounded-md px-3 py-2" value={c.projectRole} onChange={(e) => updateRole(idx, e.target.value as "mentor" | "team-leader" | "team-member" | "project-head" | "")}> 
                    <option value="">Role</option>
                    <option value="mentor">Mentor</option>
                    <option value="team-leader">Team Leader</option>
                    <option value="team-member">Team Member</option>
                    <option value="project-head">Project Head</option>
                  </select>
                </div>
                <button type="button" className="ml-2 text-zinc-400 hover:text-red-600 text-xl self-start mt-5" title="Remove" onClick={() => removeContributor(idx)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={appendEmptyContributor}
            className="w-full rounded-md bg-blue-600 hover:bg-blue-700 text-white py-3 text-base font-semibold shadow focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition"
          >
            + Add Contributor
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Short Description <span className="text-red-600">*</span></label>
          <input className="w-full border rounded-md px-3 py-2" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description <span className="text-red-600">*</span></label>
          <textarea className="w-full border rounded-md px-3 py-2 min-h-[100px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter project description (plain text)" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date <span className="text-red-600">*</span></label>
            <input
              type="date"
              className="w-full border rounded-md px-3 py-2"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date <span className="text-red-600">*</span></label>
            <input
              type="date"
              className="w-full border rounded-md px-3 py-2"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tech Stack <span className="text-red-600">*</span></label>
          <div className="flex gap-2 mb-2">
            <input
              className="border rounded-md px-3 py-2 flex-1"
              placeholder="Add a technology (e.g. React, MongoDB)"
              value={techInput}
              onChange={e => setTechInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (techInput.trim()) { setTechStack([...techStack, techInput.trim()]); setTechInput(""); } } }}
            />
            <button
              type="button"
              className="rounded-md bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
              onClick={() => { if (techInput.trim()) { setTechStack([...techStack, techInput.trim()]); setTechInput(""); } }}
            >
              Add
            </button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {techStack.map((tech, idx) => (
              <li key={idx} className="bg-zinc-200 dark:bg-zinc-700 rounded px-3 py-1 flex items-center gap-1">
                <span>{tech}</span>
                <button type="button" className="text-zinc-500 hover:text-red-600 ml-1" onClick={() => setTechStack(techStack.filter((_, i) => i !== idx))}>&times;</button>
              </li>
            ))}
          </ul>
        </div>
        {/* Poster image file input handled above, remove legacy input */}
        <div>
          <label className="block text-sm font-medium mb-1">Project Video Links <span className="text-red-600">*</span></label>
          <input
            className="w-full border rounded-md px-3 py-2 mb-2"
            placeholder="YouTube video link"
            value={youtubeUrl}
            onChange={e => {
              setYoutubeUrl(e.target.value);
              setYoutubeValid(!e.target.value || !!extractYouTubeId(e.target.value));
            }}
          />
          {!youtubeValid && <p className="text-xs text-red-600 mt-1">Please enter a valid YouTube video link.</p>}
          <input
            className="w-full border rounded-md px-3 py-2 mb-2"
            placeholder="Google Drive video link"
            value={gdriveUrl}
            onChange={e => setGdriveUrl(e.target.value)}
          />
          <input
            className="w-full border rounded-md px-3 py-2 mb-2"
            placeholder="OneDrive video link"
            value={onedriveUrl}
            onChange={e => setOnedriveUrl(e.target.value)}
          />
          <p className="text-xs text-zinc-500 mt-1">Paste a YouTube, Google Drive, or OneDrive video link. YouTube takes priority if filled.</p>
          {/* Live preview */}
          {youtubeUrl && extractYouTubeId(youtubeUrl) ? (
            <div className="aspect-video w-full mt-2">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${extractYouTubeId(youtubeUrl)}`}
                title="YouTube Preview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : gdriveUrl ? (
            <div className="aspect-video w-full mt-2">
              <iframe
                className="w-full h-full"
                src={gdriveUrl.replace("/view", "/preview")}
                title="Google Drive Preview"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          ) : onedriveUrl ? (
            <div className="aspect-video w-full mt-2">
              <iframe
                className="w-full h-full"
                src={onedriveUrl}
                title="OneDrive Preview"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Showcase Photos <span className="text-red-600">*</span></label>
          <ul className="space-y-2 mb-2">
            {photos.map((p, idx) => (
              <li key={idx} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <input
                  className="border rounded-md px-3 py-2 w-full sm:flex-1"
                  placeholder="Photo URL (optional)"
                  value={p.url}
                  onChange={e => {
                    const next = [...photos];
                    next[idx].url = e.target.value;
                    setPhotos(next);
                  }}
                  disabled={!!p.file || !!p.uploading}
                />
                <span className="text-xs text-zinc-500 block sm:inline sm:mx-1 text-center">or</span>
                <input
                  ref={el => { photoFileRefs.current[idx] = el; }}
                  type="file"
                  accept="image/*"
                  onChange={async e => {
                    const file = e.target.files?.[0] ?? null;
                    if (!file) return;
                    const next = [...photos];
                    next[idx].file = file;
                    next[idx].uploading = true;
                    next[idx].error = undefined;
                    setPhotos(next);
                    try {
                      const up = await uploadToGridFS(file);
                      setPhotos(prev => prev.map((p, i) => i === idx ? { url: `/api/media/${up.fileId}`, file: null, uploading: false } : p));
                    } catch {
                      // Reset failed state and clear file/url so the filename is not shown
                      setPhotos(prev => prev.map((p, i) => i === idx ? { url: "", file: null, uploading: false, error: "Upload failed" } : p));
                      if (photoFileRefs.current[idx]) {
                        photoFileRefs.current[idx]!.value = "";
                      }
                    }
                  }}
                  disabled={!!p.url || !!p.uploading}
                />
                {p.uploading && (
                  <span className="w-12 h-12 flex items-center justify-center"><svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg></span>
                )}
                {p.url && !p.uploading && (
                  <Image src={p.url} alt="Showcase" width={48} height={48} className="w-12 h-12 object-cover rounded border" unoptimized />
                )}
                {p.url && !p.uploading && (
                  <button type="button" className="text-red-600 sm:ml-2" onClick={async () => { await handleDeleteFile(p.url); setPhotos(photos.length === 1 ? [{ url: "", file: null }] : photos.filter((_, i) => i !== idx)); if (photoFileRefs.current[idx]) { photoFileRefs.current[idx]!.value = ""; } }}>Delete</button>
                )}
                <button
                  type="button"
                  className="text-zinc-400 hover:text-red-600 text-xl sm:ml-2"
                  title="Remove"
                  onClick={() => setPhotos(photos.length === 1 ? [{ url: "", file: null }] : photos.filter((_, i) => i !== idx))}
                  disabled={photos.length === 1 || !!p.uploading}
                >
                  ✕
                </button>
                {p.error && <span className="text-xs text-red-600 ml-2">{p.error}</span>}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="rounded-md bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
            onClick={() => setPhotos([...photos, { url: "", file: null }])}
          >
            + Add Photo
          </button>
        </div>
        {error ? <p className="text-red-600 text-sm">{error}</p> : null}
        <div className="flex gap-3">
          <button disabled={saving || !youtubeValid} type="submit" className="rounded-md bg-black text-white px-4 py-2 disabled:opacity-60">
            {saving ? "Saving..." : "Create"}
          </button>
          <button type="button" className="rounded-md border px-4 py-2" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}


