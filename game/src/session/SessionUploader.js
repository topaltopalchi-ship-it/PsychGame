export class SessionUploader {
  constructor({ endpoint = "", token = "" } = {}) {
    this.endpoint = String(endpoint || "").replace(/\/$/, "");
    this.token = token || "";
    this.queueKey = "psychgame_upload_queue_v1";
  }

  isConfigured() {
    return Boolean(this.endpoint);
  }

  async upload(report, { completed = false } = {}) {
    if (!this.isConfigured() || !report) return { skipped: true };

    const payload = {
      version: 1,
      completed: Boolean(completed),
      uploadedAt: new Date().toISOString(),
      report
    };

    try {
      const response = await fetch(this.endpoint + "/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.token ? { Authorization: "Bearer " + this.token } : {})
        },
        body: JSON.stringify(payload),
        keepalive: true
      });

      if (!response.ok) throw new Error("Upload failed: " + response.status);
      this.clearQueue();
      return { uploaded: true };
    } catch (error) {
      this.queue(payload);
      console.warn("PsychGame remote upload failed; queued locally.", error);
      return { uploaded: false, queued: true };
    }
  }

  queue(payload) {
    try {
      const current = JSON.parse(localStorage.getItem(this.queueKey) || "[]");
      current.push(payload);
      localStorage.setItem(this.queueKey, JSON.stringify(current.slice(-20)));
    } catch {}
  }

  clearQueue() {
    try { localStorage.removeItem(this.queueKey); } catch {}
  }
}
