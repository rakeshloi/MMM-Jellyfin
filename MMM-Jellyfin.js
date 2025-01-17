Module.register("MMM-Jellyfin", {
  defaults: {
    apiKey: "",
    serverUrl: "",
    userId: "",
    parentId: "",
    contentType: "Movie",
    maxItems: 15,
    updateInterval: 1 * 60 * 1000,
    rotateInterval: 30 * 1000,
    nowPlayingCheckInterval: 15 * 1000,
    retryInterval: 5 * 60 * 1000,
    title: "Jellyfin",
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
    this.setupIntervals();
  },

  setupIntervals() {
    setInterval(() => {
      if (!this.nowPlaying) {
        this.getData();
      }
    }, this.config.updateInterval);

    setInterval(() => {
      if (!this.offline && !this.nowPlaying && this.items.length > 1) {
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        this.updatePartialDom(false);
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

      if (payload.type === "nowPlaying") {
        if (payload.data) {
          if (JSON.stringify(this.nowPlaying) !== JSON.stringify(payload.data)) {
            this.nowPlaying = payload.data;
            this.updatePartialDom(true);
          }
        } else {
          this.nowPlaying = null;
          this.updatePartialDom(false);
        }
      } else if (payload.type === "recentlyAdded") {
        if (JSON.stringify(this.items) !== JSON.stringify(payload.data)) {
          this.items = payload.data || [];
          this.currentIndex = 0;
          this.updatePartialDom(false);
        }
      }
    } else if (notification === "JELLYFIN_OFFLINE") {
      this.offline = true;
      this.hide(1000, { lockString: "jellyfin-offline" });
    }
  },

  updatePartialDom(isNowPlaying = false) {
    if (isNowPlaying) {
      const progressBar = document.querySelector(".jellyfin-progress-fill");
      const timeLabel = document.querySelector(".jellyfin-time-label");
      if (progressBar && timeLabel && this.nowPlaying) {
        const progressPct =
          (this.nowPlaying.positionTicks / this.nowPlaying.runTimeTicks) * 100;
        progressBar.style.width = `${progressPct}%`;
        progressBar.style.background = this.nowPlaying.isPaused ? "#f00" : "#0f0";

        const timeRemaining =
          Math.max(
            0,
            this.nowPlaying.runTimeTicks - this.nowPlaying.positionTicks
          ) / 10000000;
        timeLabel.textContent = `${Math.floor(timeRemaining / 60)}m ${
          Math.floor(timeRemaining % 60)
        }s remaining`;
      }
    } else {
      this.updateDom();
    }
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "jellyfin-wrapper";

    if (this.offline) {
      return wrapper;
    }

    const item = this.nowPlaying || this.items[this.currentIndex];
    if (!item) {
      wrapper.innerHTML = "";
      return wrapper;
    }

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
      details.appendChild(overview);

      const lineHeight = 1.2 * parseFloat(getComputedStyle(overviewText).fontSize);
      const maxHeight = lineHeight * 4;

      if (overviewText.scrollHeight > maxHeight) {
        overviewText.classList.add("scrollable-content");
      } else {
        overviewText.classList.remove("scrollable-content");
      }
    }

    if (this.nowPlaying) {
      const progressContainer = document.createElement("div");
      progressContainer.className = "jellyfin-progress-container";

      const progressBar = document.createElement("div");
      progressBar.className = "jellyfin-progress-bar";

      const progressFill = document.createElement("div");
      progressFill.className = "jellyfin-progress-fill";

      progressBar.appendChild(progressFill);
      progressContainer.appendChild(progressBar);

      const timeLabel = document.createElement("div");
      timeLabel.className = "jellyfin-time-label";
      progressContainer.appendChild(timeLabel);

      details.appendChild(progressContainer);
    }

    container.appendChild(details);
    wrapper.appendChild(container);

    return wrapper;
  },
});
