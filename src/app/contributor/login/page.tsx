"use client";
import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ContributorLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Show error from URL parameter
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "CredentialsSignin") {
      setError("Invalid email or password. Please check your credentials.");
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        username: email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password. Please check your credentials.");
        setLoading(false);
      } else if (res?.ok) {
        const callbackUrl = searchParams.get("callbackUrl") || "/contributor/dashboard";
        
        // Add a small delay to ensure session is fully established (especially important on mobile)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Use window.location for more reliable redirect on mobile
        if (typeof window !== "undefined") {
          window.location.href = callbackUrl;
        } else {
          router.push(callbackUrl);
          router.refresh();
        }
      } else {
        // Handle unexpected response
        setError("Login failed. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Contributor Login</h1>
        <input
          type="email"
          placeholder="Email"
          className="w-full rounded-md border px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="w-full relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full rounded-md border px-3 py-2 pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-zinc-600"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {error ? <p className="text-red-600 text-sm">{error}</p> : null}
        <button 
          type="submit" 
          disabled={loading}
          className="w-full rounded-md bg-black text-white py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
        <div className="text-center">
          <Link href="/contributor/forgot-password" className="text-blue-600 hover:text-blue-500 text-sm">
            Forgot Password?
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ContributorLogin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <ContributorLoginForm />
    </Suspense>
  );
}



