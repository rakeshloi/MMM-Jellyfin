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

  getDom: function() {
    const wrapper = document.createElement("div");
    wrapper.className = "jellyfin-wrapper";
  
    if (this.offline) {
      return wrapper; // If offline, return the empty wrapper.
    }
  
    const item = this.nowPlaying || this.items[this.currentIndex];
    if (!item) {
      wrapper.innerHTML = ""; // Return empty if no item is available.
      return wrapper;
    }
  
    const container = document.createElement("div");
    container.className = "jellyfin-container";
  
    const poster = document.createElement("img");
    poster.className = "jellyfin-poster";
    poster.src = item.poster || ""; // Poster URL or empty string.
    container.appendChild(poster);
  
    const details = document.createElement("div");
    details.className = "jellyfin-details";
  
    const title = document.createElement("div");
    title.className = "jellyfin-title";
    title.textContent = item.title || "Untitled"; // Display movie title or "Untitled".
    details.appendChild(title);
  
    if (item.premiereDate) {
      const date = document.createElement("div");
      date.className = "jellyfin-premiere-date";
      const formattedDate = new Date(item.premiereDate).toLocaleDateString();
      date.textContent = `Premiere: ${formattedDate}`; // Display formatted premiere date.
      details.appendChild(date);
    }
  
    if (item.officialRating) {
      const certificateImg = document.createElement("img");
      certificateImg.className = "jellyfin-certificate";
      certificateImg.src = `modules/MMM-Jellyfin/certificates/${item.officialRating}.png`;
      certificateImg.alt = item.officialRating; // Display certificate image.
      details.appendChild(certificateImg);
    }
  
    if (item.overview) {
      const overview = document.createElement("div");
      overview.className = "scrollable-overview";
  
      const overviewText = document.createElement("p");
      overviewText.textContent = item.overview || "No description available."; // Overview text.
      overview.appendChild(overviewText);
      details.appendChild(overview);
  
      // Temporarily append container to measure overview height.
      container.appendChild(details);
      document.body.appendChild(wrapper);
  
      // Measure line height and maximum allowed height.
      const lineHeight = parseFloat(getComputedStyle(overviewText).lineHeight);
      const maxAllowedHeight = lineHeight * 4; // Maximum height for 4 lines.
  
      // Determine if scrolling is needed.
      if (overviewText.scrollHeight > maxAllowedHeight) {
        overviewText.classList.add("scrollable-content"); // Add scrolling animation.
      } else {
        overviewText.classList.remove("scrollable-content"); // Remove animation if unnecessary.
      }
  
      // Remove temporary DOM addition after measurement.
      document.body.removeChild(wrapper);
    }
  
    container.appendChild(details);
    wrapper.appendChild(container);
    return wrapper; // Return the complete DOM structure.
  },  
});
