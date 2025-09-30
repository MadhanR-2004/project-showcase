"use client";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mt-4"
      onClick={async () => {
        await signOut({ redirect: false });
        router.replace("/login?tab=contributor");
        window.location.reload();
      }}
    >
      Logout
    </button>
  );
}
