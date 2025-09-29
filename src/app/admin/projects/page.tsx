"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Project = {
  _id?: string;
  slug: string;
  title: string;
  shortDescription?: string;
  poster?: string;
  thumbnail?: string;
};

export default function ProjectsAdminPage() {
  const [items, setItems] = useState<Project[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/projects");
        if (!res.ok) {
          setItems([]);
          return;
        }
        const data = await res.json();
        setItems(data.projects || []);
      } catch {
          setItems([]);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Projects</h1>
      <Link href="/admin/projects/new" className="mb-4 inline-block underline text-blue-600">Add New Project</Link>
      <ul className="space-y-2 mt-4">
        {items.map((p) => (
          <li key={p._id} className="flex items-center justify-between border rounded-md px-3 py-2">
            <span>{p.title}</span>
            <div className="flex gap-2">
              <Link className="underline text-blue-600" href={`/admin/projects/${p.slug}`}>Edit</Link>
              <Link className="underline" href={`/projects/${p.slug}`}>View</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
