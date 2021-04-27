class Storage {
  sessions;
  seedSessions;
  cleanupIntervalMinutes;

  constructor(config) {
    this.sessions = {};
    this.seedSessions = {};
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

  seed(sessions) {
    for (let session of sessions || []) {
      this.seedSessions[session.id] = session;
      this.sessions[session.id] = { ...session }; // copy to mutate
    }
  }

  cleanup() {
    const now = new Date();
    const minDate = now.setMinutes(now.getMinutes() - this.cleanupIntervalMinutes);
    let deleteCount = 0;

    for (let id in this.sessions) {
      if (!this.sessions[id].updated || this.sessions[id].updated < minDate) {
        if (this.seedSessions[id]) {
          this.sessions[id] = { ...this.seedSessions[id], created: new Date(), updated: new Date() }
        } else {
          delete this.sessions[id];
        }

        deleteCount++;
      }
    }

    console.debug(`Deleted ${deleteCount} sessions older than ${this.cleanupIntervalMinutes} minutes`);
  }
}

exports.Storage = Storage
