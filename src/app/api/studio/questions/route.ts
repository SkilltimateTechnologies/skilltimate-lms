import { route } from "../../_helpers";
import { upsertQuestion } from "@/services/studio";
export const POST = route((user, body) => upsertQuestion(user, body), { roles: ["admin", "instructor"] });
