"use client";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mt-4"
      onClick={async () => {
        await signOut({ 
          redirect: true,
          callbackUrl: "/admin/login"
        });
      }}
    >
      Logout
    </button>
  );
}
