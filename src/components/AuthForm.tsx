"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const search = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const next = search.get("next") || "/learn";
    const res =
      mode === "sign-up"
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (res.error) {
      setError(res.error.message || "That didn't work — check the details and try again.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate>
      {mode === "sign-up" && (
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        </div>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" className={`input${error ? " error" : ""}`} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" inputMode="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" type="password" className={`input${error ? " error" : ""}`} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} />
        {mode === "sign-up" && <span className="hint">At least 8 characters.</span>}
      </div>
      {error && <p className="btn-err" role="alert">{error}</p>}
      <button className={`btn${busy ? " loading" : ""}`} disabled={busy} style={{ width: "100%" }}>
        {mode === "sign-up" ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}
