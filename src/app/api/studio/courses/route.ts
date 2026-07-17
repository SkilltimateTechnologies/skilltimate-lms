import { route } from "../../_helpers";
import { upsertCourse } from "@/services/studio";
export const POST = route((user, body) => upsertCourse(user, body), { roles: ["admin", "instructor"] });
