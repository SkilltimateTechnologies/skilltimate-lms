import { route } from "../../_helpers";
import { upsertPool } from "@/services/studio";
export const POST = route((user, body) => upsertPool(user, body), { roles: ["admin", "instructor"] });
