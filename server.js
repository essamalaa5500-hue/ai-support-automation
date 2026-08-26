require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { PrismaClient } = require("@prisma/client");
const { analyze } = require("./ai");
const { cacheAnalysis, getCachedAnalysis } = require("./redis");
const { validateInput, normalize, validateAIResponse } = require("./validate");
const { sendToCRM } = require("./crm");
const { notify } = require("./notify");

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));

// Webhook secret
function verifyWebhook(req, res, next) {
  const secret = req.headers["x-webhook-secret"];
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Health
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Webhook
app.post("/webhook/analyze", verifyWebhook, async (req, res) => {
  const start = Date.now();

  try {
    // 1. Validate input
    const validation = validateInput(req.body);
    if (!validation.valid) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: validation.errors });
    }

    // 2. Normalize
    const data = normalize(req.body);
    const { message, source } = data;

    // 3. Cache check
    let analysis = await getCachedAnalysis(message);
    if (!analysis) {
      analysis = await analyze(message);
      await cacheAnalysis(message, analysis);
    }

    // 4. Validate AI response
    const aiValidation = validateAIResponse(analysis);
    if (!aiValidation.valid) {
      await prisma.webhookLog.create({
        data: {
          source,
          payload: JSON.stringify(req.body),
          response: JSON.stringify(analysis),
          status: "invalid_ai_response",
          duration: Date.now() - start,
        },
      });
      return res.status(502).json({
        error: "AI returned invalid response",
        details: aiValidation.errors,
      });
    }

    // 5. Decision
    let decision = "auto_reply";
    if (analysis.should_escalate || analysis.priority === "urgent") {
      decision = "human_review";
    } else if (
      analysis.intent === "refund" ||
      analysis.intent === "complaint"
    ) {
      decision = "create_ticket";
    }

    // 6. Execute
    let ticket = null;
    if (decision === "create_ticket" || decision === "human_review") {
      ticket = await prisma.ticket.create({
        data: {
          message,
          intent: analysis.intent,
          sentiment: analysis.sentiment,
          priority: analysis.priority,
          summary: analysis.summary,
          reply: analysis.suggested_reply,
          status: decision === "human_review" ? "escalated" : "open",
          source,
        },
      });
      // أرسل للـ CRM
      await sendToCRM("ticket_created", {
        ticket_id: ticket.id,
        intent: ticket.intent,
        priority: ticket.priority,
        summary: ticket.summary,
        source: ticket.source,
      });
    }

    // إشعار للفريق
    if (decision === "human_review") {
      await notify("ticket_escalated", {
        ticket_id: ticket.id,
        priority: ticket.priority,
        summary: ticket.summary,
        message: ticket.message,
      });
    }

    // 7. Log
    await prisma.webhookLog.create({
      data: {
        source,
        payload: JSON.stringify(req.body),
        response: JSON.stringify(analysis),
        status: decision,
        duration: Date.now() - start,
      },
    });

    // 8. Response
    const response = {
      decision,
      analysis,
      ticket: ticket ? { id: ticket.id, status: ticket.status } : null,
    };

    if (decision === "auto_reply") {
      response.auto_reply = {
        text: analysis.suggested_reply,
        channel: source,
      };
    }

    if (decision === "human_review" && ticket) {
      response.human_review = {
        ticket_id: ticket.id,
        priority: ticket.priority,
        summary: ticket.summary,
      };
    }

    res.json(response);
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Tickets list
app.get("/tickets", async (req, res) => {
  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  res.json(tickets);
});

// Tickets needing review
app.get("/tickets/review", verifyWebhook, async (req, res) => {
  const tickets = await prisma.ticket.findMany({
    where: { status: "escalated" },
    orderBy: { createdAt: "desc" },
  });
  res.json(tickets);
});

// Close ticket
app.patch("/tickets/:id/close", verifyWebhook, async (req, res) => {
  try {
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: "closed" },
    });
    res.json(ticket);
  } catch (err) {
    res.status(404).json({ error: "Ticket not found" });
  }
});

// Assign ticket
app.patch("/tickets/:id/assign", verifyWebhook, async (req, res) => {
  try {
    const { assignedTo } = req.body;
    if (!assignedTo) {
      return res.status(400).json({ error: "assignedTo is required" });
    }
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: "in_progress", assignedTo },
    });
    res.json(ticket);
  } catch (err) {
    res.status(404).json({ error: "Ticket not found" });
  }
});

// Review ticket
app.patch("/tickets/:id/review", verifyWebhook, async (req, res) => {
  try {
    const { action, note } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res
        .status(400)
        .json({ error: "action must be approve or reject" });
    }
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        status: action === "approve" ? "in_progress" : "closed",
        reply: note || undefined,
      },
    });
    // أرسل للـ CRM
    await sendToCRM("ticket_" + action, {
      ticket_id: ticket.id,
      status: ticket.status,
      note: note || null,
    });

    // إشعار للفريق
    await notify("ticket_" + action, {
      ticket_id: ticket.id,
      status: ticket.status,
    });

    res.json(ticket);
  } catch (err) {
    res.status(404).json({ error: "Ticket not found" });
  }
});

// Start
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
