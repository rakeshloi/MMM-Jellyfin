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
    console.log("[MMM-Jellyfin] Starting module...");
    this.items = [];
    this.nowPlaying = null;
    this.currentIndex = 0;
    this.offline = false;

    this.getData();

    setInterval(() => {
      if (!this.nowPlaying) this.getData();
    }, this.config.updateInterval);

    setInterval(() => {
      if (!this.offline && !this.nowPlaying && this.items.length > 1) {
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        this.updateDom();
      }
    }, this.config.rotateInterval);

    setInterval(() => {
      if (!this.offline) this.checkNowPlaying();
    }, this.config.nowPlayingCheckInterval);

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
    if (!item) {
      wrapper.innerHTML = "";
      return wrapper;
    }
  
    const container = document.createElement("div");
    container.className = "jellyfin-container";
  
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
  
    if (item.officialRating || item.runTimeTicks) {
      const certRuntimeContainer = document.createElement("div");
      certRuntimeContainer.className = "jellyfin-cert-runtime";
  
      if (item.officialRating) {
        const certificateImg = document.createElement("img");
        certificateImg.className = "jellyfin-certificate";
        certificateImg.src = `modules/MMM-Jellyfin/certificates/${item.officialRating}.png`;
        certificateImg.alt = item.officialRating;
        certRuntimeContainer.appendChild(certificateImg);
      }
  
      if (item.runTimeTicks) {
        const runtime = document.createElement("div");
        runtime.className = "jellyfin-runtime";
        const runtimeMinutes = Math.floor(item.runTimeTicks / 600000000); // Convert ticks to minutes
        runtime.textContent = `${runtimeMinutes} min`;
        certRuntimeContainer.appendChild(runtime);
      }
  
      details.appendChild(certRuntimeContainer);
    }
  
    if (item.overview) {
      const overview = document.createElement("div");
      overview.className = "jellyfin-overview";
      const overviewText = document.createElement("p");
      overviewText.textContent = item.overview || "No description available.";
      overview.appendChild(overviewText);
      details.appendChild(overview);
    }
  
    // Progress Bar
    if (item.positionTicks !== undefined && item.runTimeTicks !== undefined) {
      const progressBarContainer = document.createElement("div");
      progressBarContainer.className = "jellyfin-progress-bar-container";
  
      const progressBar = document.createElement("div");
      progressBar.className = "jellyfin-progress-bar";
      const progressPercentage = (item.positionTicks / item.runTimeTicks) * 100;
      progressBar.style.width = `${progressPercentage}%`;
  
      // Change color based on playback state
      if (item.isPaused) {
        progressBar.style.backgroundColor = "red"; // Red when paused
      } else {
        progressBar.style.backgroundColor = "#4caf50"; // Green when playing
      }
  
      progressBarContainer.appendChild(progressBar);
      details.appendChild(progressBarContainer);
  
      // Remaining Time
      const remainingTime = document.createElement("div");
      remainingTime.className = "jellyfin-remaining-time";
      const remainingTicks = item.runTimeTicks - item.positionTicks;
      const remainingMinutes = Math.floor(remainingTicks / 600000000); // Convert ticks to minutes
      remainingTime.textContent = `Remaining: ${remainingMinutes} min`;
      details.appendChild(remainingTime);
    }
  
    const poster = document.createElement("img");
    poster.className = "jellyfin-poster";
    poster.src = item.poster || "";
    container.appendChild(details);
    container.appendChild(poster);
  
    wrapper.appendChild(container);
    return wrapper;
  },  
});
