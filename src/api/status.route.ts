// src/api/status.route.ts
import { Router, Request, Response } from "express";
import { getEngineInfo } from "../core/engine";

const router = Router();

router.get("/status", (_req: Request, res: Response) => {
  try {
    const info = getEngineInfo();
    res.json({
      success: true,
      status: "running",
      uptime: process.uptime(),
      ...info,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      status: "error",
      error: err.message,
    });
  }
});

export default router;
