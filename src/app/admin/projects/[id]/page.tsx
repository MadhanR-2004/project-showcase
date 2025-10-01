
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";

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
  } catch { }
  return null;
}
export default function EditProjectPage() {
  const router = useRouter();
  const { id } = useParams();
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");
  
  // Upload-on-save: Store File objects and previews
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState("");
  const [posterUrl, setPosterUrl] = useState(""); // URL input
  const [posterRemoved, setPosterRemoved] = useState(false);
  const posterFileRef = useRef<HTMLInputElement | null>(null);
  const [posterFileKey, setPosterFileKey] = useState(0);
  
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState(""); // URL input
  const [thumbnailRemoved, setThumbnailRemoved] = useState(false);
  const thumbnailFileRef = useRef<HTMLInputElement | null>(null);
  const [thumbnailFileKey, setThumbnailFileKey] = useState(0);
  
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeValid, setYoutubeValid] = useState(true);
  const [gdriveUrl, setGdriveUrl] = useState("");
  const [onedriveUrl, setOnedriveUrl] = useState("");
  
  // Showcase photos: { existingUrl?: string, file?: File, preview?: string, url?: string, removed?: boolean }
  const [photos, setPhotos] = useState<{
    existingUrl?: string;
    file?: File;
    preview?: string;
    url?: string; // URL input
    removed?: boolean;
  }[]>([]);
  const photoFileRefs = useRef<Array<HTMLInputElement | null>>([]);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allContributors, setAllContributors] = useState<{ _id: string; name: string; email: string; avatarUrl?: string; profileUrl?: string }[]>([]);
  const [selectedContribs, setSelectedContribs] = useState<{
    id: string;
    name?: string;
    projectRole: "mentor" | "team-leader" | "team-member" | "project-head" | "";
  }[]>([]);
  const [contributorSearches, setContributorSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track original poster/thumbnail for deletion on save if replaced
  const [originalPosterUrl, setOriginalPosterUrl] = useState("");
  const [originalThumbnailUrl, setOriginalThumbnailUrl] = useState("");

  // Prevent navigation during save
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saving) {
        e.preventDefault();
        e.returnValue = "Save in progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saving]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setTitle(data.title || "");
        setShortDescription(data.shortDescription || "");
        setDescription(data.description || "");
        setTechStack(data.techStack || []);
        
        // Set existing poster
        if (data.poster) {
          setPosterPreview(data.poster);
          setOriginalPosterUrl(data.poster);
        }
        
        // Set existing thumbnail
        if (data.thumbnail) {
          setThumbnailPreview(data.thumbnail);
          setOriginalThumbnailUrl(data.thumbnail);
        }
        
        if (data.media?.kind === "youtube") {
          setYoutubeUrl(data.media.url || "");
          setYoutubeValid(!data.media.url || !!extractYouTubeId(data.media.url));
        } else if (data.media?.kind === "gdrive") {
          setGdriveUrl(data.media.url || "");
        } else if (data.media?.kind === "onedrive") {
          setOnedriveUrl(data.media.url || "");
        }
        
        // Set existing showcase photos
        if (Array.isArray(data.showcasePhotos) && data.showcasePhotos.length > 0) {
          setPhotos(data.showcasePhotos.map((url: string) => ({
            existingUrl: url,
            preview: url
          })));
        }
        
        // Contributors
        if (Array.isArray(data.contributors)) {
          setSelectedContribs(data.contributors.map((c: { id: string; name?: string; projectRole?: string }) => ({
            id: c.id || "",
            name: c.name || "",
            projectRole: (c.projectRole as "mentor" | "team-leader" | "team-member" | "project-head" | "") || ""
          })));
        }
        setLoading(false);
      } catch {
        setError("Project not found");
        setLoading(false);
      }
    })();
  }, [id]);

  // Fetch all contributors for select
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/contributors");
        if (!res.ok) {
          setAllContributors([]);
          return;
        }
        const data = await res.json();
  setAllContributors((data.contributors || []).map((c: { _id: string; name: string; email: string; avatarUrl?: string; profileUrl?: string }) => ({ _id: c._id, name: c.name, email: c.email, avatarUrl: c.avatarUrl, profileUrl: c.profileUrl })));
      } catch {
        setAllContributors([]);
      }
    })();
  }, []);

  // No cleanup needed! Files are only uploaded on save, not immediately


  function appendEmptyContributor() {
    setSelectedContribs([...selectedContribs, { id: "", name: "", projectRole: "" }]);
    setContributorSearches([...contributorSearches, ""]);
  }

  function setContributorId(index: number, id: string) {
    const next = [...selectedContribs];
    next[index].id = id;
    if (id) {
      // Find the selected contributor to get their name
      const selected = allContributors.find(c => c._id === id);
      if (selected) {
        next[index].name = selected.name;
      }
    }
    setSelectedContribs(next);
    
    // Clear search when contributor is selected
    if (id) {
      const nextSearches = [...contributorSearches];
      nextSearches[index] = "";
      setContributorSearches(nextSearches);
    }
  }

  function updateContributorSearch(index: number, search: string) {
    const next = [...contributorSearches];
    next[index] = search;
    setContributorSearches(next);
    
    // Clear selected contributor when user starts typing
    if (search && selectedContribs[index]?.id) {
      const nextContribs = [...selectedContribs];
      nextContribs[index].id = "";
      nextContribs[index].name = "";
      setSelectedContribs(nextContribs);
    }
  }

  function getFilteredContributors(index: number) {
    const search = contributorSearches[index] || "";
    if (!search.trim()) return allContributors;
    
    const searchLower = search.toLowerCase();
    return allContributors.filter(c => 
      c.name.toLowerCase().includes(searchLower) || 
      c.email.toLowerCase().includes(searchLower)
    );
  }

  // function setContributorName(index: number, name: string) {
  //   ...unused
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
    
    const nextSearches = [...contributorSearches];
    nextSearches.splice(index, 1);
    setContributorSearches(nextSearches);
  }

  async function handleDeleteFile(url: string, keepalive = false) {
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
        keepalive, // Use keepalive flag for cleanup during page unload
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete file');
      }
      
      console.log('File deleted successfully:', fileId);
    } catch (error) {
      console.error('Error deleting file:', error);
      if (!keepalive) { // Only show alert if not during cleanup
        alert(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  async function uploadToGridFS(file: File, signal?: AbortSignal) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/media/upload", {
      method: "POST",
      body: formData,
      signal,
    });
    if (!res.ok) throw new Error("Upload failed");
    return (await res.json()) as { fileId: string; contentType?: string };
  }

  // function handlePhotoUpload(idx: number) {
  //   ...unused
  // }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    // Frontend validation
    if (!title.trim()) return setError("Title is required");
    if (!posterPreview && !posterFile && !posterUrl) return setError("Poster image is required");
    if (!youtubeUrl.trim() && !gdriveUrl.trim() && !onedriveUrl.trim()) return setError("At least one project video is required");
    if (!photos.some(p => (p.preview && !p.removed) || p.file || p.url)) return setError("At least one showcase image is required");
    if (!shortDescription.trim()) return setError("Short description is required");
    if (!description.trim()) return setError("Description is required");
    if (!techStack.length) return setError("At least one tech stack is required");
    if (!selectedContribs.length || !selectedContribs.some(c => c.id || c.name)) return setError("At least one contributor is required");
    
    setSaving(true);
    
    // AbortController for cancellable uploads
    const abortController = new AbortController();
    const uploadedFiles: string[] = []; // Track uploaded files for rollback
    
    try {
      // Upload new poster if changed
      let posterUrlFinal = "";
      if (posterFile) {
        const up = await uploadToGridFS(posterFile, abortController.signal);
        posterUrlFinal = `/api/media/${up.fileId}`;
        uploadedFiles.push(posterUrlFinal);
        
        // Delete old poster if exists
        if (originalPosterUrl && originalPosterUrl.startsWith("/api/media/")) {
          await handleDeleteFile(originalPosterUrl);
        }
      } else if (posterUrl) {
        // Use URL provided by user
        posterUrlFinal = posterUrl;
      } else if (posterRemoved) {
        // Poster was removed
        if (originalPosterUrl && originalPosterUrl.startsWith("/api/media/")) {
          await handleDeleteFile(originalPosterUrl);
        }
      } else if (posterPreview) {
        // Keep existing poster
        posterUrlFinal = posterPreview;
      }
      
      // Upload new thumbnail if changed
      let thumbnailUrlFinal = "";
      if (thumbnailFile) {
        const up = await uploadToGridFS(thumbnailFile, abortController.signal);
        thumbnailUrlFinal = `/api/media/${up.fileId}`;
        uploadedFiles.push(thumbnailUrlFinal);
        
        // Delete old thumbnail if exists
        if (originalThumbnailUrl && originalThumbnailUrl.startsWith("/api/media/")) {
          await handleDeleteFile(originalThumbnailUrl);
        }
      } else if (thumbnailUrl) {
        // Use URL provided by user
        thumbnailUrlFinal = thumbnailUrl;
      } else if (thumbnailRemoved) {
        // Thumbnail was removed
        if (originalThumbnailUrl && originalThumbnailUrl.startsWith("/api/media/")) {
          await handleDeleteFile(originalThumbnailUrl);
        }
      } else if (thumbnailPreview) {
        // Keep existing thumbnail
        thumbnailUrlFinal = thumbnailPreview;
      }
      
      // Handle showcase photos
      const showcasePhotos: string[] = [];
      const originalUrls = new Set(photos.filter(p => p.existingUrl).map(p => p.existingUrl!));
      
      for (const photo of photos) {
        if (photo.removed) {
          // Delete removed photo
          if (photo.existingUrl && photo.existingUrl.startsWith("/api/media/")) {
            await handleDeleteFile(photo.existingUrl);
          }
        } else if (photo.file) {
          // Upload new photo
          const up = await uploadToGridFS(photo.file, abortController.signal);
          const photoUrl = `/api/media/${up.fileId}`;
          showcasePhotos.push(photoUrl);
          uploadedFiles.push(photoUrl);
          
          // If replacing existing photo, delete old one
          if (photo.existingUrl && photo.existingUrl.startsWith("/api/media/")) {
            await handleDeleteFile(photo.existingUrl);
          }
        } else if (photo.url) {
          // Use URL provided by user
          showcasePhotos.push(photo.url);
        } else if (photo.existingUrl) {
          // Keep existing photo
          showcasePhotos.push(photo.existingUrl);
        }
      }
      
      // Video media
      let media: { kind: "youtube" | "gdrive" | "onedrive"; url: string; youtubeId?: string } | undefined = undefined;
      if (youtubeUrl && extractYouTubeId(youtubeUrl)) {
        media = { kind: "youtube", url: youtubeUrl, youtubeId: extractYouTubeId(youtubeUrl) ?? undefined };
      } else if (gdriveUrl) {
        media = { kind: "gdrive", url: gdriveUrl };
      } else if (onedriveUrl) {
        media = { kind: "onedrive", url: onedriveUrl };
      }
      
      const body = {
        title,
        shortDescription,
        description,
        techStack,
        poster: posterUrlFinal || undefined,
        thumbnail: thumbnailUrlFinal || undefined,
        media,
        showcasePhotos,
        contributors: selectedContribs
          .filter((c) => c.id || c.name)
          .map((c: { id: string; name?: string; projectRole: string }) => ({
            id: c.id || crypto.randomUUID(),
            name: c.id ? (allContributors.find((a) => a._id === c.id)?.name || "") : (c.name || ""),
            profileUrl: c.id ? allContributors.find((a) => a._id === c.id)?.profileUrl : undefined,
            avatarUrl: c.id ? allContributors.find((a) => a._id === c.id)?.avatarUrl : undefined,
            projectRole: c.projectRole,
          })),
        isPublished: true,
      };
      
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Update failed");
      const project = await res.json();
      
      router.push(`/projects/${project._id}`);
    } catch (err: unknown) {
      // Rollback uploaded files on error or cancellation
      if (uploadedFiles.length > 0) {
        console.log('Rolling back uploaded files:', uploadedFiles);
        for (const fileUrl of uploadedFiles) {
          try {
            await handleDeleteFile(fileUrl, true); // keepalive = true
          } catch (deleteErr) {
            console.error('Failed to delete file during rollback:', fileUrl, deleteErr);
          }
        }
      }
      
      // Handle abort gracefully
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Upload cancelled by user');
        setError("Upload cancelled");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
      setSaving(false);
    }
  }

  if (loading) return <div className="min-h-screen p-6 max-w-3xl mx-auto">Loading...</div>;
  if (error) return <div className="min-h-screen p-6 max-w-3xl mx-auto text-red-600">{error}</div>;

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Edit Project</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title <span className="text-red-600">*</span></label>
          <input className="w-full border rounded-md px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Short Description <span className="text-red-600">*</span></label>
          <input className="w-full border rounded-md px-3 py-2" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description <span className="text-red-600">*</span></label>
          <textarea className="w-full border rounded-md px-3 py-2 min-h-[100px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter project description (plain text)" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Poster Image <span className="text-red-600">*</span></label>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <input
                key={posterFileKey}
                ref={posterFileRef}
                type="file"
                accept="image/*"
                disabled={!!posterUrl}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  setPosterFile(file);
                  setPosterPreview(URL.createObjectURL(file));
                  setPosterRemoved(false);
                }}
              />
              {posterPreview && <Image src={posterPreview} alt="Poster Preview" className="w-12 h-12 object-cover rounded border" width={48} height={48} unoptimized />}
              {posterPreview && (
                <button type="button" className="text-red-600 sm:ml-2" onClick={() => {
                  setPosterFile(null);
                  setPosterPreview("");
                  setPosterRemoved(true);
                  setPosterFileKey(k => k + 1);
                }}>Remove</button>
              )}
              {posterFile && <span className="text-xs text-blue-600">Will upload on save</span>}
              {posterRemoved && <span className="text-xs text-orange-600">Will be removed on save</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">OR</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="url"
                placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                className="flex-1 border rounded-md px-3 py-2"
                value={posterUrl}
                disabled={!!posterFile || !!posterPreview}
                onChange={(e) => setPosterUrl(e.target.value)}
              />
              {posterUrl && (
                <button
                  type="button"
                  className="text-red-600 px-2"
                  onClick={() => setPosterUrl("")}
                >
                  Clear
                </button>
              )}
            </div>
            {posterUrl && (
              <div className="flex items-center gap-2">
                <Image src={posterUrl} alt="URL Preview" className="w-12 h-12 object-cover rounded border" width={48} height={48} unoptimized />
                <span className="text-xs text-blue-600">Using URL (no upload needed)</span>
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Thumbnail (for lists/cards)</label>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <input
                key={thumbnailFileKey}
                ref={thumbnailFileRef}
                type="file"
                accept="image/*"
                disabled={!!thumbnailUrl}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  setThumbnailFile(file);
                  setThumbnailPreview(URL.createObjectURL(file));
                  setThumbnailRemoved(false);
                }}
              />
              {thumbnailPreview && <Image src={thumbnailPreview} alt="Thumbnail Preview" className="w-12 h-12 object-cover rounded border" width={48} height={48} unoptimized />}
              {thumbnailPreview && (
                <button type="button" className="text-red-600 sm:ml-2" onClick={() => {
                  setThumbnailFile(null);
                  setThumbnailPreview("");
                  setThumbnailRemoved(true);
                  setThumbnailFileKey(k => k + 1);
                }}>Remove</button>
              )}
              {thumbnailFile && <span className="text-xs text-blue-600">Will upload on save</span>}
              {thumbnailRemoved && originalThumbnailUrl && <span className="text-xs text-orange-600">Will be removed on save</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">OR</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="url"
                placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                className="flex-1 border rounded-md px-3 py-2"
                value={thumbnailUrl}
                disabled={!!thumbnailFile || !!thumbnailPreview}
                onChange={(e) => setThumbnailUrl(e.target.value)}
              />
              {thumbnailUrl && (
                <button
                  type="button"
                  className="text-red-600 px-2"
                  onClick={() => setThumbnailUrl("")}
                >
                  Clear
                </button>
              )}
            </div>
            {thumbnailUrl && (
              <div className="flex items-center gap-2">
                <Image src={thumbnailUrl} alt="URL Preview" className="w-12 h-12 object-cover rounded border" width={48} height={48} unoptimized />
                <span className="text-xs text-blue-600">Using URL (no upload needed)</span>
              </div>
            )}
          </div>
        </div>
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
        <div>
          <label className="block text-sm font-medium mb-1">Contributors <span className="text-red-600">*</span></label>
          <ul className="space-y-4 mb-4">
            {selectedContribs.map((c, idx) => (
              <li key={`${c.id}-${idx}`} className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 flex flex-wrap items-center gap-3 shadow-sm border border-zinc-200 dark:border-zinc-700">
                <div className="flex flex-col gap-1 min-w-[250px]">
                  <label className="text-xs text-zinc-500">Select Contributor</label>
                  
                  {/* Show selected contributor name */}
                  {c.id && c.name ? (
                    <div className="border rounded-md px-3 py-2 bg-white dark:bg-zinc-900 flex items-center justify-between">
                      <span className="font-medium">{c.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...selectedContribs];
                          next[idx].id = "";
                          next[idx].name = "";
                          setSelectedContribs(next);
                        }}
                        className="text-zinc-400 hover:text-red-600 ml-2"
                        title="Clear selection"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Search input */}
                      <input
                        type="text"
                        className="border rounded-md px-3 py-2 mb-1"
                        placeholder="Search by name or email..."
                        value={contributorSearches[idx] || ""}
                        onChange={(e) => updateContributorSearch(idx, e.target.value)}
                      />
                      {/* Dropdown with filtered results */}
                      <select 
                        className="border rounded-md px-3 py-2" 
                        value={c.id} 
                        onChange={(e) => setContributorId(idx, e.target.value)}
                        size={Math.min(5, Math.max(2, getFilteredContributors(idx).length + 1))}
                      >
                        <option value="">Select Contributor</option>
                        {getFilteredContributors(idx).map((opt) => (
                          <option key={opt._id} value={opt._id}>
                            {opt.name} - {opt.email}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
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
          <label className="block text-sm font-medium mb-1">Showcase Photos <span className="text-red-600">*</span></label>
          <ul className="space-y-4 mb-2">
            {photos.map((p, idx) => (
              <li key={idx} className="border rounded-lg p-4 space-y-3">
                {!p.removed && (
                  <>
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                      <input
                        ref={el => { photoFileRefs.current[idx] = el; }}
                        type="file"
                        accept="image/*"
                        disabled={!!p.url}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const next = [...photos];
                          next[idx].file = file;
                          next[idx].preview = URL.createObjectURL(file);
                          setPhotos(next);
                        }}
                      />
                      {p.preview && (
                        <Image src={p.preview} alt="Showcase Preview" width={48} height={48} className="w-12 h-12 object-cover rounded border" unoptimized />
                      )}
                      {p.preview && (
                        <button type="button" className="text-red-600 sm:ml-2" onClick={() => {
                          const next = [...photos];
                          if (p.existingUrl) {
                            // Mark existing photo for removal
                            next[idx].removed = true;
                          } else {
                            // Remove new photo slot
                            next.splice(idx, 1);
                          }
                          setPhotos(next.length > 0 ? next : [{}]);
                          if (photoFileRefs.current[idx]) {
                            photoFileRefs.current[idx]!.value = "";
                          }
                        }}>Remove</button>
                      )}
                      {p.file && <span className="text-xs text-blue-600">Will upload on save</span>}
                      {p.existingUrl && !p.file && <span className="text-xs text-zinc-500">Existing photo</span>}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">OR</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="Enter image URL"
                        className="flex-1 border rounded-md px-3 py-2"
                        value={p.url || ""}
                        disabled={!!p.file || !!p.preview}
                        onChange={(e) => {
                          const next = [...photos];
                          next[idx].url = e.target.value;
                          setPhotos(next);
                        }}
                      />
                      {p.url && (
                        <button
                          type="button"
                          className="text-red-600 px-2"
                          onClick={() => {
                            const next = [...photos];
                            next[idx].url = "";
                            setPhotos(next);
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    
                    {p.url && (
                      <div className="flex items-center gap-2">
                        <Image src={p.url} alt="URL Preview" className="w-12 h-12 object-cover rounded border" width={48} height={48} unoptimized />
                        <span className="text-xs text-blue-600">Using URL (no upload needed)</span>
                      </div>
                    )}
                  </>
                )}
                {p.removed && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-orange-600">Will be removed on save</span>
                    <button type="button" className="text-blue-600 text-sm" onClick={() => {
                      const next = [...photos];
                      next[idx].removed = false;
                      setPhotos(next);
                    }}>Undo</button>
                  </div>
                )}
                <button
                  type="button"
                  className="text-zinc-400 hover:text-red-600 text-sm"
                  title="Delete Slot"
                  onClick={() => {
                    const next = photos.filter((_, i) => i !== idx);
                    setPhotos(next.length > 0 ? next : [{}]);
                  }}
                  disabled={photos.length === 1}
                >
                  ✕ Delete Slot
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="rounded-md bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
            onClick={() => setPhotos([...photos, {}])}
          >
            + Add Photo
          </button>
        </div>
        {error ? <p className="text-red-600 text-sm">{error}</p> : null}
        <div className="flex gap-3">
          <button disabled={saving || !youtubeValid} type="submit" className="rounded-md bg-black text-white px-4 py-2 disabled:opacity-60">
            {saving ? "Saving..." : "Save"}
          </button>
          <button type="button" className="rounded-md border px-4 py-2" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
