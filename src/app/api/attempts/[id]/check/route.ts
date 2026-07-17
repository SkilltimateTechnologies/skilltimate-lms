import { route } from "../../../_helpers";
import { checkAnswer } from "@/services/exams";
export const POST = route((user, body, params) => checkAnswer(user, params.id, body.questionId, body.response));
