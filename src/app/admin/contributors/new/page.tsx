"use client";
import { useState } from "react";

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
import { useRouter } from "next/navigation";
import Image from "next/image";


export default function AddContributorPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [contributorType, setContributorType] = useState("");
  const [branch, setBranch] = useState("");
  const [staffTitle, setStaffTitle] = useState("");
  const [email, setEmail] = useState("");
  const [yearOfPassing, setYearOfPassing] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
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

  type Contributor = { email: string };
  async function checkEmailUnique(email: string) {
    if (!email) return true;
    const res = await fetch(`/api/contributors?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    return !(data.contributors && data.contributors.some((c: Contributor) => c.email === email));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Frontend validation
    if (!name.trim()) return setError("Name is required");
    if (!email.trim()) return setError("Email is required");
    const unique = await checkEmailUnique(email.trim());
    setEmailUnique(unique);
    if (!unique) return setError("Email must be unique");
    if (!contributorType) return setError("Contributor type is required");
    if (contributorType === "student" && !branch) return setError("Branch is required for students");
    if (contributorType === "student" && !yearOfPassing) return setError("Year of passing is required for students");
    if (contributorType === "staff" && !staffTitle) return setError("Staff title is required for staff");
    setSaving(true);
    try {
      let avatar = avatarUrl;
      let profile = profileUrl;
      if (avatarFile) {
        avatar = await uploadToGridFS(avatarFile);
      }
      if (profileFile) {
        profile = await uploadToGridFS(profileFile);
      }
      const res = await fetch("/api/contributors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          avatarUrl: avatar || null,
          profileUrl: profile || null,
          contributorType: contributorType || undefined,
          branch: branch || undefined,
          staffTitle: staffTitle || undefined,
          yearOfPassing: yearOfPassing || undefined,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      router.push("/admin");
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

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Add Contributor</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name <span className="text-red-600">*</span></label>
          <input className="w-full border rounded-md px-3 py-2" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email <span className="text-red-600">*</span></label>
          <input className={`w-full border rounded-md px-3 py-2 ${!emailUnique ? 'border-red-500' : ''}`} value={email} onChange={e => { setEmail(e.target.value); setEmailUnique(true); }} required type="email" />
          {!emailUnique && <p className="text-red-600 text-xs">Email must be unique</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Avatar</label>
          <div className="flex items-center gap-3 mb-1">
            {avatarUrl && (
              <>
                <Image src={avatarUrl} alt="Avatar" width={64} height={64} className="w-16 h-16 object-cover rounded-full border" />
                <button
                  type="button"
                  className="text-red-600 ml-2 text-xs border px-2 py-1 rounded"
                  onClick={async () => {
                    await handleDeleteFile(avatarUrl);
                    setAvatarUrl("");
                  }}
                >Delete</button>
              </>
            )}
          </div>
          <input className="w-full border rounded-md px-3 py-2 mb-1" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="Paste avatar URL or upload a file below" />
          <input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Profile</label>
          <div className="flex items-center gap-3 mb-1">
            {profileUrl && (
              <>
                {profileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <Image src={profileUrl} alt="Profile" width={64} height={64} className="w-16 h-16 object-cover rounded border" />
                ) : (
                  <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="underline text-xs">View file</a>
                )}
                <button
                  type="button"
                  className="text-red-600 ml-2 text-xs border px-2 py-1 rounded"
                  onClick={async () => {
                    await handleDeleteFile(profileUrl);
                    setProfileUrl("");
                  }}
                >Delete</button>
              </>
            )}
          </div>
          <input className="w-full border rounded-md px-3 py-2 mb-1" value={profileUrl} onChange={e => setProfileUrl(e.target.value)} placeholder="Paste profile URL or upload a file below" />
          <input type="file" accept="image/*,application/pdf" onChange={e => setProfileFile(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contributor Type <span className="text-red-600">*</span></label>
          <select className="w-full border rounded-md px-3 py-2" value={contributorType} onChange={e => setContributorType(e.target.value)} required>
            <option value="">Select type</option>
            <option value="student">Student</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        {contributorType === "student" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Branch <span className="text-red-600">*</span></label>
              <select className="w-full border rounded-md px-3 py-2" value={branch} onChange={e => setBranch(e.target.value)} required>
                <option value="">Select branch</option>
                <option value="IT">IT</option>
                <option value="ADS">ADS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Year of Passing <span className="text-red-600">*</span></label>
              <select className="w-full border rounded-md px-3 py-2" value={yearOfPassing} onChange={e => setYearOfPassing(e.target.value)} required>
                <option value="">Select year</option>
                {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() + 4 - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </>
        )}
        {contributorType === "staff" && (
          <div>
            <label className="block text-sm font-medium mb-1">Staff Title <span className="text-red-600">*</span></label>
            <select className="w-full border rounded-md px-3 py-2" value={staffTitle} onChange={e => setStaffTitle(e.target.value)} required>
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
            {saving ? "Saving..." : "Add"}
          </button>
          <button type="button" className="rounded-md border px-4 py-2" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
