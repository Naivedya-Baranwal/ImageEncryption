import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { runPythonCli } from "../utils/pythonRunner.js";
import { TMP_DIR } from "../middleware/upload.js";
import { deleteTempFiles } from "../utils/deleteTemp.js";

/* -------------------- ENCRYPT --------------------------------------- */
export async function encryptHandler(req: Request, res: Response) {
  const cleanup: string[] = [];

  try {
    const imageFile = req.file;
    if (!imageFile) return res.status(400).json({ error: "Image required" });
    cleanup.push(imageFile.path);

    const password = req.body.password;
    if (!password) return res.status(400).json({ error: "Password required for encryption" });

    // Prepare plaintext
    let plainPath = path.join(TMP_DIR, `plain-${Date.now()}`);
    if (req.body.message) {
      fs.writeFileSync(plainPath, req.body.message, "utf-8");
    } else if ((req as any).files?.payload) {
      plainPath = (req as any).files.payload[0].path;
    } else {
      return res.status(400).json({ error: "No payload message or file provided" });
    }
    cleanup.push(plainPath);

    // Output file
    const outPath = path.join(TMP_DIR, `stego-${Date.now()}.png`);
    cleanup.push(outPath);

    const args = ["--mode","encrypt","--in", imageFile.path, "--out", outPath, "--password", password];
    const result = runPythonCli(args, { PLAIN_INPUT_FILE: plainPath });

    if (result.status !== 0 || !fs.existsSync(outPath)) {
      deleteTempFiles(cleanup);
      return res.status(500).json({ error: "Python error", details: result.stderr });
    }

    // Send file, cleanup afterwards
    res.download(outPath, err => {
      if (err) console.error("Download error:", err);
      deleteTempFiles(cleanup);
    });
  } catch (err) {
    console.error(err);
    deleteTempFiles(cleanup);
    res.status(500).json({ error: "Server error" });
  }
}

/* -------------------- DECRYPT --------------------------------------- */
export async function decryptHandler(req: Request, res: Response) {
  const cleanup: string[] = [];

  try {
    const imageFile = req.file;
    if (!imageFile) return res.status(400).json({ error: "Image required", code: "NO_IMAGE" });
    cleanup.push(imageFile.path);

    const password = req.body.password;
    const outPath  = path.join(TMP_DIR, `plain-${Date.now()}`);
    cleanup.push(outPath);

    const args = ["--mode","decrypt","--in", imageFile.path, "--out", outPath];
    if (password) args.push("--password", password);

    const result = runPythonCli(args);
    if (result.status !== 0) {
      deleteTempFiles(cleanup);
      const msg = result.stderr.toLowerCase();
      if (msg.includes("extraction failed") || msg.includes("does not contain")) {
        return res.status(400).json({ error: "Not encrypted", code: "NOT_ENCRYPTED" });
      }
      if (msg.includes("mac check failed") || msg.includes("decryption failed")) {
        return res.status(400).json({ error: "Incorrect password", code: "WRONG_PASSWORD" });
      }
      if (msg.includes("provide --password")) {
        return res.status(400).json({ error: "Password required", code: "PASSWORD_REQUIRED" });
      }
      return res.status(400).json({ error: "Decrypt failed", details: result.stderr });
    }

    if (!fs.existsSync(outPath)) {
      deleteTempFiles(cleanup);
      return res.status(500).json({ error: "Python produced no output" });
    }

    const stat = fs.statSync(outPath);
    const SMALL = 200 * 1024; // 200 KB

    if (stat.size <= SMALL) {
      const content = fs.readFileSync(outPath, "utf-8");
      deleteTempFiles(cleanup);
      res.json({ message: content });
    } else {
      res.download(outPath, err => {
        if (err) console.error("Download error:", err);
        deleteTempFiles(cleanup);
      });
    }
  } catch (err) {
    console.error(err);
    deleteTempFiles(cleanup);
    res.status(500).json({ error: "Server error" });
  }
}
