"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { ErrorText, Field, PageHeader } from "@/components/ui";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setSuccess("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Change password" description="Update the password for your admin account." />
      <form className="card max-w-lg space-y-4 p-6" onSubmit={onSubmit}>
        <ErrorText message={error} />
        {success ? (
          <p className="rounded-xl bg-leaf-soft px-3 py-2 text-sm font-medium text-leaf-dark">{success}</p>
        ) : null}
        <Field label="Current password">
          <input
            className="input"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </Field>
        <Field label="New password">
          <input
            className="input"
            type="password"
            minLength={6}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>
        <Field label="Confirm new password">
          <input
            className="input"
            type="password"
            minLength={6}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
