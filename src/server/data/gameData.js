import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../..");
const assetsDir = path.join(rootDir, "game_assets");

function hasRequiredFiles(folderPath) {
  const clue2 = path.join(folderPath, "clue_2.png");
  const answer = path.join(folderPath, "ANSWER.png");
  return fs.existsSync(clue2) && fs.existsSync(answer);
}

function toEntry(folderName) {
  const memeId = folderName.toLowerCase();
  return {
    folderName,
    memeId,
    assetKey: `game_assets/${folderName}`,
    name: folderName.replaceAll("_", " "),
    clean_name: folderName.replaceAll("_", " ").toLowerCase(),
    images: {
      "1": `/game_assets/${folderName}/clue_1.png`,
      "2": `/game_assets/${folderName}/clue_2.png`,
      "3": `/game_assets/${folderName}/clue_3.png`,
      "4": `/game_assets/${folderName}/clue_4.png`,
      "5": `/game_assets/${folderName}/clue_5.png`,
      stage_2: `/game_assets/${folderName}/clue_2.png`,
      answer: `/game_assets/${folderName}/ANSWER.png`
    }
  };
}

function loadFolders() {
  if (!fs.existsSync(assetsDir)) {
    return [];
  }

  return fs
    .readdirSync(assetsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((folderName) => hasRequiredFiles(path.join(assetsDir, folderName)))
    .sort((a, b) => a.localeCompare(b));
}

const folderNames = loadFolders();
const allData = folderNames.map(toEntry);
const initialIndex = allData.length ? allData.length - 1 : -1;

export { allData, initialIndex };
