"use client";
import { ContributorSessionProvider } from "./ContributorSessionProvider";

export default function ContributorLayout({ children }: { children: React.ReactNode }) {
  return <ContributorSessionProvider>{children}</ContributorSessionProvider>;
}
