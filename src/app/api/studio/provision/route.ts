import { route } from "../../_helpers";
import { provisionBatch } from "@/services/studio";
export const POST = route((user, body) => provisionBatch(user, body), { roles: ["admin", "instructor"] });
