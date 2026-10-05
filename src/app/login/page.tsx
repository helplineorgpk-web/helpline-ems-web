"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/client";
import { ErrorText } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.replace(search.get("from") || "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Welcome back</h2>
        <p className="mt-1 text-sm text-muted">Sign in to manage projects and staff reports.</p>
      </div>
      <ErrorText message={error} />
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Email</span>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Password</span>
        <input
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />
      </label>
      <button className="btn btn-primary w-full py-3" disabled={loading} type="submit">
        {loading ? "Signing in…" : "Sign in to dashboard"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-forest-deep text-white lg:flex">
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-leaf/30 blur-3xl" />
        <div className="absolute -bottom-24 left-10 h-80 w-80 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between p-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Helpline Welfare Trust</p>
            <h1 className="mt-6 max-w-md text-4xl font-semibold leading-tight">
              Admin dashboard for every school, masjid, VTC and welfare project.
            </h1>
            <p className="mt-4 max-w-md text-white/70">
              Create projects, assign employees, and receive daily check-ins, check-outs and work
              reports from the field app.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-white/80">
            <li>Projects & employee assignment</li>
            <li>Daily attendance with in / out time</li>
            <li>Task reports from the mobile app</li>
          </ul>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-leaf">Helpline Welfare Trust</p>
            <h1 className="mt-2 text-2xl font-semibold">Admin Dashboard</h1>
          </div>
          <div className="card p-8">
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </section>
    </div>
  );
}
