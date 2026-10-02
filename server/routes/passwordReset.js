import express from "express";
import { forgotPassword } from "../controller/passwordReset.js";

const router = express.Router();
router.post("/forgot", forgotPassword);

export default router;
