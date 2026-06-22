"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Wrong password.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-mdv-cream p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-12">
          <p className="mdv-eyebrow mb-4">Manière de Voir</p>
          <h1 className="mdv-display text-4xl text-mdv-charcoal">
            Critical Path Diff
          </h1>
        </div>

        <div className="mdv-card p-10">
          <p className="text-sm text-mdv-mute mb-6 text-center">
            Enter the team password to continue
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="mdv-input w-full px-4 py-3 text-base"
            />
            <button
              type="submit"
              disabled={loading}
              className="mdv-btn-primary w-full py-3"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
            {error && (
              <p className="text-sm text-red-700 text-center pt-1">{error}</p>
            )}
          </form>
        </div>

        <p className="text-xs text-mdv-mute text-center mt-8 tracking-wide">
          Internal tool · access by approval only
        </p>
      </div>
    </main>
  );
}
