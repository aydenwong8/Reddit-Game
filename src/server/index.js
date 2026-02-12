import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import apiRoutes from "./api/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const clientDistDir = path.join(rootDir, "dist");
const clientSourceDir = path.join(rootDir, "src", "client");
const assetsDir = path.join(rootDir, "game_assets");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use("/api", apiRoutes);
app.use("/game_assets", express.static(assetsDir));

if (process.env.NODE_ENV === "production") {
  app.use(express.static(clientDistDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDistDir, "index.html"));
  });
} else {
  app.use(express.static(clientSourceDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientSourceDir, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
