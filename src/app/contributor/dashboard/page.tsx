"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

type Project = {
  _id?: string;
  title: string;
  shortDescription?: string;
  thumbnail?: string;
  contributors?: Array<{ id: string; name?: string; projectRole?: string }>;
};

export default function ContributorDashboard() {
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);

  const isContributor = useMemo(() => {
    const role = (session?.user as { role?: string } | undefined)?.role;
    return role === "contributor" || role === "editor"; // allow editor too if needed
  }, [session]);

  // Determine contributorId by matching session email with project contributor emails via API.
  // We store only id on projects, so we'll fetch contributors to map email->id.
  const [contributorId, setContributorId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!session?.user?.email) return;
      try {
        // Find contributor by email
        const res = await fetch(`/api/contributors?email=${encodeURIComponent(session.user.email)}`);
        const data = await res.json();
        const first = Array.isArray(data.contributors) ? data.contributors[0] : null;
        setContributorId(first?._id ?? null);
      } catch {
        setContributorId(null);
      }
    })();
  }, [session?.user?.email]);

  useEffect(() => {
    (async () => {
      if (!contributorId) return;
      try {
        const res = await fetch(`/api/projects?contributorId=${encodeURIComponent(contributorId)}`);
        const data = await res.json();
        setProjects(Array.isArray(data.projects) ? data.projects : []);
      } catch {
        setProjects([]);
      }
    })();
  }, [contributorId]);

  if (status === "loading") return null;
  if (!session || !isContributor) {
    if (typeof window !== "undefined") window.location.href = "/contributor/login";
    return null;
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Contributor Dashboard</h1>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="rounded-md bg-black text-white px-3 py-2">Sign out</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {projects.map((p) => (
          <div key={p._id} className="border rounded-lg p-4">
            <h2 className="font-semibold text-lg mb-1">{p.title}</h2>
            <p className="text-sm text-zinc-600 mb-3">{p.shortDescription}</p>
            <div className="flex gap-2">
              {p._id ? (
                <Link href={`/admin/projects/${p._id}`} className="text-blue-600 hover:text-blue-500 text-sm">Edit</Link>
              ) : null}
              {p._id ? (
                <Link href={`/projects/${p._id}`} className="text-zinc-700 hover:text-zinc-900 text-sm">View</Link>
              ) : null}
            </div>
          </div>
        ))}
        {!projects.length && (
          <div className="col-span-full text-center text-zinc-600">No associated projects found.</div>
        )}
      </div>
    </div>
  );
}



