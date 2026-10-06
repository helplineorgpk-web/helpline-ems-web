"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { ErrorText } from "@/components/ui";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(newPassword);
  const matches = confirmPassword.length > 0 && newPassword === confirmPassword;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from the current password");
      return;
    }

    setLoading(true);
    try {
      await api("/api/admin/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Your password is updated. Use it the next time you sign in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-1 py-6 sm:px-2 sm:py-10">
      <section className="rise-in card overflow-hidden">
        <div className="relative overflow-hidden bg-forest-deep px-6 py-8 text-white sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-leaf/30 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 left-8 h-32 w-32 rounded-full bg-gold/25 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="soft-pop flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-gold">
              <KeyIcon />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">Admin account</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Change password</h1>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/70">
                Choose something you have not used here before. It needs at least 6 characters.
              </p>
            </div>
          </div>
        </div>

        <form className="space-y-5 px-6 py-7 sm:px-8 sm:py-8" onSubmit={onSubmit}>
          <ErrorText message={error} />
          {success ? (
            <p className="soft-pop rounded-2xl bg-leaf-soft px-4 py-3 text-sm font-medium leading-relaxed text-leaf-dark">
              {success}
            </p>
          ) : null}

          <PasswordField
            label="Current password"
            value={currentPassword}
            shown={showCurrent}
            onToggle={() => setShowCurrent((value) => !value)}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />

          <div className="space-y-2.5">
            <PasswordField
              label="New password"
              value={newPassword}
              shown={showNew}
              onToggle={() => setShowNew((value) => !value)}
              onChange={setNewPassword}
              autoComplete="new-password"
              minLength={6}
            />
            <StrengthMeter strength={strength} />
          </div>

          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            shown={showNew}
            onToggle={() => setShowNew((value) => !value)}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            minLength={6}
            hint={confirmPassword ? (matches ? "Passwords match" : "Passwords do not match yet") : undefined}
            hintTone={matches ? "good" : "warn"}
          />

          <button className="btn btn-primary mt-1 w-full py-3" disabled={loading} type="submit">
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}

function PasswordField({
  label,
  value,
  shown,
  onToggle,
  onChange,
  autoComplete,
  minLength,
  hint,
  hintTone,
}: {
  label: string;
  value: string;
  shown: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
  hint?: string;
  hintTone?: "good" | "warn";
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
      <span className="relative block">
        <input
          className="input pr-16"
          type={shown ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-xs font-semibold text-muted transition hover:bg-canvas hover:text-ink"
          type="button"
          onClick={onToggle}
        >
          {shown ? "Hide" : "Show"}
        </button>
      </span>
      {hint ? (
        <span className={`mt-2 block text-xs font-medium ${hintTone === "good" ? "text-leaf-dark" : "text-amber-800"}`}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function StrengthMeter({ strength }: { strength: 0 | 1 | 2 | 3 }) {
  const labels = ["", "Too short", "Good", "Strong"];
  return (
    <div className="px-0.5">
      <div className="flex gap-1.5">
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              strength >= step ? (strength === 1 ? "bg-gold" : "bg-leaf") : "bg-line"
            }`}
          />
        ))}
      </div>
      <p className="mt-1.5 min-h-4 text-xs text-muted">{labels[strength]}</p>
    </div>
  );
}

function passwordStrength(password: string): 0 | 1 | 2 | 3 {
  if (!password) return 0;
  if (password.length < 6) return 1;
  const mixed = /[A-Za-z]/.test(password) && /\d/.test(password);
  if (password.length >= 10 && mixed) return 3;
  return 2;
}

function KeyIcon() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="15" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M11.2 12.2 20 3.5M16.5 7l2.2 2.2M14.2 9.2l2.2 2.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
