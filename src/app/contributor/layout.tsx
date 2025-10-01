export default function ContributorLayout({ children }: { children: React.ReactNode }) {
  // No need for separate session provider - using unified session from root layout
  return <>{children}</>;
}
