import { route } from "../../../_helpers";
import { toggleFlag } from "@/services/exams";
export const POST = route((user, body, params) => toggleFlag(user, params.id, body.questionId, body.flagged));
