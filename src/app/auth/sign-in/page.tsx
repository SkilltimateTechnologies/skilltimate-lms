import Link from "next/link";
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
export const metadata = { title: "Sign in" };
export default function SignIn() {
  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <Link href="/" className="brand" style={{ marginBottom: 24, display: "inline-flex" }}>Skilltimate<span className="dot">·</span>Learn</Link>
        <h1 style={{ fontSize: "1.5rem" }}>Welcome back</h1>
        <p className="mut" style={{ marginTop: -8 }}>Sign in to continue preparing.</p>
        <Suspense><AuthForm mode="sign-in" /></Suspense>
        <p className="mut" style={{ marginTop: 20, fontSize: "0.88rem" }}>New here? <Link href="/auth/sign-up">Create an account</Link></p>
      </div>
    </main>
  );
}
