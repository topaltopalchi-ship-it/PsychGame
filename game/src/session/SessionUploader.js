export class SessionUploader {
  constructor({ endpoint = "", token = "" } = {}) {
    this.endpoint = String(endpoint || "").replace(/\/$/, "");
    this.token = token || "";
    this.queueKey = "psychgame_upload_queue_v1";
    this.flushing = false;
    this.uploadChain = Promise.resolve();
    this.pendingUploads = 0;
  }

  isConfigured() {
    return Boolean(this.endpoint);
  }

  upload(report, { completed = false } = {}) {
    const flushBeforeUpload = this.pendingUploads === 0;
    this.pendingUploads += 1;
    const task = async () => {
      try {
        if (flushBeforeUpload) await this.flushQueue();
        return await this._upload(report, { completed });
      } finally {
        this.pendingUploads -= 1;
      }
    };
    this.uploadChain = this.uploadChain.then(task, task);
    return this.uploadChain;
  }

  async _upload(report, { completed = false } = {}) {
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
      return { uploaded: true };
    } catch (error) {
      const queued = this.queue(payload);
      console.warn("PsychGame remote upload failed; queued locally.", error);
      return { uploaded: false, queued };
    }
  }

  queue(payload) {
    try {
      const current = JSON.parse(localStorage.getItem(this.queueKey) || "[]");
      const sessionId = payload?.report?.sessionId;
      const isCompleted = Boolean(payload?.completed);
      let filtered = current;

      if (sessionId) {
        if (isCompleted) {
          filtered = current.filter(item => item?.report?.sessionId !== sessionId);
        } else {
          filtered = current.filter(item =>
            item?.report?.sessionId !== sessionId || Boolean(item.completed)
          );
        }
      }

      filtered.push(payload);
      localStorage.setItem(this.queueKey, JSON.stringify(filtered.slice(-20)));
      return true;
    } catch {
      return false;
    }
  }

  payloadId(payload) {
    return payload?.report?.sessionId
      ? `${payload.report.sessionId}:${payload.completed ? "completed" : "progress"}`
      : `${payload?.uploadedAt || ""}:${payload?.report?.playerCode || ""}`;
  }

  async flushQueue() {
    if (this.flushing || !this.isConfigured()) return;
    this.flushing = true;
    try {
      const queue = this.readQueue();
      if (!queue.length) return;
      const remaining = [];
      for (const payload of queue) {
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
        } catch (_) {
          remaining.push(payload);
        }
      }
      localStorage.setItem(this.queueKey, JSON.stringify(remaining.slice(-20)));
    } catch (_) {
      // Keep the existing queue intact if storage/network handling fails.
    } finally {
      this.flushing = false;
    }
  }

  readQueue() {
    try {
      const value = JSON.parse(localStorage.getItem(this.queueKey) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) { return []; }
  }

  clearQueue() {
    try { localStorage.removeItem(this.queueKey); } catch {}
  }
}
