Module.register("MMM-Jellyfin", {
  defaults: {
    apiKey: "",
    serverUrl: "",
    userId: "",
    parentId: "",
    contentType: "Movie",
    maxItems: 5,
    updateInterval: 10 * 60 * 1000, // 10 mins
    rotateInterval: 30 * 1000, // 30 secs
    nowPlayingCheckInterval: 15 * 1000, // 15 secs for now playing updates
    retryInterval: 5 * 60 * 1000, // Retry every 5 mins if Jellyfin is offline
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

    // Fetch "Recently Added" data immediately
    this.getData();

    // Periodically refresh "Recently Added" data
    setInterval(() => {
      if (!this.nowPlaying) {
        console.log("[MMM-Jellyfin] Fetching recently added...");
        this.getData();
      }
    }, this.config.updateInterval);

    // Rotate through "Recently Added" items
    setInterval(() => {
      if (!this.offline && !this.nowPlaying && this.items.length > 1) {
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        console.log(
          `[MMM-Jellyfin] Rotating to recently added index: ${this.currentIndex}`
        );
        this.updateDom();
      }
    }, this.config.rotateInterval);

    // Check for "Now Playing" updates
    setInterval(() => {
      if (!this.offline) {
        console.log("[MMM-Jellyfin] Checking now playing...");
        this.checkNowPlaying();
      }
    }, this.config.nowPlayingCheckInterval);

    // Retry fetching data if offline
    setInterval(() => {
      if (this.offline) {
        console.log("[MMM-Jellyfin] Retrying connection to Jellyfin...");
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
          console.log("[MMM-Jellyfin] Now playing detected:", payload.data);
          this.nowPlaying = payload.data; // Update with full details
          this.items = []; // Clear "Recently Added" while "Now Playing" is active
          this.updateHeader(`${this.config.title}: Now Playing`);
        } else {
          // If no "Now Playing" data, switch back to "Recently Added"
          console.log("[MMM-Jellyfin] No now playing data, reverting to recently added.");
          this.nowPlaying = null;
          this.updateHeader(`${this.config.title}: Now Showing`);
        }
      } else if (payload.type === "recentlyAdded") {
        console.log("[MMM-Jellyfin] Recently added data received:", payload.data);
        this.nowPlaying = null;
        this.items = payload.data || [];
        this.currentIndex = 0; // Reset index when new data arrives
        this.updateHeader(`${this.config.title}: Now Showing`);
      }
      this.updateDom();
    } else if (notification === "JELLYFIN_OFFLINE") {
      console.log("[MMM-Jellyfin] Jellyfin is offline.");
      this.offline = true;
      this.updateHeader(`${this.config.title}: Jellyfin is offline`);
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

    if (this.offline) {
      wrapper.innerHTML = "Jellyfin is offline...";
      return wrapper;
    }

    const item = this.nowPlaying || this.items[this.currentIndex];
    if (!item) {
      wrapper.innerHTML = "Loading Jellyfin data...";
      return wrapper;
    }

    const container = document.createElement("div");
    container.style.display = "flex";

    const poster = document.createElement("img");
    poster.src = item.poster || ""; // Ensure poster URL is valid
    poster.style.width = "120px";
    poster.style.height = "200px";
    poster.style.objectFit = "cover";
    poster.style.marginRight = "10px";

    const details = document.createElement("div");
    details.style.display = "flex";
    details.style.flexDirection = "column";

    const title = document.createElement("h2");
    title.textContent = item.title || "Untitled"; // Ensure title is valid
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
        ) / 10000000; // Convert ticks to seconds
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

    container.appendChild(poster);
    container.appendChild(details);
    wrapper.appendChild(container);

    return wrapper;
  },
});
