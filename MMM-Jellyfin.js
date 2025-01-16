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
      } else if (payload.type === "recentlyAdded") {
        this.nowPlaying = null;
        this.items = payload.data || [];
        this.currentIndex = 0;
      }
      this.updateDom();
    } else if (notification === "JELLYFIN_OFFLINE") {
      this.offline = true;
      this.hide(1000, { lockString: "jellyfin-offline" });
    }
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "jellyfin-wrapper";

    // Add the standard MagicMirror module heading
    const heading = document.createElement("header");
    heading.className = "module-header"; // Use MagicMirror's default class for headers

    if (this.offline) {
      heading.textContent = `${this.config.title}: Jellyfin is offline`;
      wrapper.appendChild(heading);
      return wrapper;
    }

    // Dynamic title based on content
    heading.textContent = this.nowPlaying
      ? `${this.config.title}: Now Playing`
      : `${this.config.title}: Now Showing`;
    wrapper.appendChild(heading); // Add heading to the top of the module

    const item = this.nowPlaying || this.items[this.currentIndex];
    if (!item) {
      wrapper.innerHTML += "Loading Jellyfin data...";
      return wrapper;
    }

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.marginTop = "10px"; // Add space between heading and content

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
      const progressPct =
        (this.nowPlaying.positionTicks / this.nowPlaying.runTimeTicks) * 100 || 0;

      const timeRemaining =
        Math.max(
          0,
          this.nowPlaying.runTimeTicks - this.nowPlaying.positionTicks
        ) / 10000000; // Convert ticks to seconds

      const timeRemainingText = `${Math.floor(timeRemaining / 60)}m ${
        Math.floor(timeRemaining % 60)
      }s remaining`;

      const progressContainer = document.createElement("div");
      progressContainer.style.marginTop = "10px";

      const progressBar = document.createElement("div");
      progressBar.style.height = "10px";
      progressBar.style.background = "#444";
      progressBar.style.width = "200px";

      const progressFill = document.createElement("div");
      progressFill.style.width = `${progressPct}%`;
      progressFill.style.height = "10px";
      progressFill.style.background = this.nowPlaying.isPaused ? "#f00" : "#0f0";
      progressBar.appendChild(progressFill);

      const timeRemainingLabel = document.createElement("div");
      timeRemainingLabel.textContent = timeRemainingText;
      timeRemainingLabel.style.fontSize = "0.75em";
      timeRemainingLabel.style.color = "#ccc";
      timeRemainingLabel.style.marginTop = "5px";

      progressContainer.appendChild(progressBar);
      progressContainer.appendChild(timeRemainingLabel);
      details.appendChild(progressContainer);
    }

    container.appendChild(poster);
    container.appendChild(details);
    wrapper.appendChild(container);

    return wrapper;
  },
});
