"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import LogoutButton from "./LogoutButton";
import Link from "next/link";
import Image from "next/image";

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={`px-4 py-2 rounded-t-md font-semibold border-b-2 transition-colors ${active ? "border-blue-600 text-blue-600 bg-zinc-100 dark:bg-zinc-800" : "border-transparent text-zinc-500 hover:text-blue-600"}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}


type SessionUserWithRole = { role?: string };
const userHasAdminRole = (user: unknown): user is SessionUserWithRole => {
  return !!user && typeof user === "object" && "role" in user && typeof (user as { role: unknown }).role === "string";
};

export default function AdminTabsPage() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<"projects" | "contributors" | "create-admin">(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const t = url.searchParams.get("tab");
      if (t === "contributors" || t === "projects" || t === "create-admin") return t;
    }
    return "projects";
  });

  if (status === "loading") return null;
  if (!session || !userHasAdminRole(session.user) || session.user.role !== "admin") {
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    return null;
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
  <LogoutButton />
      </div>
      <div className="flex gap-2 border-b mb-8">
        <TabButton active={tab === "projects"} onClick={() => setTab("projects")}>Manage Projects</TabButton>
        <TabButton active={tab === "contributors"} onClick={() => setTab("contributors")}>Manage Contributors</TabButton>
        <TabButton active={tab === "create-admin"} onClick={() => setTab("create-admin")}>Create Admin</TabButton>
      </div>
      <div>
        {tab === "projects" ? <ProjectsTab /> : tab === "contributors" ? <ContributorsTab /> : <CreateAdminTab />}
      </div>
    </div>
  );
}

type Project = {
  _id?: string;
  title: string;
  shortDescription?: string;
  techStack?: string[];
};

function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data.projects || []);
      setLoading(false);
    })();
  }, []);
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Projects</h2>
  <Link href="/admin/projects/new" className="rounded-md bg-blue-600 text-white px-4 py-2 font-semibold">+ Add Project</Link>
      </div>
      {loading ? <p>Loading...</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <div key={p._id} className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-700 p-5 flex flex-col gap-3">
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-1">{p.title}</h3>
                <p className="text-xs text-zinc-500 mb-2">ID: {p._id}</p>
                {p.shortDescription && <p className="text-sm mb-2">{p.shortDescription}</p>}
                {p.techStack && p.techStack.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs text-zinc-500">Tech Stack: </span>
                    {p.techStack.map((t, i) => (
                      <span key={i} className="inline-block bg-zinc-200 dark:bg-zinc-700 rounded px-2 py-0.5 text-xs">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <Link href={`/projects/${p._id}`} className="rounded bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-semibold">View</Link>
                <Link href={`/admin/projects/${p._id}`} className="rounded bg-blue-100 text-blue-700 px-3 py-1 text-xs font-semibold">Edit</Link>
                <button className="rounded bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold" onClick={async () => {
                  if (confirm("Delete this project?")) {
                    await fetch(`/api/projects/${p._id}`, { method: "DELETE" });
                    setProjects(projects.filter(pr => pr._id !== p._id));
                  }
                }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type Contributor = {
  _id?: string;
  name: string;
  profileUrl?: string;
  contributorType?: string;
  branch?: string;
  staffTitle?: string;
};

function ContributorsTab() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/contributors");
      const data = await res.json();
      setContributors(data.contributors || []);
      setLoading(false);
    })();
  }, []);
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Contributors</h2>
  <Link href="/admin/contributors/new" className="rounded-md bg-blue-600 text-white px-4 py-2 font-semibold">+ Add Contributor</Link>
      </div>
      {loading ? <p>Loading...</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {contributors.map((c) => (
            <div key={c._id} className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-700 p-5 flex flex-col gap-3">
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-1">{c.name}</h3>
                <p className="text-xs text-zinc-500 mb-2">Type: {c.contributorType || "-"}</p>
                {c.profileUrl && <Image src={c.profileUrl} alt={c.name} width={64} height={64} className="w-16 h-16 rounded-full object-cover mb-2" />}
                {c.profileUrl && <a href={c.profileUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline text-blue-600">Profile</a>}
                {c.branch && <p className="text-xs text-zinc-500">Branch: {c.branch}</p>}
                {c.staffTitle && <p className="text-xs text-zinc-500">Staff Title: {c.staffTitle}</p>}
              </div>
              <div className="flex gap-2 mt-2">
                <Link href={`/admin/contributors/${c._id}`} className="rounded bg-blue-100 text-blue-700 px-3 py-1 text-xs font-semibold">Edit</Link>
                <button className="rounded bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold" onClick={async () => {
                  if (confirm("Delete this contributor?")) {
                    await fetch(`/api/contributors/${c._id}`, { method: "DELETE" });
                    setContributors(contributors.filter(co => co._id !== c._id));
                  }
                }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateAdminTab() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setMessage({ type: 'error', text: 'Name and email are required' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setName("");
        setEmail("");
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create admin' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Create New Admin</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">Name <span className="text-red-600">*</span></label>
          <input
            type="text"
            className="w-full border rounded-md px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter admin name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email <span className="text-red-600">*</span></label>
          <input
            type="email"
            className="w-full border rounded-md px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter admin email"
            required
          />
        </div>

        {message && (
          <div className={`p-3 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating Admin..." : "Create Admin"}
        </button>
      </form>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• A random password will be generated for the new admin</li>
          <li>• Login credentials will be sent to the provided email address</li>
          <li>• The new admin should change their password on first login</li>
          <li>• Only existing admins can create new admin accounts</li>
        </ul>
      </div>
    </div>
  );
}



