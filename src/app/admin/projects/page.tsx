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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const PAGE_SIZE = 24;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
    setDebouncedSearch(searchQuery.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    (async () => {
      try {
        const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";
        const res = await fetch(
          `/api/projects?limit=${PAGE_SIZE}&skip=${(page - 1) * PAGE_SIZE}${searchParam}`
        );
        if (!res.ok) {
          setItems([]);
          setTotal(0);
          return;
        }
        const data = await res.json();
        setItems(data.projects || []);
        setTotal(data.total ?? (data.projects?.length || 0));
      } catch {
        setItems([]);
        setTotal(0);
      }
    })();
  }, [page, debouncedSearch]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    if (page !== 1) setPage(1);
  }, [debouncedSearch]);

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Projects</h1>
      
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search projects..."
          className="flex-1 border rounded-md px-3 py-2 text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Link
          href="/admin/projects/new"
          className="rounded-md bg-blue-600 text-white px-4 py-2 font-semibold whitespace-nowrap"
        >
          Add New Project
        </Link>
      </div>
      
      <ul className="space-y-2 mt-4">
        {items.map((p) => (
          <li
            key={p._id}
            className="flex items-center justify-between border rounded-md px-3 py-2"
          >
            <span>{p.title}</span>
            <div className="flex gap-2">
              <Link className="underline text-blue-600" href={`/admin/projects/${p.slug}`}>Edit</Link>
              <Link className="underline" href={`/projects/${p.slug}`}>View</Link>
            </div>
          </li>
        ))}
      </ul>
      {/* Pagination Controls */}
      <div className="flex justify-center items-center gap-2 mt-10">
        <button
          className="px-3 py-1 rounded bg-zinc-800 text-white disabled:opacity-50"
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
        >
          Prev
        </button>
        <span className="px-3">
          Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
        </span>
        <button
          className="px-3 py-1 rounded bg-zinc-800 text-white disabled:opacity-50"
          onClick={() => setPage(page + 1)}
          disabled={page >= Math.ceil(total / PAGE_SIZE)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
