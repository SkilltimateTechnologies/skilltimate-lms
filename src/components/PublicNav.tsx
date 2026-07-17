import Link from "next/link";
import { getSession } from "@/lib/session";

export default async function PublicNav() {
  const session = await getSession();
  return (
    <header className="nav">
      <div className="shell nav-in">
        <Link href="/" className="brand">
          Skilltimate<span className="dot">·</span>Learn
          <span className="sub">learn.skilltimate.com</span>
        </Link>
        <nav className="nav-links" aria-label="Main">
          <Link href="/courses" className="hide-s">Courses</Link>
          {session ? (
            <>
              {(session.user.role === "admin" || session.user.role === "instructor") && (
                <Link href="/studio" className="hide-s">Studio</Link>
              )}
              <Link href="/learn" className="btn small">My learning</Link>
            </>
          ) : (
            <>
              <Link href="/" className="hide-s">Sign in</Link>
              <Link href="/auth/sign-up" className="btn small">Create account</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
