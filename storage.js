class Storage {
  sessions = {};
  cleanupIntervalMinutes;

  constructor(config) {
    this.cleanupIntervalMinutes = Math.max(1, (config || {}).cleanupIntervalMinutes || 30);

    setInterval(
      () => this.cleanup(),
      this.cleanupIntervalMinutes * 60 * 1000
    );
  }

  get(id) {
    return this.sessions[id] || null;
  }

  save(session) {
    if (session && session.id) {
      this.sessions[session.id] = session;
    }
  }

  cleanup() {
    const now = new Date();
    const minDate = now.setMinutes(now.getMinutes() - this.cleanupIntervalMinutes);
    let deleteCount = 0;

    for (let id in this.sessions) {
      if (!this.sessions[id].created || this.sessions[id].created < minDate) {
        delete this.sessions[id];
        deleteCount++;
      }
    }

    console.debug(`Deleted ${deleteCount} sessions older than ${this.cleanupIntervalMinutes} minutes`);
  }
}

exports.Storage = Storage
