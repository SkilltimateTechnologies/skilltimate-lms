"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const studentLinks = [
  { href: "/learn", label: "Dashboard" },
  { href: "/learn/exams", label: "Mock exams" },
  { href: "/courses", label: "Catalog" },
];
const staffLinks = [
  { href: "/studio", label: "Overview" },
  { href: "/studio/courses", label: "Courses" },
  { href: "/studio/bank", label: "Question bank" },
  { href: "/studio/exams", label: "Exams" },
  { href: "/studio/people", label: "People" },
];

export default function AppShell({
  children, who, role, area,
}: { children: React.ReactNode; who: string; role: string; area: "learn" | "studio" }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const links = area === "studio" ? staffLinks : studentLinks;
  return (
    <div className="app">
      <aside className={`rail${open ? " open" : ""}`}>
        <Link href="/" className="brand">Skilltimate<span className="dot">·</span>Learn</Link>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={`rl${path === l.href || (l.href !== "/learn" && l.href !== "/studio" && path.startsWith(l.href)) ? " on" : ""}`} onClick={() => setOpen(false)}>
            {l.label}
          </Link>
        ))}
        {area === "learn" && (role === "admin" || role === "instructor") && (
          <Link href="/studio" className="rl">Studio →</Link>
        )}
        {area === "studio" && <Link href="/learn" className="rl">Student view →</Link>}
        <div className="spacer" />
        <div className="who">
          {who}
          <button
            className="btn ghost small"
            style={{ width: "100%", marginTop: 8 }}
            onClick={async () => { await authClient.signOut(); router.push("/"); router.refresh(); }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="main">
        <button className="btn ghost small railtoggle" style={{ marginBottom: 16 }} onClick={() => setOpen(!open)} aria-label="Toggle menu">☰ Menu</button>
        {children}
      </div>
    </div>
  );
}
