import { route } from "../_helpers";
import { redeemInvite } from "@/services/courses";
export const POST = route((user, body) => redeemInvite(user, body.code));
