import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* Temp folder --------------------------------------------------------- */
export const TMP_DIR = path.join(__dirname, "../../tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

/* Multer storage ------------------------------------------------------ */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TMP_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

export const upload = multer({ storage });
