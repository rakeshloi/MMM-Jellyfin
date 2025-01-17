Module.register("MMM-Jellyfin", {
  defaults: {
    apiKey: "",
    serverUrl: "",
    userId: "",
    parentId: "",
    contentType: "Movie",
    maxItems: 15,
    updateInterval: 1 * 60 * 1000, // Fetch new data every minute
    rotateInterval: 30 * 1000, // Rotate items every 30 seconds
    nowPlayingCheckInterval: 15 * 1000, // Check "Now Playing" every 15 seconds
    retryInterval: 5 * 60 * 1000, // Retry every 5 minutes if Jellyfin is offline
    title: "Jellyfin", // Default module title
  },

  getStyles() {
    return ["MMM-Jellyfin.css"];
  },

  start() {
    console.log("[MMM-Jellyfin] Starting module...");
    this.items = [];
    this.nowPlaying = null;
    this.currentIndex = 0;
    this.offline = false;
    this.previousNowPlaying = null; // Track previous Now Playing state

    this.getData();

    // Periodically refresh "Recently Added" data
    setInterval(() => {
      if (!this.nowPlaying) {
        this.getData();
      }
    }, this.config.updateInterval);

    // Rotate through "Recently Added" items
    setInterval(() => {
      if (!this.offline && !this.nowPlaying && this.items.length > 1) {
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        this.updateDom();
      }
    }, this.config.rotateInterval);

    // Check for "Now Playing" updates
    setInterval(() => {
      if (!this.offline) {
        this.checkNowPlaying();
      }
    }, this.config.nowPlayingCheckInterval);

    // Retry fetching data if offline
    setInterval(() => {
      if (this.offline) {
        this.getData();
      }
    }, this.config.retryInterval);
  },

  getData() {
    this.sendSocketNotification("FETCH_JELLYFIN_DATA", this.config);
  },

  checkNowPlaying() {
    this.sendSocketNotification("FETCH_NOW_PLAYING_DETAILS", {
      serverUrl: this.config.serverUrl,
      apiKey: this.config.apiKey,
      userId: this.config.userId,
    });
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "JELLYFIN_DATA") {
      this.offline = false;
      this.show(1000, { lockString: "jellyfin-offline" });

      if (payload.type === "nowPlaying") {
        if (payload.data && JSON.stringify(this.nowPlaying) !== JSON.stringify(payload.data)) {
          this.nowPlaying = payload.data;
          this.items = []; // Clear "Recently Added" while "Now Playing" is active
          this.updateHeader(`${this.config.title}: Now Playing`);
        } else if (!payload.data && this.nowPlaying) {
          this.nowPlaying = null;
          this.updateHeader(`${this.config.title}: Now Showing`);
        }
      } else if (payload.type === "recentlyAdded") {
        if (JSON.stringify(this.items) !== JSON.stringify(payload.data)) {
          this.items = payload.data || [];
          this.currentIndex = 0;
        }
        this.nowPlaying = null;
        this.updateHeader(`${this.config.title}: Recently Added`);
      }
      this.updateDom();
    } else if (notification === "JELLYFIN_OFFLINE") {
      this.offline = true;
      this.updateHeader(""); // Clear the header when offline
      this.hide(1000, { lockString: "jellyfin-offline" });
    }
  },

  updateHeader(text) {
    this.data.header = text; // Dynamically update the header text
    this.updateDom();
  },
});
