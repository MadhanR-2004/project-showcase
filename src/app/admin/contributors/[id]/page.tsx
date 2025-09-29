"use client";

import { useEffect, useState } from "react";
// Delete file from GridFS by file URL
async function handleDeleteFile(url: string) {
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
    alert(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";



type Contributor = {
  _id?: string;
  name: string;
  email: string;
  avatarUrl?: string;
  profileUrl?: string;
  contributorType?: "student" | "staff";
  branch?: "IT" | "ADS";
  staffTitle?: "Assistant Professor" | "Professor" | "Head of Department" | "Assistant Head of Department";
  yearOfPassing?: string;
};

export default function EditContributorPage() {
  const router = useRouter();
  const { id } = useParams();
  const [contributor, setContributor] = useState<Contributor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/contributors/${id}`)
      .then((res) => res.ok ? res.json() : Promise.reject("Not found"))
      .then((data) => {
        setContributor(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Contributor not found");
        setLoading(false);
      });
  }, [id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    if (!contributor) return;
    // Always set required fields to a string (never undefined)
    setContributor({
      ...contributor,
      [e.target.name]: e.target.value ?? ""
    });
    if (e.target.name === "email") setEmailUnique(true);
  }

  const [emailUnique, setEmailUnique] = useState(true);

  async function uploadToGridFS(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/media/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return `/api/media/${data.fileId}`;
  }

  async function checkEmailUnique(email: string) {
    if (!email) return true;
    const res = await fetch(`/api/contributors?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    // Allow current contributor's own email
    return !(data.contributors && data.contributors.some((c: Contributor) => c.email === email && c._id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!contributor) return setError("Contributor not loaded");
    // Frontend validation
    if (!contributor.name || !contributor.name.trim()) return setError("Name is required");
    if (!contributor.email || !contributor.email.trim()) return setError("Email is required");
    const unique = await checkEmailUnique(contributor.email.trim());
    setEmailUnique(unique);
    if (!unique) return setError("Email must be unique");
    if (!contributor.contributorType) return setError("Contributor type is required");
    if (contributor.contributorType === "student" && !contributor.branch) return setError("Branch is required for students");
    if (contributor.contributorType === "student" && !contributor.yearOfPassing) return setError("Year of passing is required for students");
    if (contributor.contributorType === "staff" && !contributor.staffTitle) return setError("Staff title is required for staff");
    setSaving(true);
    try {
      let avatar = contributor.avatarUrl;
      let profile = contributor.profileUrl;
      if (avatarFile) {
        avatar = await uploadToGridFS(avatarFile);
      }
      if (profileFile) {
        profile = await uploadToGridFS(profileFile);
      }
      const res = await fetch(`/api/contributors/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...contributor,
          avatarUrl: avatar || null,
          profileUrl: profile || null,
        }),
      });
      if (res.ok) {
        router.push("/admin");
      } else {
        setError("Failed to update contributor");
        setSaving(false);
      }
    } catch (err: unknown) {
      function isErrorWithMessage(e: unknown): e is { message: string } {
        return (
          typeof e === "object" &&
          e !== null &&
          "message" in e &&
          typeof (e as { message: unknown }).message === "string"
        );
      }
      if (isErrorWithMessage(err)) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!contributor) return null;

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Edit Contributor</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name <span className="text-red-600">*</span></label>
          <input className="w-full border rounded-md px-3 py-2" name="name" value={contributor.name || ""} onChange={handleChange} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email <span className="text-red-600">*</span></label>
          <input className={`w-full border rounded-md px-3 py-2 ${!emailUnique ? 'border-red-500' : ''}`} name="email" value={contributor.email || ""} onChange={handleChange} required type="email" />
          {!emailUnique && <p className="text-red-600 text-xs">Email must be unique</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Avatar</label>
          <div className="flex items-center gap-3 mb-1">
            {contributor.avatarUrl && (
              <>
                <Image src={contributor.avatarUrl} alt="Avatar" width={64} height={64} className="w-16 h-16 object-cover rounded-full border" />
                <button
                  type="button"
                  className="text-red-600 ml-2 text-xs border px-2 py-1 rounded"
                  onClick={async () => {
                    if (contributor.avatarUrl) {
                      await handleDeleteFile(contributor.avatarUrl);
                    }
                    setContributor({ ...contributor, avatarUrl: undefined });
                  }}
                >Delete</button>
              </>
            )}
          </div>
          <input className="w-full border rounded-md px-3 py-2 mb-1" name="avatarUrl" value={contributor.avatarUrl || ""} onChange={handleChange} placeholder="Paste avatar URL or upload a file below" />
          <input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Profile</label>
          <div className="flex items-center gap-3 mb-1">
            {contributor.profileUrl && (
              <>
                {contributor.profileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <Image src={contributor.profileUrl} alt="Profile" width={64} height={64} className="w-16 h-16 object-cover rounded border" />
                ) : (
                  <a href={contributor.profileUrl} target="_blank" rel="noopener noreferrer" className="underline text-xs">View file</a>
                )}
                <button
                  type="button"
                  className="text-red-600 ml-2 text-xs border px-2 py-1 rounded"
                  onClick={async () => {
                    if (contributor.profileUrl) {
                      await handleDeleteFile(contributor.profileUrl);
                    }
                    setContributor({ ...contributor, profileUrl: undefined });
                  }}
                >Delete</button>
              </>
            )}
          </div>
          <input className="w-full border rounded-md px-3 py-2 mb-1" name="profileUrl" value={contributor.profileUrl || ""} onChange={handleChange} placeholder="Paste profile URL or upload a file below" />
          <input type="file" accept="image/*,application/pdf" onChange={e => setProfileFile(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contributor Type <span className="text-red-600">*</span></label>
          <select className="w-full border rounded-md px-3 py-2" name="contributorType" value={contributor.contributorType || ""} onChange={handleChange} required>
            <option value="">Select type</option>
            <option value="student">Student</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        {contributor.contributorType === "student" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Branch <span className="text-red-600">*</span></label>
              <select className="w-full border rounded-md px-3 py-2" name="branch" value={contributor.branch || ""} onChange={handleChange} required>
                <option value="">Select branch</option>
                <option value="IT">IT</option>
                <option value="ADS">ADS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Year of Passing <span className="text-red-600">*</span></label>
              <select className="w-full border rounded-md px-3 py-2" name="yearOfPassing" value={contributor.yearOfPassing || ""} onChange={handleChange} required>
                <option value="">Select year</option>
                {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() + 4 - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </>
        )}
        {contributor.contributorType === "staff" && (
          <div>
            <label className="block text-sm font-medium mb-1">Staff Title <span className="text-red-600">*</span></label>
            <select className="w-full border rounded-md px-3 py-2" name="staffTitle" value={contributor.staffTitle || ""} onChange={handleChange} required>
              <option value="">Select title</option>
              <option>Assistant Professor</option>
              <option>Professor</option>
              <option>Head of Department</option>
              <option>Assistant Head of Department</option>
            </select>
          </div>
        )}
        {error ? <p className="text-red-600 text-sm">{error}</p> : null}
        <div className="flex gap-3">
          <button disabled={saving} type="submit" className="rounded-md bg-black text-white px-4 py-2 disabled:opacity-60">
            {saving ? "Saving..." : "Save"}
          </button>
          <button type="button" className="rounded-md border px-4 py-2" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
