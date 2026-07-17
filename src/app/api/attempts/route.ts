import { route } from "../_helpers";
import { startAttempt } from "@/services/exams";
export const POST = route((user, body) => startAttempt(user, body.examId));
