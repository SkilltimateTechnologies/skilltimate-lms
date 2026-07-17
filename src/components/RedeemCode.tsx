"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RedeemCode() {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true); setMsg(null);
    const res = await fetch("/api/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg({ text: data.error || "Invalid code", err: true }); return; }
    setMsg({ text: data.granted > 0 ? `Unlocked ${data.granted} course${data.granted > 1 ? "s" : ""}.` : "You already had access to everything on this code." });
    setCode("");
    router.refresh();
  }
  return (
    <form onSubmit={redeem} className="panel" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ minWidth: 0 }}>
        <h3 style={{ margin: 0 }}>Have an access code?</h3>
        <p className="mut" style={{ margin: 0, fontSize: "0.85rem" }}>Codes come from your college batch or from Skilltimate directly.</p>
      </div>
      <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
        <input className="input" style={{ width: 190, textTransform: "uppercase", fontFamily: "var(--font-mono)" }} placeholder="AZ900-XXXX" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Access code" />
        <button className={`btn${busy ? " loading" : ""}`} disabled={busy || !code.trim()}>Redeem</button>
      </div>
      {msg && <p role="status" style={{ width: "100%", margin: 0, fontSize: "0.85rem", color: msg.err ? "var(--danger)" : "var(--ok)" }}>{msg.text}</p>}
    </form>
  );
}
