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
    this.data.header = text;
    this.updateDom();
  },

  getDom: function () {
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
  
    // Overview with scrolling functionality
    if (item.overview) {
      const overview = document.createElement("div");
      overview.className = "scrollable-overview";
  
      const overviewText = document.createElement("p");
      overviewText.textContent = item.overview || "No description available.";
      overview.appendChild(overviewText);
      details.appendChild(overview);
  
      // Temporarily add to DOM to measure height
      wrapper.appendChild(container);
      document.body.appendChild(wrapper);
  
      // Calculate line height and maximum allowed height
      const lineHeight = parseFloat(getComputedStyle(overviewText).lineHeight);
      const maxAllowedHeight = lineHeight * 5; // 5 lines
  
      // Check if the content exceeds 5 lines
      if (overviewText.scrollHeight > maxAllowedHeight) {
        overviewText.classList.add("scrollable-content");
      } else {
        overviewText.classList.remove("scrollable-content");
      }
  
      // Remove from DOM after measurement
      document.body.removeChild(wrapper);
    }
  
    const poster = document.createElement("img");
    poster.className = "jellyfin-poster";
    poster.src = item.poster || "";
    container.appendChild(details);
    container.appendChild(poster);
  
    wrapper.appendChild(container);
    return wrapper;
  }  
});
