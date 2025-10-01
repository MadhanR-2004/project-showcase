"use client";
import { AdminSessionProvider } from "./AdminSessionProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminSessionProvider>{children}</AdminSessionProvider>;
}


