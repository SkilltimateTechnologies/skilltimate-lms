import Link from "next/link";
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
export const metadata = { title: "Create account" };
export default function SignUp() {
  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <Link href="/" className="brand" style={{ marginBottom: 24, display: "inline-flex" }}>Skilltimate<span className="dot">·</span>Learn</Link>
        <h1 style={{ fontSize: "1.5rem" }}>Create your account</h1>
        <p className="mut" style={{ marginTop: -8 }}>Then redeem your access code to unlock courses.</p>
        <Suspense><AuthForm mode="sign-up" /></Suspense>
        <p className="mut" style={{ marginTop: 20, fontSize: "0.88rem" }}>Already registered? <Link href="/auth/sign-in">Sign in</Link></p>
      </div>
    </main>
  );
}
