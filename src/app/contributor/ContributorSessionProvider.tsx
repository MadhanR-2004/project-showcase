"use client";
import { SessionProvider } from "next-auth/react";

export function ContributorSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/api/auth/contributor">
      {children}
    </SessionProvider>
  );
}
