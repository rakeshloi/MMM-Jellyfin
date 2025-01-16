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
        this.fetchNowPlayingDetails(payload.data);
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

  async fetchNowPlayingDetails(nowPlayingData) {
    try {
      const response = await fetch(
        `${this.config.serverUrl}/Items/${nowPlayingData.id}`,
        {
          headers: { "X-Emby-Token": this.config.apiKey },
        }
      );
      const details = await response.json();
      this.nowPlaying = { ...nowPlayingData, ...details };
      this.updateDom();
    } catch (error) {
      console.error("Error fetching now playing details:", error);
    }
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "jellyfin-wrapper";

    // Add the dynamic heading
    const heading = document.createElement("h1");
    heading.style.fontSize = "1em";
    heading.style.margin = "0";
    heading.style.textAlign = "right";
    heading.style.borderBottom = "2px solid #fff"; // Add a line underneath
    heading.style.paddingBottom = "5px";

    if (this.offline) {
      wrapper.innerHTML = "Jellyfin is offline...";
      return wrapper;
    }

    if (this.nowPlaying) {
      heading.textContent = "Now Playing on Jellyfin";
    } else {
      heading.textContent = "Now Showing on Jellyfin";
    }
    wrapper.appendChild(heading);

    const item = this.nowPlaying || this.items[this.currentIndex];
    if (!item) {
      wrapper.innerHTML += "Loading Jellyfin data...";
      return wrapper;
    }

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column"; // Ensure vertical stacking
    container.style.marginTop = "10px"; // Add spacing below heading

    const contentContainer = document.createElement("div");
    contentContainer.style.display = "flex";

    const poster = document.createElement("img");
    poster.src = item.poster;
    poster.style.width = "120px";
    poster.style.height = "200px";
    poster.style.objectFit = "cover";
    poster.style.marginRight = "10px";

    const details = document.createElement("div");
    details.style.display = "flex";
    details.style.flexDirection = "column";

    const title = document.createElement("h2");
    title.textContent = item.title;
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
      date.textContent = `Premiere: ${new Date(item.premiereDate).toLocaleDateString()}`;
      date.style.fontSize = "0.8em";
      date.style.color = "#ccc";
      date.style.marginBottom = "4px";
      details.appendChild(date);
    }

    if (item.overview) {
      const overview = document.createElement("p");
      overview.textContent = item.overview;
      overview.style.fontSize = "0.75em";
      overview.style.lineHeight = "1.2em";
      details.appendChild(overview);
    }

    contentContainer.appendChild(poster);
    contentContainer.appendChild(details);
    container.appendChild(contentContainer);

    // Add progress bar for "Now Playing"
    if (this.nowPlaying) {
      const progressPct =
        (this.nowPlaying.positionTicks / this.nowPlaying.runTimeTicks) * 100 || 0;

      const progressBar = document.createElement("div");
      progressBar.style.marginTop = "10px";
      progressBar.style.height = "10px";
      progressBar.style.background = "#444";
      progressBar.style.width = "100%";
      progressBar.style.position = "relative";

      const progressFill = document.createElement("div");
      progressFill.style.width = `${progressPct}%`;
      progressFill.style.height = "10px";
      progressFill.style.background = this.nowPlaying.isPaused ? "#f00" : "#0f0";
      progressBar.appendChild(progressFill);

      container.appendChild(progressBar);
    }

    wrapper.appendChild(container);

    return wrapper;
  },
});
