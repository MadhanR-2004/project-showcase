"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import LogoutButton from "./LogoutButton";
import Link from "next/link";
import Image from "next/image";
import { PanelSwitcher } from "../../components/PanelSwitcher";

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
  const [tab, setTab] = useState<"projects" | "users">(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const t = url.searchParams.get("tab");
      if (t === "projects" || t === "users") return t;
    }
    return "projects";
  });

  if (status === "loading") return null;
  const userRole = session?.user?.role;
  if (!session || !userRole || (userRole !== "admin" && userRole !== "both")) {
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
        <TabButton active={tab === "users"} onClick={() => setTab("users")}>Manage Users</TabButton>
      </div>
      <div>
        {tab === "projects" ? <ProjectsTab /> : <UsersTab />}
      </div>
      
      {/* Panel Switcher for users with "both" role */}
      <PanelSwitcher currentPanel="admin" />
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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const PAGE_SIZE = 12;
  
  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/projects?limit=${PAGE_SIZE}&skip=${(page-1)*PAGE_SIZE}`);
      const data = await res.json();
      setProjects(data.projects || []);
      setTotal(data.total ?? (data.projects?.length || 0));
      setLoading(false);
    })();
  }, [page]);
  
  // Reset to page 1 when search query changes
  useEffect(() => {
    if (page !== 1) setPage(1);
  }, [searchQuery]);
  
  const filteredProjects = projects.filter(p => 
    (p.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.shortDescription?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (p.techStack || []).some(t => (t || "").toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-3">
        <h2 className="text-xl font-semibold">Projects</h2>
        <div className="flex gap-2 items-center flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search projects..."
            className="flex-1 border rounded-md px-3 py-2 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Link href="/admin/projects/new" className="rounded-md bg-blue-600 text-white px-4 py-2 font-semibold whitespace-nowrap">+ Add Project</Link>
      </div>
      {loading ? <p>Loading...</p> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((p) => (
              <div key={p._id} className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-700 p-5 flex flex-col gap-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1">{p.title}</h3>
                  <p className="text-xs text-zinc-500 mb-2">ID: {p._id}</p>
                  {p.shortDescription && <p className="text-sm mb-2">{p.shortDescription}</p>}
                  {p.techStack && p.techStack.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs text-zinc-500">Tech Stack: </span>
                      {p.techStack.map((t, i) => (
                        <span key={i} className="inline-block bg-zinc-200 dark:bg-zinc-700 rounded px-2 py-0.5 text-xs mr-1">{t}</span>
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
          {/* Pagination Controls */}
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              className="px-3 py-1 rounded bg-zinc-800 text-white disabled:opacity-50"
              onClick={() => setPage(page-1)}
              disabled={page === 1}
            >Prev</button>
            <span className="px-3">Page {page} of {Math.max(1, Math.ceil(total/PAGE_SIZE))}</span>
            <button
              className="px-3 py-1 rounded bg-zinc-800 text-white disabled:opacity-50"
              onClick={() => setPage(page+1)}
              disabled={page >= Math.ceil(total/PAGE_SIZE)}
            >Next</button>
          </div>
        </>
      )}
    </div>
  );
}

type Contributor = {
  _id?: string;
  name: string;
  email: string;
  role: "admin" | "contributor" | "both";
  avatarUrl?: string;
  profileUrl?: string;
  contributorType?: string;
  branch?: string;
  staffTitle?: string;
  yearOfPassing?: string;
};

function UsersTab() {
  const [users, setUsers] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const PAGE_SIZE = 12;
  
  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/users?limit=${PAGE_SIZE}&skip=${(page-1)*PAGE_SIZE}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total ?? (data.users?.length || 0));
      setLoading(false);
    })();
  }, [page]);
  
  // Reset to page 1 when search query or role filter changes
  useEffect(() => {
    if (page !== 1) setPage(1);
  }, [searchQuery, roleFilter]);
  
  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case "admin": return "bg-purple-100 text-purple-700";
      case "contributor": return "bg-green-100 text-green-700";
      case "both": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };
  
  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (u.branch?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                         (u.staffTitle?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-semibold">All Users</h2>
        <div className="flex gap-2 items-center flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search users..."
            className="flex-1 border rounded-md px-3 py-2 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="contributor">Contributor</option>
            <option value="both">Both</option>
          </select>
        </div>
        <Link href="/admin/users/new" className="rounded-md bg-blue-600 text-white px-4 py-2 font-semibold whitespace-nowrap">+ Create User</Link>
      </div>
      
      {loading ? <p>Loading...</p> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <div key={user._id} className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-700 p-5 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  {user.avatarUrl && (
                    <Image 
                      src={user.avatarUrl} 
                      alt={user.name} 
                      width={48} 
                      height={48} 
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0" 
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold mb-1 truncate">{user.name}</h3>
                    <p className="text-xs text-zinc-500 mb-2 truncate">{user.email}</p>
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                      {user.role.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                {(user.role === "contributor" || user.role === "both") && (
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 border-t pt-2">
                    {user.contributorType && (
                      <p><span className="font-semibold">Type:</span> {user.contributorType}</p>
                    )}
                    {user.contributorType === "student" && (
                      <>
                        {user.branch && <p><span className="font-semibold">Branch:</span> {user.branch}</p>}
                        {user.yearOfPassing && <p><span className="font-semibold">Year:</span> {user.yearOfPassing}</p>}
                      </>
                    )}
                    {user.contributorType === "staff" && user.staffTitle && (
                      <p><span className="font-semibold">Title:</span> {user.staffTitle}</p>
                    )}
                    {user.profileUrl && (
                      <p>
                        <span className="font-semibold">Profile:</span>{" "}
                        <a href={user.profileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                          View
                        </a>
                      </p>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2 mt-2 border-t pt-2">
                  <Link href={`/admin/users/${user._id}`} className="flex-1 text-center rounded bg-blue-100 text-blue-700 px-3 py-1 text-xs font-semibold">
                    Edit
                  </Link>
                  <button 
                    className="flex-1 rounded bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold" 
                    onClick={async () => {
                      if (confirm(`Delete user ${user.name}?`)) {
                        const res = await fetch(`/api/users/${user._id}`, { method: "DELETE" });
                        if (res.ok) {
                          setUsers(users.filter(u => u._id !== user._id));
                        }
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* Pagination Controls */}
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              className="px-3 py-1 rounded bg-zinc-800 text-white disabled:opacity-50"
              onClick={() => setPage(page-1)}
              disabled={page === 1}
            >Prev</button>
            <span className="px-3">Page {page} of {Math.max(1, Math.ceil(total/PAGE_SIZE))}</span>
            <button
              className="px-3 py-1 rounded bg-zinc-800 text-white disabled:opacity-50"
              onClick={() => setPage(page+1)}
              disabled={page >= Math.ceil(total/PAGE_SIZE)}
            >Next</button>
          </div>
        </>
      )}
    </div>
  );
}

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

function CreateUserTab() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Create New User</h2>
        <Link 
          href="/admin/users/new"
          className="rounded-md bg-blue-600 text-white px-4 py-2 font-semibold"
        >
          + Create User
        </Link>
      </div>
      
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="font-medium text-blue-900 mb-3">Unified User Management</h3>
        <p className="text-sm text-blue-800 mb-3">
          Create users with different roles in a single, streamlined interface.
        </p>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li><strong>Admin Only:</strong> Access to admin panel only</li>
          <li><strong>Contributor Only:</strong> Access to contributor dashboard only</li>
          <li><strong>Both:</strong> Access to both admin panel and contributor dashboard</li>
        </ul>
        <p className="text-sm text-blue-800 mt-3">
          A random password will be generated and sent to the user&apos;s email automatically.
        </p>
      </div>

      <div className="p-6 bg-green-50 border border-green-200 rounded-md">
        <h3 className="font-medium text-green-900 mb-2">✅ Benefits of Unified System</h3>
        <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
          <li>Single collection for all users (simpler database management)</li>
          <li>Flexible role assignment (admin, contributor, or both)</li>
          <li>Automatic file tracking for avatars (no orphaned files)</li>
          <li>Email credentials sent automatically</li>
          <li>Consistent user experience across roles</li>
        </ul>
      </div>
    </div>
  );
}



