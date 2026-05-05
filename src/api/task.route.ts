// src/api/task.route.ts
import { Router, Request, Response } from "express";
import { queryAllTasks } from "../core/engine";
import { ENV } from "../config/env";

const router = Router();

router.get("/tugas", async (_req: Request, res: Response) => {
  try {
    const rows = await queryAllTasks();
    res.json({
      success: true,
      table: ENV.TABLE_NAME,
      count: rows.length,
      data: rows,
    });
  } catch (err: any) {
    console.error("[API] Error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;