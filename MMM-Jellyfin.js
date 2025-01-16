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
      // Jellyfin is online, reset state
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
      // Jellyfin is offline, hide the module
      console.log("[MMM-Jellyfin] Jellyfin is offline.");
      this.offline = true;
      this.hide(1000, { lockString: "jellyfin-offline" });
    }
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "jellyfin-wrapper";

    if (this.offline) {
      wrapper.innerHTML = "Jellyfin is offline...";
      return wrapper;
    }

    if (this.nowPlaying) {
      const container = document.createElement("div");
      container.style.display = "flex";

      const poster = document.createElement("img");
      poster.src = this.nowPlaying.poster;
      poster.style.width = "150px";
      poster.style.height = "auto";
      poster.style.objectFit = "cover";
      poster.style.marginRight = "10px";

      const details = document.createElement("div");
      details.style.display = "flex";
      details.style.flexDirection = "column";

      const title = document.createElement("h2");
      title.textContent = this.nowPlaying.title;
      details.appendChild(title);

      const progressPct =
        (this.nowPlaying.positionTicks / this.nowPlaying.runTimeTicks) * 100 || 0;

      const progressBar = document.createElement("div");
      progressBar.style.height = "10px";
      progressBar.style.background = "#444";
      progressBar.style.width = "200px";

      const progressFill = document.createElement("div");
      progressFill.style.width = `${progressPct}%`;
      progressFill.style.height = "10px";
      progressFill.style.background = this.nowPlaying.isPaused ? "#f00" : "#0f0";
      progressBar.appendChild(progressFill);

      details.appendChild(progressBar);
      container.appendChild(poster);
      container.appendChild(details);
      wrapper.appendChild(container);

      return wrapper;
    }

    if (!this.items.length) {
      wrapper.innerHTML = "Loading Jellyfin data...";
      return wrapper;
    }

    const item = this.items[this.currentIndex];
    const container = document.createElement("div");
    container.style.display = "flex";

    const poster = document.createElement("img");
    poster.src = item.poster;
    poster.style.width = "150px";
    poster.style.height = "auto";
    poster.style.objectFit = "cover";
    poster.style.marginRight = "10px";

    const details = document.createElement("div");
    details.style.display = "flex";
    details.style.flexDirection = "column";

    const title = document.createElement("h2");
    title.textContent = item.title;
    details.appendChild(title);

    if (item.officialRating) {
      const rating = document.createElement("div");
      rating.textContent = `Rating: ${item.officialRating}`;
      details.appendChild(rating);
    }

    if (item.premiereDate) {
      const date = document.createElement("div");
      date.textContent = `Premiere: ${new Date(item.premiereDate).toLocaleDateString()}`;
      details.appendChild(date);
    }

    if (item.overview) {
      const overview = document.createElement("p");
      overview.textContent = item.overview;
      details.appendChild(overview);
    }

    container.appendChild(poster);
    container.appendChild(details);
    wrapper.appendChild(container);

    return wrapper;
  },
});
