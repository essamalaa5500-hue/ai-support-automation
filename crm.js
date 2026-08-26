const CRM_URL = process.env.CRM_WEBHOOK_URL;

async function sendToCRM(event, data) {
  if (!CRM_URL) {
    console.log("CRM: skipped, no CRM_WEBHOOK_URL configured");
    return null;
  }

  try {
    const res = await fetch(CRM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      throw new Error("CRM responded with " + res.status);
    }

    const result = await res.json();
    console.log("CRM: sent", event);
    return result;
  } catch (err) {
    console.error("CRM error:", err.message);
    return null;
  }
}

module.exports = { sendToCRM };
