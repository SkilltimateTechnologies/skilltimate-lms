import { route } from "../../../_helpers";
import { saveResponse } from "@/services/exams";
export const POST = route((user, body, params) => saveResponse(user, params.id, body.questionId, body.response));
