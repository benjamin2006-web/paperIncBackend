class UploadQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.onProgress = null;
  }

  add(uploadData, onComplete) {
    this.queue.push({ uploadData, onComplete });
    this.process();
  }

  async process() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const item = this.queue.shift();

    try {
      const result = await this.upload(item.uploadData);
      item.onComplete(null, result);
    } catch (error) {
      item.onComplete(error);
    } finally {
      this.isProcessing = false;
      this.process();
    }
  }

  async upload(uploadData) {
    // Implement upload logic with retries
    for (let i = 0; i < 3; i++) {
      try {
        const response = await api.post('/papers', uploadData, {
          timeout: 120000,
        });
        return response.data;
      } catch (error) {
        if (i === 2) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, i) * 1000),
        );
      }
    }
  }
}

export default new UploadQueue();
