import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import stegoRoutes from "./routes/stegoRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/stego", stegoRoutes);

// static for downloads (optional)
app.use("/downloads", express.static(path.join(__dirname, "../tmp")));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server started on ${PORT}`));
