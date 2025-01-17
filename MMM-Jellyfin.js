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

    this.getData();

    setInterval(() => {
      if (!this.nowPlaying) {
        this.getData();
      }
    }, this.config.updateInterval);

    setInterval(() => {
      if (!this.offline && !this.nowPlaying && this.items.length > 1) {
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        this.updateDom();
      }
    }, this.config.rotateInterval);

    setInterval(() => {
      if (!this.offline) {
        this.checkNowPlaying();
      }
    }, this.config.nowPlayingCheckInterval);

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
        if (payload.data) {
          this.nowPlaying = payload.data;
          this.items = [];
          this.updateHeader(`${this.config.title}: Now Playing`);
        } else {
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
    this.data.header = text;
    this.updateDom();
  },
  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "jellyfin-wrapper";

    // Check if offline
    if (this.offline) {
        wrapper.innerHTML = "Jellyfin is offline.";
        return wrapper;
    }

    const item = this.nowPlaying || this.items[this.currentIndex];
    if (!item) {
        wrapper.innerHTML = "Loading...";
        return wrapper;
    }

    const container = document.createElement("div");
    container.className = "jellyfin-container";

    // Poster
    const posterWrapper = document.createElement("div");
    posterWrapper.className = "jellyfin-poster-wrapper";

    const poster = document.createElement("img");
    poster.src = item.poster || "";
    poster.className = "jellyfin-poster";

    posterWrapper.appendChild(poster);
    container.appendChild(posterWrapper);

    // Details
    const details = document.createElement("div");
    details.className = "jellyfin-details";

    const title = document.createElement("h2");
    title.className = "jellyfin-title";
    title.textContent = item.title || "Untitled";
    details.appendChild(title);

    const premiereDate = document.createElement("div");
    premiereDate.className = "jellyfin-premiere-date";
    premiereDate.textContent = `Premiere: ${new Date(item.premiereDate).toLocaleDateString()}`;
    details.appendChild(premiereDate);

    if (item.officialRating) {
        const certImage = document.createElement("img");
        certImage.src = `modules/MMM-Jellyfin/certificates/${item.officialRating}.png`;
        certImage.alt = item.officialRating;
        certImage.className = "jellyfin-certificate";
        details.appendChild(certImage);
    }

    const overview = document.createElement("p");
    overview.className = "scrollable-overview";
    overview.textContent = item.overview || "No description available.";
    details.appendChild(overview);

    container.appendChild(details);
    wrapper.appendChild(container);

    return wrapper;
},
});
