import { Router } from "express";
import prisma from "../db";

const router = Router();

// The old availableTrigger model no longer exists.
// This endpoint now returns trigger-type workflow components instead.
router.get("/available", async (req, res) => {
    // Return templates as available triggers
    const templates = await prisma.template.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        category: true,
      },
    });
    res.json({
        availableTriggers: templates
    });
});

export const triggerRouter = router;