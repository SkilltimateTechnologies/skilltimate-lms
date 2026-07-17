import ExamRunner from "@/components/ExamRunner";
export const dynamic = "force-dynamic";
export const metadata = { title: "Exam in progress" };
export default async function ExamPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  return <ExamRunner attemptId={attemptId} />;
}
