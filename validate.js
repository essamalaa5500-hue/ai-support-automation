const ALLOWED_SOURCES = ["whatsapp", "email", "chat", "telegram", "facebook"];

function validateInput(data) {
  const errors = [];

  // message مطلوب
  if (!data.message) {
    errors.push("message is required");
  } else if (typeof data.message !== "string") {
    errors.push("message must be a string");
  } else if (data.message.trim().length < 2) {
    errors.push("message is too short");
  } else if (data.message.length > 5000) {
    errors.push("message is too long (max 5000 chars)");
  }

  if (data.source && !ALLOWED_SOURCES.includes(data.source)) {
    errors.push("source must be one of: " + ALLOWED_SOURCES.join(", "));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function normalize(data) {
  return {
    message: data.message.trim().replace(/\s+/g, " "),
    source: data.source || "unknown",
    customer_id: data.customer_id || null,
  };
}

const REQUIRED_FIELDS = [
  "intent",
  "sentiment",
  "priority",
  "summary",
  "should_escalate",
  "suggested_reply",
];
const VALID_INTENTS = [
  "refund",
  "complaint",
  "question",
  "order_status",
  "other",
];
const VALID_SENTIMENTS = ["positive", "neutral", "negative", "angry"];
const VALID_PRIORITIES = ["low", "normal", "high", "urgent"];

function validateAIResponse(analysis) {
  const errors = [];

  // كل الحقول موجودة
  for (const field of REQUIRED_FIELDS) {
    if (analysis[field] === undefined || analysis[field] === null) {
      errors.push("missing field: " + field);
    }
  }

  // intent صحيح
  if (analysis.intent && !VALID_INTENTS.includes(analysis.intent)) {
    errors.push("invalid intent: " + analysis.intent);
  }

  // sentiment صحيح
  if (analysis.sentiment && !VALID_SENTIMENTS.includes(analysis.sentiment)) {
    errors.push("invalid sentiment: " + analysis.sentiment);
  }

  // priority صحيح
  if (analysis.priority && !VALID_PRIORITIES.includes(analysis.priority)) {
    errors.push("invalid priority: " + analysis.priority);
  }

  // should_escalate boolean
  if (
    analysis.should_escalate !== undefined &&
    typeof analysis.should_escalate !== "boolean"
  ) {
    errors.push("should_escalate must be true or false");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = { validateInput, normalize, validateAIResponse };
