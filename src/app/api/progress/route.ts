import { route } from "../_helpers";
import { markProgress } from "@/services/courses";
export const POST = route((user, body) => markProgress(user, body.lessonId, body.status, body.position ?? 0));
