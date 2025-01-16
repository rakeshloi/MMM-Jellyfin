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
    retryInterval: 5 * 60 * 1000, // Retry every 5 mins if Jellyfin is offline
    title: "Jellyfin", // Default base title for the module
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

    // Fetch data immediately
    this.getData();

    // Periodically refresh data
    setInterval(() => {
      this.getData();
    }, this.config.updateInterval);

    // Rotate through items if not offline and there are multiple items
    setInterval(() => {
      if (!this.offline && this.items.length > 1) {
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        this.updateDom();
      }
    }, this.config.rotateInterval);

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

  socketNotificationReceived(notification, payload) {
    if (notification === "JELLYFIN_DATA") {
      this.offline = false;
      this.show(1000, { lockString: "jellyfin-offline" });

      if (payload.type === "nowPlaying") {
        this.nowPlaying = payload.data;
        this.items = [];
        this.updateHeader(`${this.config.title}: Now Playing`);
      } else if (payload.type === "recentlyAdded") {
        this.nowPlaying = null;
        this.items = payload.data || [];
        this.currentIndex = 0;
        this.updateHeader(`${this.config.title}: Now Showing`);
      }
      this.updateDom();
    } else if (notification === "JELLYFIN_OFFLINE") {
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
    container.style.flexDirection = "row"; // Ensure poster and details are side by side

    const poster = document.createElement("img");
    poster.src = item.poster || ""; // Ensure poster URL is valid
    poster.style.width = "120px";
    poster.style.height = "200px";
    poster.style.objectFit = "cover";
    poster.style.marginRight = "10px";

    const details = document.createElement("div");
    details.style.display = "flex";
    details.style.flexDirection = "column";
    details.style.justifyContent = "space-between"; // Space out elements vertically

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
      progressBar.style.position = "relative";

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
