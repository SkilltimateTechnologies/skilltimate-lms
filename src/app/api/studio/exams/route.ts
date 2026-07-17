import { route } from "../../_helpers";
import { upsertExam } from "@/services/studio";
export const POST = route((user, body) => upsertExam(user, body), { roles: ["admin", "instructor"] });
