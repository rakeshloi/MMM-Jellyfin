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

    this.getData(); // Fetch "Recently Added" data immediately

    // Refresh "Recently Added" data periodically
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

    // Check "Now Playing" periodically
    setInterval(() => {
      if (!this.offline) {
        this.checkNowPlaying();
      }
    }, this.config.nowPlayingCheckInterval);

    // Retry fetching data when offline
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
          this.items = []; // Clear "Recently Added" while "Now Playing" is active
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
    this.data.header = text; // Dynamically update the header text
    this.updateDom();
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "jellyfin-wrapper";

    // Completely hide DOM if offline
    if (this.offline) {
      return wrapper; // Empty wrapper when offline
    }

    const item = this.nowPlaying || this.items[this.currentIndex];
    if (!item) {
      wrapper.innerHTML = ""; // Do not show any content while loading
      return wrapper;
    }

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.alignItems = "center";

    const posterWrapper = document.createElement("div");
    posterWrapper.style.display = "flex";
    posterWrapper.style.alignItems = "center";
    posterWrapper.style.marginRight = "10px";

    const poster = document.createElement("img");
    poster.src = item.poster || "";
    poster.style.width = "120px";
    poster.style.height = "200px";
    poster.style.objectFit = "cover";

    posterWrapper.appendChild(poster);

    const details = document.createElement("div");
    details.style.display = "flex";
    details.style.flexDirection = "column";

    const title = document.createElement("h2");
    title.textContent = item.title || "Untitled";
    title.style.fontSize = "0.9em";
    title.style.margin = "0 0 4px 0";
    details.appendChild(title);

    if (item.officialRating) {
      const rating = document.createElement("div");
      rating.textContent = `Rating: ${item.officialRating}`;
      rating.style.fontSize = "0.8em";
      rating.style.color = "#ccc";
      rating.style.marginBottom = "4px";
      details.appendChild(rating);
    }

    if (item.premiereDate) {
      const date = document.createElement("div");
      const formattedDate = new Date(item.premiereDate).toLocaleDateString();
      date.textContent = `Premiere: ${formattedDate}`;
      date.style.fontSize = "0.8em";
      date.style.color = "#ccc";
      date.style.marginBottom = "4px";
      details.appendChild(date);
    }

    if (item.overview) {
      const overview = document.createElement("p");
      overview.textContent = item.overview || "No description available.";
      overview.style.fontSize = "0.75em";
      overview.style.lineHeight = "1.2em";
      details.appendChild(overview);
    }

    // Add progress bar for "Now Playing"
    if (this.nowPlaying) {
      const progressContainer = document.createElement("div");
      progressContainer.style.marginTop = "10px";

      const progressPct =
        (this.nowPlaying.positionTicks / this.nowPlaying.runTimeTicks) * 100 || 0;

      const progressBar = document.createElement("div");
      progressBar.style.height = "10px";
      progressBar.style.background = "#444";
      progressBar.style.width = "100%";
      progressBar.style.borderRadius = "5px";

      const progressFill = document.createElement("div");
      progressFill.style.width = `${progressPct}%`;
      progressFill.style.height = "100%";
      progressFill.style.background = this.nowPlaying.isPaused ? "#f00" : "#0f0";
      progressFill.style.borderRadius = "5px";
      progressBar.appendChild(progressFill);

      const timeRemaining =
        Math.max(
          0,
          this.nowPlaying.runTimeTicks - this.nowPlaying.positionTicks
        ) / 10000000;
      const timeRemainingText = `${Math.floor(timeRemaining / 60)}m ${
        Math.floor(timeRemaining % 60)
      }s remaining`;

      const timeLabel = document.createElement("div");
      timeLabel.textContent = timeRemainingText;
      timeLabel.style.fontSize = "0.75em";
      timeLabel.style.color = "#ccc";
      timeLabel.style.marginTop = "5px";

      progressContainer.appendChild(progressBar);
      progressContainer.appendChild(timeLabel);
      details.appendChild(progressContainer);
    }

    container.appendChild(posterWrapper);
    container.appendChild(details);
    wrapper.appendChild(container);

    return wrapper;
  },
});
