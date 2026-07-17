import { route } from "../../../_helpers";
import { importQuestionsCsv } from "@/services/studio";
export const POST = route((user, body) => importQuestionsCsv(user, body.poolId, body.csv), { roles: ["admin", "instructor"] });
