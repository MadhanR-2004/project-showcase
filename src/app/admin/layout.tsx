export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // No need for separate session provider - using unified session from root layout
  return <>{children}</>;
}


