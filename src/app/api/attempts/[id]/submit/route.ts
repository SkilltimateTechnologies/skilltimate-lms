import { route } from "../../../_helpers";
import { submitAttempt } from "@/services/exams";
export const POST = route((user, _b, params) => submitAttempt(user, params.id));
