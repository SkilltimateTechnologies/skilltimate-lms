import { redirect } from "next/navigation";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  redirect(next ? `/?next=${encodeURIComponent(next)}` : "/");
}
