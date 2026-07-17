import { route } from "../../_helpers";
import { getRunnerState } from "@/services/exams";
export const GET = route((user, _b, params) => getRunnerState(user, params.id));
