import { route } from "../../_helpers";
import { upsertModule } from "@/services/studio";
export const POST = route((user, body) => upsertModule(user, body), { roles: ["admin", "instructor"] });
