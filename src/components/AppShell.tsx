"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/* 17px stroke icons — quiet, consistent */
const I = {
  home: <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>,
  exam: <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  catalog: <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 18V5.5"/></svg>,
  overview: <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>,
  courses: <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4 3 8l9 4 9-4z"/><path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5"/></svg>,
  bank: <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 9a2.5 2.5 0 1 1 3.7 2.2c-.8.45-1.2 1-1.2 1.8v.5"/><circle cx="12" cy="17.5" r="0.4" fill="currentColor"/><rect x="3" y="3" width="18" height="18" rx="3"/></svg>,
  people: <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.7-3 3-4.5 5.5-4.5S13.8 16 14.5 19"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.7c2.3.2 4.3 1.6 5 4.3"/></svg>,
  switch: <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h13l-3-3"/><path d="M20 17H7l3 3"/></svg>,
  out: <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h-8v16h8"/><path d="M10 12h11l-3.5-3.5M21 12l-3.5 3.5"/></svg>,
};

const studentLinks = [
  { href: "/learn", label: "Dashboard", icon: I.home },
  { href: "/learn/exams", label: "Mock exams", icon: I.exam },
  { href: "/courses", label: "Catalog", icon: I.catalog },
];
const staffLinks = [
  { href: "/studio", label: "Overview", icon: I.overview },
  { href: "/studio/courses", label: "Courses", icon: I.courses },
  { href: "/studio/bank", label: "Question bank", icon: I.bank },
  { href: "/studio/exams", label: "Exams", icon: I.exam },
  { href: "/studio/people", label: "People", icon: I.people },
];

export default function AppShell({
  children, who, role, area,
}: { children: React.ReactNode; who: string; role: string; area: "learn" | "studio" }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const links = area === "studio" ? staffLinks : studentLinks;
  const [name, email] = who.split(" · ");
  const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const isStaff = role === "admin" || role === "instructor";
  return (
    <div className="app">
      <aside className={`rail${open ? " open" : ""}`}>
        <Link href="/" className="brand">Skilltimate<span className="dot">·</span>Learn</Link>
        <span className="rg">{area === "studio" ? "Manage" : "Learn"}</span>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={`rl${path === l.href || (l.href !== "/learn" && l.href !== "/studio" && path.startsWith(l.href)) ? " on" : ""}`} onClick={() => setOpen(false)}>
            {l.icon}{l.label}
          </Link>
        ))}
        {(isStaff || area === "studio") && <span className="rg">Switch</span>}
        {area === "learn" && isStaff && <Link href="/studio" className="rl">{I.switch}Studio</Link>}
        {area === "studio" && <Link href="/learn" className="rl">{I.switch}Student view</Link>}
        <div className="spacer" />
        <div className="who">
          <span className="av" aria-hidden="true">{initials}</span>
          <span className="wt">
            <span className="wn">{name}</span>
            {email && <span className="we">{email}</span>}
          </span>
          <button
            className="out" title="Sign out" aria-label="Sign out"
            onClick={async () => { await authClient.signOut(); router.push("/"); router.refresh(); }}
          >{I.out}</button>
        </div>
      </aside>
      <div className="main">
        <button className="btn ghost small railtoggle" style={{ marginBottom: 16 }} onClick={() => setOpen(!open)} aria-label="Toggle menu">☰ Menu</button>
        {children}
      </div>
    </div>
  );
}
