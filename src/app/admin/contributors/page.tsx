"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Contributor = {
  _id?: string;
  name: string;
  avatarUrl?: string;
  profileUrl?: string;
  contributorType?: "student" | "staff";
  branch?: "IT" | "ADS";
  staffTitle?: "Assistant Professor" | "Professor" | "Head of Department" | "Assistant Head of Department";
};

export default function ContributorsAdminPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<Contributor[]>([]);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileUrl, setProfileUrl] = useState("");
  const [contributorType, setContributorType] = useState<"student" | "staff" | "">("");
  const [branch, setBranch] = useState<"IT" | "ADS" | "">("");
  const [staffTitle, setStaffTitle] = useState<"Assistant Professor" | "Professor" | "Head of Department" | "Assistant Head of Department" | "">("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/contributors");
        if (!res.ok) {
          setItems([]);
          return;
        }
        const data = await res.json();
        setItems(data.contributors || []);
      } catch {
          setItems([]);
      }
    })();
  }, []);

  if (status === "loading") return null;
  type SessionUserWithRole = { role?: string };
  const userHasAdminRole = (user: unknown): user is SessionUserWithRole => {
    return !!user && typeof user === "object" && "role" in user && typeof (user as { role: unknown }).role === "string";
  };
  if (!session || !userHasAdminRole(session.user) || session.user.role !== "admin") return null;

  async function uploadMedia(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/media/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error("Upload failed");
    return (await res.json()) as { fileId: string; contentType?: string };
  }

  async function addContributor(e: React.FormEvent) {
    e.preventDefault();
    let avatar = avatarUrl;
    if (avatarFile) {
      const up = await uploadMedia(avatarFile);
      avatar = `/api/media/${up.fileId}`;
    }
    const res = await fetch("/api/contributors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, avatarUrl: avatar, profileUrl, contributorType: contributorType || undefined, branch: branch || undefined, staffTitle: staffTitle || undefined }),
    });
    const created = await res.json();
    setItems([created, ...items]);
    setName("");
    setAvatarUrl("");
    setProfileUrl("");
    setContributorType("");
    setBranch("");
    setStaffTitle("");
    setAvatarFile(null);
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Contributors</h1>
      <form onSubmit={addContributor} className="space-y-3 mb-8">
        <input className="w-full border rounded-md px-3 py-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full border rounded-md px-3 py-2" placeholder="Avatar URL (optional)" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
        <div className="flex items-center gap-3">
          <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
          {avatarFile ? <span className="text-xs text-zinc-500">{avatarFile.name}</span> : null}
        </div>
        <input className="w-full border rounded-md px-3 py-2" placeholder="Profile URL (optional)" value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} />
        <div className="flex gap-3">
          <select className="border rounded-md px-3 py-2" value={contributorType} onChange={(e) => setContributorType(e.target.value as "student" | "staff" | "")}> 
            <option value="">Contributor Type</option>
            <option value="student">Student</option>
            <option value="staff">Staff</option>
          </select>
          {contributorType === "student" ? (
            <select className="border rounded-md px-3 py-2" value={branch} onChange={(e) => setBranch(e.target.value as "IT" | "ADS" | "")}> 
              <option value="">Branch</option>
              <option value="IT">IT</option>
              <option value="ADS">ADS</option>
            </select>
          ) : null}
          {contributorType === "staff" ? (
            <select className="border rounded-md px-3 py-2" value={staffTitle} onChange={(e) => setStaffTitle(e.target.value as "Assistant Professor" | "Professor" | "Head of Department" | "Assistant Head of Department" | "")}> 
              <option value="">Staff Title</option>
              <option>Assistant Professor</option>
              <option>Professor</option>
              <option>Head of Department</option>
              <option>Assistant Head of Department</option>
            </select>
          ) : null}
        </div>
        <button className="rounded-md bg-black text-white px-4 py-2" type="submit">Add</button>
      </form>

      <ul className="space-y-2">
        {items.map((c) => (
          <li key={c._id} className="flex items-center justify-between border rounded-md px-3 py-2">
            <span>{c.name}</span>
            <div className="flex gap-2">
              <a className="underline" href={c.profileUrl || "#"} target="_blank">Profile</a>
              {c._id && (
                <a className="underline text-blue-600" href={`/admin/contributors/${c._id}`}>Edit</a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}


