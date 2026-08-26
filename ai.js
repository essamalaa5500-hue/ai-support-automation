const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function analyze(message) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a support message analyzer.
Analyze the message and return ONLY JSON, nothing else:
{
  "intent": "refund|complaint|question|order_status|other",
  "sentiment": "positive|neutral|negative|angry",
  "priority": "low|normal|high|urgent",
  "summary": "short summary",
  "should_escalate": true/false,
  "suggested_reply": "suggested reply"
}`,
        },
        { role: "user", content: message },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

module.exports = { analyze };
