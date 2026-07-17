import { route } from "../../_helpers";
import { createInvite } from "@/services/studio";
export const POST = route((user, body) => createInvite(user, body), { roles: ["admin", "instructor"] });
