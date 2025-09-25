import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { encryptHandler, decryptHandler } from "../controllers/stegoController.js";
const router = Router();

router.post("/encrypt", upload.single("image"), encryptHandler);
router.post("/decrypt", upload.single("image"), decryptHandler);

export default router;
