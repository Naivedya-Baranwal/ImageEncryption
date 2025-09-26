import fs from "fs";

/** Silently delete every provided file path. */
export function deleteTempFiles(paths: string[]) {
  for (const p of paths) {
    try {
      if (!p) continue;
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch (unlinkErr) {
          // On Windows, an open handle can prevent unlink; log and continue.
          console.error(`Failed to unlink ${p}:`, unlinkErr);
        }
      }
    } catch (err) {
      console.error("Temp-cleanup error:", err);
    }
  }
}
