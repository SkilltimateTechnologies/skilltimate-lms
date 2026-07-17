import { route } from "../../_helpers";
import { grantCourse } from "@/services/studio";
export const POST = route((user, body) => grantCourse(user, body.userId, body.courseId), { roles: ["admin", "instructor"] });
