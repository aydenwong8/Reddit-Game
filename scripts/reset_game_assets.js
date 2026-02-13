import { rmSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.resolve(__dirname, "..", "game_assets");

if (existsSync(assetsDir)) {
  rmSync(assetsDir, { recursive: true, force: true });
  console.log(`Removed ${assetsDir}`);
} else {
  console.log(`Nothing to remove: ${assetsDir}`);
}

console.log("Local game_assets reset complete. This script is dev-only and not used by server endpoints.");
