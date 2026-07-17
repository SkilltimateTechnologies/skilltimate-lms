import "dotenv/config";
import { runSeed } from "../src/db/seed";
runSeed({ wipe: true }).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
