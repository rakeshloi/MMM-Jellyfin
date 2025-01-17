Module.register("MMM-Jellyfin", {
  defaults: {
    apiKey: "",
    serverUrl: "",
    userId: "",
    parentId: "",
    contentType: "Movie",
    maxItems: 15,
    updateInterval: 60 * 1000, // Fetch every minute
    rotateInterval: 30 * 1000, // Rotate items every 30 seconds
    nowPlayingCheckInterval: 15 * 1000, // Check Now Playing every 15 seconds
    retryInterval: 5 * 60 * 1000, // Retry every 5 minutes
    title: "Jellyfin", // Default title
  },

  getStyles() {
    return ["MMM-Jellyfin.css"];
  },

  start() {
    this.items = [];
    this.nowPlaying = null;
    this.currentIndex = 0;
    this.offline = false;

    this.getData();
    setInterval(() => this.getData(), this.config.updateInterval);
    setInterval(() => this.rotateItems(), this.config.rotateInterval);
    setInterval(() => this.checkNowPlaying(), this.config.nowPlayingCheckInterval);
    setInterval(() => {
      if (this.offline) this.getData();
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

  rotateItems() {
    if (!this.offline && !this.nowPlaying && this.items.length > 1) {
      this.currentIndex = (this.currentIndex + 1) % this.items.length;
      this.updateDom();
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "JELLYFIN_DATA") {
      this.offline = false;
      this.show(1000, { lockString: "jellyfin-offline" });

      if (payload.type === "nowPlaying") {
        this.nowPlaying = payload.data;
        this.items = [];
        this.updateHeader(`${this.config.title}: Now Playing`);
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
      this.updateHeader("");
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

    if (this.offline) return wrapper;

    const item = this.nowPlaying || this.items[this.currentIndex];
    if (!item) return wrapper;

    const container = document.createElement("div");
    container.className = "jellyfin-container";

    const poster = document.createElement("img");
    poster.className = "jellyfin-poster";
    poster.src = item.poster || "";
    container.appendChild(poster);

    const details = document.createElement("div");
    details.className = "jellyfin-details";

    const title = document.createElement("div");
    title.className = "jellyfin-title";
    title.textContent = item.title || "Untitled";
    details.appendChild(title);

    if (item.premiereDate) {
      const date = document.createElement("div");
      date.className = "jellyfin-premiere-date";
      const formattedDate = new Date(item.premiereDate).toLocaleDateString();
      date.textContent = `Premiere: ${formattedDate}`;
      details.appendChild(date);
    }

    if (item.officialRating) {
      const certificateImg = document.createElement("img");
      certificateImg.className = "jellyfin-certificate";
      certificateImg.src = `modules/MMM-Jellyfin/certificates/${item.officialRating}.png`;
      certificateImg.alt = item.officialRating;
      details.appendChild(certificateImg);
    }

    if (item.overview) {
      const overview = document.createElement("div");
      overview.className = "scrollable-overview";

      const overviewText = document.createElement("p");
      overviewText.textContent = item.overview || "No description available.";
      overview.appendChild(overviewText);

      // Temporarily add to DOM to measure height
      details.appendChild(overview);
      wrapper.appendChild(container);
      document.body.appendChild(wrapper);

      const lineHeight = parseFloat(getComputedStyle(overviewText).lineHeight);
      const maxAllowedHeight = lineHeight * 4;

      if (overviewText.scrollHeight > maxAllowedHeight) {
        overviewText.classList.add("scrollable-content");
      } else {
        overviewText.classList.remove("scrollable-content");
      }

      document.body.removeChild(wrapper);
    }

    if (this.nowPlaying) {
      const progressContainer = document.createElement("div");
      progressContainer.className = "jellyfin-progress-container";

      const progressPct =
        (this.nowPlaying.positionTicks / this.nowPlaying.runTimeTicks) * 100 || 0;

      const progressBar = document.createElement("div");
      progressBar.className = "jellyfin-progress-bar";

      const progressFill = document.createElement("div");
      progressFill.className = "jellyfin-progress-fill";
      progressFill.style.width = `${progressPct}%`;
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
      timeLabel.className = "jellyfin-time-remaining";
      timeLabel.textContent = timeRemainingText;

      progressContainer.appendChild(progressBar);
      progressContainer.appendChild(timeLabel);
      details.appendChild(progressContainer);
    }

    container.appendChild(details);
    wrapper.appendChild(container);
    return wrapper;
  },
});
