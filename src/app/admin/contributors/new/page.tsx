"use client";
import { useState, useEffect, useRef } from "react";

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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarFileRef = useRef<HTMLInputElement | null>(null);
  const [avatarFileKey, setAvatarFileKey] = useState(0);
  const [profileUrl, setProfileUrl] = useState("");
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const profileFileRef = useRef<HTMLInputElement | null>(null);
  const [profileFileKey, setProfileFileKey] = useState(0);
  const [contributorType, setContributorType] = useState("");
  const [branch, setBranch] = useState("");
  const [staffTitle, setStaffTitle] = useState("");
  const [email, setEmail] = useState("");
  const [yearOfPassing, setYearOfPassing] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [emailUnique, setEmailUnique] = useState(true);
  const [emailChecking, setEmailChecking] = useState(false);

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
    setEmailChecking(true);
    try {
      const res = await fetch(`/api/contributors?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      const isUnique = !(data.contributors && data.contributors.some((c: Contributor) => c.email === email));
      setEmailUnique(isUnique);
      return isUnique;
    } catch (error) {
      console.error('Error checking email uniqueness:', error);
      return true; // Assume unique on error
    } finally {
      setEmailChecking(false);
    }
  }

  // Real-time email validation with debouncing
  useEffect(() => {
    if (!email.trim()) {
      setEmailUnique(true);
      return;
    }

    const timeoutId = setTimeout(() => {
      checkEmailUnique(email.trim());
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [email]);

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
      const avatar = avatarUrl;
      const profile = profileUrl;
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
          <div className="relative">
            <input 
              className={`w-full border rounded-md px-3 py-2 pr-10 ${!emailUnique ? 'border-red-500' : emailUnique && email ? 'border-green-500' : ''}`} 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              type="email" 
              placeholder="Enter email address"
            />
            {emailChecking && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
            {!emailChecking && email && emailUnique && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            {!emailChecking && email && !emailUnique && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          {!emailUnique && <p className="text-red-600 text-xs mt-1">This email is already in use</p>}
          {emailUnique && email && !emailChecking && <p className="text-green-600 text-xs mt-1">Email is available</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Avatar</label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <input
              key={avatarFileKey}
              ref={avatarFileRef}
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0] ?? null;
                if (!file) return;
                setAvatarUploading(true);
                setAvatarError(null);
                try {
                  const up = await uploadToGridFS(file);
                  setAvatarUrl(up);
                } catch (err: unknown) {
                  setAvatarError(err instanceof Error ? err.message : "Upload failed");
                  if (avatarFileRef.current) avatarFileRef.current.value = "";
                  setAvatarFileKey((k) => k + 1);
                } finally {
                  setAvatarUploading(false);
                }
              }}
              disabled={avatarUploading}
            />
            {avatarUploading && <span className="text-xs text-zinc-500">Uploading...</span>}
            {avatarUrl && <Image src={avatarUrl} alt="Avatar" width={48} height={48} className="w-12 h-12 object-cover rounded-full border" unoptimized />}
            {avatarUrl && (
              <button type="button" className="text-red-600 sm:ml-2" onClick={async () => { await handleDeleteFile(avatarUrl); setAvatarUrl(""); setAvatarFileKey(k => k + 1); }}>Delete</button>
            )}
            {avatarError && <span className="text-xs text-red-600">{avatarError}</span>}
            <span className="text-xs text-zinc-500 block sm:inline sm:mx-1">or</span>
            <input className="border rounded-md px-3 py-2 w-full sm:flex-1" placeholder="Avatar URL (optional)" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Profile</label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <input
              key={profileFileKey}
              ref={profileFileRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={async (e) => {
                const file = e.target.files?.[0] ?? null;
                if (!file) return;
                setProfileUploading(true);
                setProfileError(null);
                try {
                  const up = await uploadToGridFS(file);
                  setProfileUrl(up);
                } catch (err: unknown) {
                  setProfileError(err instanceof Error ? err.message : "Upload failed");
                  if (profileFileRef.current) profileFileRef.current.value = "";
                  setProfileFileKey((k) => k + 1);
                } finally {
                  setProfileUploading(false);
                }
              }}
              disabled={profileUploading}
            />
            {profileUploading && <span className="text-xs text-zinc-500">Uploading...</span>}
            {profileUrl && (profileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <Image src={profileUrl} alt="Profile" width={48} height={48} className="w-12 h-12 object-cover rounded border" unoptimized />
            ) : (
              <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="underline text-xs">View file</a>
            ))}
            {profileUrl && (
              <button type="button" className="text-red-600 sm:ml-2" onClick={async () => { await handleDeleteFile(profileUrl); setProfileUrl(""); setProfileFileKey(k => k + 1); }}>Delete</button>
            )}
            {profileError && <span className="text-xs text-red-600">{profileError}</span>}
            <span className="text-xs text-zinc-500 block sm:inline sm:mx-1">or</span>
            <input className="border rounded-md px-3 py-2 w-full sm:flex-1" placeholder="Profile URL (optional)" value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} />
          </div>
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
