import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { runPythonCli } from "../utils/pythonRunner.js";
import { TMP_DIR } from "../middleware/upload.js";

export async function encryptHandler(req: Request, res: Response) {
  try {
    console.log("Encrypt request received");
    console.log("Body:", req.body);
    console.log("File:", req.file);
    
    // file is uploaded, and text or file to embed is sent
    // we accept either text field 'message' or uploaded file 'payload'
    const imageFile = req.file;
    if(!imageFile) return res.status(400).json({error: "Image required"});
    const password = req.body.password;
    if(!password) return res.status(400).json({error: "Password required for encryption"});

    // create plaintext temporary file
    let plainPath = path.join(TMP_DIR, `plain-${Date.now()}`);
    if (req.body.message) {
      fs.writeFileSync(plainPath, req.body.message, "utf-8");
    } else if ((req as any).files && (req as any).files.payload) {
      // if a payload file is uploaded (e.g., PDF), move it
      const payloadFile = (req as any).files.payload[0];
      plainPath = payloadFile.path;
    } else {
      return res.status(400).json({error: "No payload message or file provided"});
    }

    const outPath = path.join(TMP_DIR, `stego-${Date.now()}.png`);
    // call python with env PLAIN_INPUT_FILE set to plainPath
    const args = ["--mode","encrypt","--in", imageFile.path, "--out", outPath, "--password", password];
    const result = runPythonCli(args, { PLAIN_INPUT_FILE: plainPath });
    if (result.status !== 0) {
      console.error("PY ERR", result.stderr);
      return res.status(500).json({ error: "Python error: " + result.stderr });
    }
    const savedPath = result.stdout.trim();
    // return file for download
    res.download(savedPath, (err) => {
      // cleanup temp files
      try { fs.unlinkSync(imageFile.path); } catch {}
      try { fs.unlinkSync(plainPath); } catch {}
      try { fs.unlinkSync(savedPath); } catch {}
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({error: "Server error"});
  }
}

export async function decryptHandler(req: Request, res: Response) {
  try {
    const imageFile = req.file;
    if(!imageFile) return res.status(400).json({error: "Image required", code: "NO_IMAGE"});
    const password = req.body.password; // optional

    console.log("Decrypt request received");
    console.log("File:", imageFile.filename);
    console.log("Has password:", !!password);

    const outPath = path.join(TMP_DIR, `plain-${Date.now()}`);
    const args = ["--mode","decrypt","--in", imageFile.path, "--out", outPath];
    if (password) args.push("--password", password);

    const result = runPythonCli(args);
    if (result.status !== 0) {
      console.error("PY ERR", result.stderr);
      
      // Parse specific error types
      const errorMessage = result.stderr.toLowerCase();
      
      if (errorMessage.includes("extraction failed") || errorMessage.includes("does not contain enough bits")) {
        return res.status(400).json({ 
          error: "This image does not contain any encrypted data", 
          code: "NOT_ENCRYPTED",
          message: "The image you uploaded is not encrypted or doesn't contain hidden data."
        });
      }
      
      if (errorMessage.includes("decryption failed") || errorMessage.includes("mac check failed")) {
        return res.status(400).json({ 
          error: "Incorrect password. Please check and try again", 
          code: "WRONG_PASSWORD",
          message: "The password you entered is incorrect. Please try again with the correct password."
        });
      }
      
      if (errorMessage.includes("appears encrypted") || errorMessage.includes("provide --password")) {
        return res.status(400).json({ 
          error: "This image is password protected. Please provide the correct password", 
          code: "PASSWORD_REQUIRED",
          message: "This image contains encrypted data that requires a password to decrypt."
        });
      }
      
      // Generic error
      return res.status(400).json({ 
        error: "Failed to decrypt the image", 
        code: "DECRYPT_FAILED",
        details: result.stderr 
      });
    }
    const savedPlain = result.stdout.trim();
    // If Python returns a path, send file contents. Otherwise it's an error.
    if (fs.existsSync(savedPlain)) {
      // try to read as text (utf-8) and return as JSON if small, else provide download
      const stat = fs.statSync(savedPlain);
      const maxInline = 200 * 1024; // 200 KB
      if (stat.size <= maxInline) {
        const content = fs.readFileSync(savedPlain, { encoding: "utf-8" });
        res.json({ message: content });
      } else {
        res.download(savedPlain, (err) => {
          try { fs.unlinkSync(imageFile.path); } catch {}
          try { fs.unlinkSync(savedPlain); } catch {}
        });
      }
    } else {
      res.status(500).json({error: "Unexpected python output: " + result.stdout});
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({error: "Server error"});
  }
}

