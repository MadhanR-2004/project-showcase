"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
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
  const [tab, setTab] = useState<"projects" | "contributors">("projects");

  if (status === "loading") return null;
  if (!session || !userHasAdminRole(session.user) || session.user.role !== "admin") {
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    return null;
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="rounded-md bg-black text-white px-3 py-2">Sign out</button>
      </div>
      <div className="flex gap-2 border-b mb-8">
        <TabButton active={tab === "projects"} onClick={() => setTab("projects")}>Manage Projects</TabButton>
        <TabButton active={tab === "contributors"} onClick={() => setTab("contributors")}>Manage Contributors</TabButton>
      </div>
      <div>
        {tab === "projects" ? <ProjectsTab /> : <ContributorsTab />}
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



