const NOTIFY_URL = process.env.NOTIFY_WEBHOOK_URL;

async function notify(event, data) {
  if (!NOTIFY_URL) {
    console.log("Notify: skipped, no NOTIFY_WEBHOOK_URL configured");
    return null;
  }

  try {
    const res = await fetch(NOTIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      throw new Error("Notify responded with " + res.status);
    }

    const result = await res.json();
    console.log("Notify: sent", event);
    return result;
  } catch (err) {
    console.error("Notify error:", err.message);
    return null;
  }
}

module.exports = { notify };
