import { route } from "../../_helpers";
import { createBatch } from "@/services/studio";
export const POST = route((user, body) => createBatch(user, body), { roles: ["admin", "instructor"] });
