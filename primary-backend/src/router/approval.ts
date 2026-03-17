import { Router } from "express";
import prisma from "../db";
import { authMiddleware, AuthRequest } from "../middleware";

const router = Router();

// List pending approvals
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const approvals = await prisma.approval.findMany({
      where: { status: "PENDING" },
      include: {
        run: {
          include: {
            workflow: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(approvals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Approve/Reject
router.post("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { status, comment } = req.body; // APPROVED | REJECTED | MODIFIED

    if (!["APPROVED", "REJECTED", "MODIFIED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const approval = await prisma.approval.update({
      where: { id: req.params.id },
      data: {
        status,
        comment,
        userId: req.userId,
        decidedAt: new Date(),
      },
      include: { run: true },
    });

    // If approved, resume workflow execution
    if (status === "APPROVED") {
      // Update the approval step
      await prisma.runStep.updateMany({
        where: { runId: approval.runId, nodeId: approval.nodeId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      // Resume run
      await prisma.workflowRun.update({
        where: { id: approval.runId },
        data: { status: "RUNNING" },
      });

      // TODO: Resume execution from the next node
    } else if (status === "REJECTED") {
      await prisma.runStep.updateMany({
        where: { runId: approval.runId, nodeId: approval.nodeId },
        data: { status: "FAILED", completedAt: new Date(), error: `Rejected: ${comment || "No reason"}` },
      });

      await prisma.workflowRun.update({
        where: { id: approval.runId },
        data: { status: "FAILED", error: "Approval rejected", completedAt: new Date() },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        workflowId: approval.run.workflowId,
        userId: req.userId!,
        action: `approval.${status.toLowerCase()}`,
        details: { approvalId: approval.id, comment },
      },
    });

    res.json(approval);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const approvalRouter = router;
