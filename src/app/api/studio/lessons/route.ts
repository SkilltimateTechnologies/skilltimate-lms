import { route } from "../../_helpers";
import { upsertLesson, deleteLesson } from "@/services/studio";
export const POST = route((user, body) => upsertLesson(user, body), { roles: ["admin", "instructor"] });
export const DELETE = route((user, body) => deleteLesson(user, body.id), { roles: ["admin", "instructor"] });
