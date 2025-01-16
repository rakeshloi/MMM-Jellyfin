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

    if (this.offline) {
      return wrapper;
    }

    const item = this.nowPlaying || this.items[this.currentIndex];
    if (!item) {
      wrapper.innerHTML = "";
      return wrapper;
    }

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.alignItems = "center";

    const posterWrapper = document.createElement("div");
    posterWrapper.style.marginRight = "10px";

    const poster = document.createElement("img");
    poster.src = item.poster || "";
    poster.style.width = "120px";
    poster.style.height = "200px";
    poster.style.objectFit = "cover";

    posterWrapper.appendChild(poster);

    const details = document.createElement("div");
    details.style.display = "flex";
    details.style.flexDirection = "column";

    const title = document.createElement("h2");
    title.textContent = item.title || "Untitled";
    details.appendChild(title);

    if (item.officialRatingImage) {
      const ratingImage = document.createElement("img");
      ratingImage.src = item.officialRatingImage;
      ratingImage.style.width = "30px";
      ratingImage.style.height = "auto";
      ratingImage.style.marginTop = "5px";
      details.appendChild(ratingImage);
    }

    if (item.overview) {
      const overview = document.createElement("p");
      overview.textContent = item.overview;
      overview.style.fontSize = "0.75em";
      overview.style.lineHeight = "1.2em";
      overview.style.margin = "5px 0";
      details.appendChild(overview);
    }

    container.appendChild(posterWrapper);
    container.appendChild(details);
    wrapper.appendChild(container);

    return wrapper;
  },
});
