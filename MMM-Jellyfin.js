/* MMM-Jellyfin.js */
Module.register("MMM-Jellyfin", {
  defaults: {
    apiKey: "",
    serverUrl: "",
    userId: "",
    parentId: "",
    contentType: "Movie", // Default to Movies if not specified
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

    if (!this.config.contentType) {
      this.config.contentType = "Movie";
      console.log("[MMM-Jellyfin] No content type specified. Defaulting to Movies.");
    }

    this.getRecentlyAdded();
    setInterval(() => this.getNowPlaying(), this.config.nowPlayingCheckInterval);
  },

  getRecentlyAdded() {
    const url = `${this.config.serverUrl}/Users/${this.config.userId}/Items/Latest`;

    const params = new URLSearchParams({
      IncludeItemTypes: this.config.contentType,
      Limit: this.config.maxItems,
      Fields: "Overview,MediaSourceCount,RunTimeTicks,VideoQuality,CommunityRating",
      ParentId: this.config.parentId || "",
      api_key: this.config.apiKey,
    });

    fetch(`${url}?${params}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch recently added items.");
        }
        return response.json();
      })
      .then((data) => {
        console.log("[MMM-Jellyfin] Recently added items fetched:", data);
        this.items = data;
        this.updateContentOnly();
      })
      .catch((error) => {
        console.error("[MMM-Jellyfin] Error fetching recently added items:", error);
        this.offline = true;
        this.updateContentOnly();
      });
  },

  initializeOverviewScrolling() {
    const styleElement = document.createElement("style");
    styleElement.innerHTML = `
      .jellyfin-item-overview {
        position: relative;
        animation: jellyfin-overview-scroll 10s linear infinite;
      }
      @keyframes jellyfin-overview-scroll {
        0% {
          transform: translateY(0);
        }
        100% {
          transform: translateY(-100%);
        }
      }
    `;
    document.head.appendChild(styleElement);
  },

  initializeSpecialScrolling() {
    const styleElement = document.createElement("style");
    styleElement.innerHTML = `
      .star-wars-scroll {
        font-family: 'Courier New', monospace;
        font-size: 18px;
        color: yellow;
        animation: star-wars-animation 15s linear infinite;
      }
      @keyframes star-wars-animation {
        0% {
          transform: perspective(500px) rotateX(20deg) translateY(100%);
        }
        100% {
          transform: perspective(500px) rotateX(20deg) translateY(-200%);
        }
      }

      .matrix-scroll {
        font-family: 'Courier New', monospace;
        font-size: 18px;
        color: #00ff00;
        animation: matrix-animation 3s linear infinite;
      }
      @keyframes matrix-animation {
        0% {
          transform: translateY(0);
        }
        100% {
          transform: translateY(-100%);
        }
      }

      .jellyfin-now-playing-title {
        display: inline-block;
        animation: jellyfin-title-scroll 10s linear 1;
      }
      @keyframes jellyfin-title-scroll {
        0% {
          transform: translateX(100%);
        }
        100% {
          transform: translateX(-100%);
        }
      }

      .jellyfin-now-playing-tracks {
        overflow: hidden;
        position: relative;
        height: 80px;
        animation: jellyfin-tracks-scroll 10s linear infinite;
      }
      @keyframes jellyfin-tracks-scroll {
        0% {
          transform: translateY(0);
        }
        100% {
          transform: translateY(-100%);
        }
      }
    `;
    document.head.appendChild(styleElement);
  },

  startOverviewScroll() {
    const overviews = document.querySelectorAll(".jellyfin-item-overview");
    overviews.forEach((overview) => {
      overview.style.animationPlayState = "running";
    });
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "jellyfin-wrapper";
    wrapper.innerHTML = "<div class='jellyfin-content'></div>";
    return wrapper;
  },

  updateContentOnly() {
    const contentWrapper = document.querySelector(".jellyfin-content");
    if (!contentWrapper) return;

    if (this.nowPlaying) {
      contentWrapper.innerHTML = this.renderNowPlaying();
    } else if (this.items.length === 0) {
      contentWrapper.innerHTML = "<div class='jellyfin-message'>Loading content...</div>";
    } else {
      contentWrapper.innerHTML = this.renderRecentlyAdded();
    }
  },

  renderRecentlyAdded() {
    const wrapper = document.createElement("div");
    wrapper.className = "jellyfin-carousel";

    this.items.forEach((item, index) => {
      const itemWrapper = document.createElement("div");
      itemWrapper.className = "jellyfin-carousel-item";
      itemWrapper.style.display = index === 0 ? "block" : "none"; // Show the first item initially

      const poster = item.ImageTags && item.ImageTags.Primary
        ? `${this.config.serverUrl}/Items/${item.Id}/Images/Primary?api_key=${this.config.apiKey}`
        : "modules/MMM-Jellyfin/placeholder.png";

      const imdbRating = item.CommunityRating ? `IMDB: ${item.CommunityRating}/10` : "No Rating";

      itemWrapper.innerHTML = `
      <img class="jellyfin-poster" src="${poster}" style="width: 200px; height: auto; object-fit: cover; margin-bottom: 10px;">
      <div class="jellyfin-item-title">${item.Name || "Untitled"}</div>
      <div class="jellyfin-item-rating">${imdbRating}</div>
      <div class="jellyfin-item-overview" style="overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical;">
        ${item.Overview || "No description available."}
      </div>
    `;

      wrapper.appendChild(itemWrapper);
    });

    this.startCarousel(wrapper);

    return wrapper;
  },

  renderNowPlaying() {
    this.initializeTrackScrolling();
    this.initializeSpecialScrolling();
    const progress = (this.nowPlaying.position / this.nowPlaying.runtime) * 100 || 0;
    const state = this.nowPlaying.isPaused ? "Paused" : "Playing";
    const isMusic = this.nowPlaying.mediaType === "Audio";

    const posterStyle = isMusic
      ? "width: 200px; height: 200px; object-fit: cover; margin-left: 10px;"
      : "height: 200px; object-fit: cover; margin-left: 10px;";

    const imdbRating = this.nowPlaying.imdbRating ? `IMDB: ${this.nowPlaying.imdbRating}/10` : null;
    const audioQuality = this.nowPlaying.audioQuality || null;

    let infoContent = "";

    if (isMusic) {
      infoContent = `
        <div class='jellyfin-now-playing-title'>Title: ${this.nowPlaying
          .title}</div>
        <div class='jellyfin-now-playing-album'>Album: ${this.nowPlaying.album || "Unknown Album"}</div>
        <div class='jellyfin-now-playing-artist'>Artist: ${this.nowPlaying.artist || "Unknown Artist"}</div>
      `;
    } else {
      infoContent = `
        <div class='jellyfin-now-playing-title ${this.nowPlaying.title.toLowerCase().includes("star wars") ? "star-wars-scroll" : this.nowPlaying.title.toLowerCase().includes("matrix") ? "matrix-scroll" : ""}'>Now Playing: ${this.nowPlaying.title}</div>
        ${imdbRating ? `<div class='jellyfin-now-playing-rating'>${imdbRating}</div>` : ""}
        <div class='jellyfin-now-playing-quality'>Quality: ${this.nowPlaying.videoQuality || "Unknown Quality"}</div>
        ${["DTS:X", "Dolby Atmos"].includes(audioQuality) ? `<div class='jellyfin-now-playing-audio'>Audio: ${audioQuality}</div>` : ""}
        <div class='jellyfin-now-playing-state'>State: ${state}</div>
        <div class='jellyfin-now-playing-remaining'>Remaining Time: ${this.nowPlaying.runtime - this.nowPlaying.position} min</div>
      `;
    }

    return `
      <div class='jellyfin-now-playing' style='display: flex; flex-direction: column; align-items: flex-start;'>
        <div style='display: flex; justify-content: flex-end; width: 100%;'>
          <img class='jellyfin-poster' src='${this.nowPlaying.image}' style='${posterStyle}'>
          <div style='flex-grow: 1; margin-right: 10px;'>${infoContent}</div>
        </div>
        <div class='jellyfin-progress-bar' style='width: 100%; margin-top: 10px;'>
          <div class='jellyfin-progress-bar-inner' style='width: ${progress}%; height: 10px; background-color: #4caf50;'></div>
        </div>
      </div>
    `;
  },

  startCarousel(wrapper) {
    let currentIndex = 0;
    const items = wrapper.querySelectorAll(".jellyfin-carousel-item");

    setInterval(() => {
      items[currentIndex].style.display = "none"; // Hide current item
      currentIndex = (currentIndex + 1) % items.length; // Move to the next item
      items[currentIndex].style.display = "block"; // Show the next item
    }, this.config.rotateInterval || 5000); // Rotate every 5 seconds
  },

  getNowPlaying() {
    const url = `${this.config.serverUrl}/Sessions`;

    const params = new URLSearchParams({
      api_key: this.config.apiKey,
    });

    fetch(`${url}?${params}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch now playing content.");
        }
        return response.json();
      })
      .then((data) => {
        console.log("[MMM-Jellyfin] Now playing data fetched:", data);
        const nowPlayingSession = data.find(
          (session) => session.NowPlayingItem && session.UserId === this.config.userId
        );

        if (nowPlayingSession) {
          const item = nowPlayingSession.NowPlayingItem;
          this.nowPlaying = {
            title: item.Name || "Untitled",
            mediaType: item.Type || "Unknown",
            runtime: Math.floor(item.RunTimeTicks / 600000000) || 0, // Convert ticks to minutes
            position: Math.floor(
              nowPlayingSession.PlayState.PositionTicks / 600000000
            ) || 0,
            isPaused: nowPlayingSession.PlayState.IsPaused || false,
            image: item.ImageTags.Primary
              ? `${this.config.serverUrl}/Items/${item.Id}/Images/Primary?api_key=${this.config.apiKey}`
              : "modules/MMM-Jellyfin/placeholder.png",
            videoQuality: item.VideoQuality || "Unknown Quality",
            audioQuality: nowPlayingSession.PlayState.AudioCodec || null,
            imdbRating: item.CommunityRating || null,
          };
        } else {
          this.nowPlaying = null;
        }

        this.updateContentOnly();
      })
      .catch((error) => {
        console.error("[MMM-Jellyfin] Error fetching now playing data:", error);
      });
  },

  renderNowPlaying() {
    this.initializeSpecialScrolling();
    const progress = (this.nowPlaying.position / this.nowPlaying.runtime) * 100 || 0;
    const state = this.nowPlaying.isPaused ? "Paused" : "Playing";
    const isMusic = this.nowPlaying.mediaType === "Audio";

    const posterStyle = isMusic
      ? "width: 200px; height: 200px; object-fit: cover; margin-left: 10px;"
      : "height: 200px; object-fit: cover; margin-left: 10px;";

    const imdbRating = this.nowPlaying.imdbRating ? `IMDB: ${this.nowPlaying.imdbRating}/10` : null;
    const audioQuality = this.nowPlaying.audioQuality || null;

    let infoContent = "";

    if (isMusic) {
      infoContent = `
        <div class='jellyfin-now-playing-title'>Title: ${this.nowPlaying.title}</div>
        <div class='jellyfin-now-playing-album'>Album: ${this.nowPlaying.album || "Unknown Album"}</div>
        <div class='jellyfin-now-playing-artist'>Artist: ${this.nowPlaying.artist || "Unknown Artist"}</div>
      `;
    } else {
      infoContent = `
        <div class='jellyfin-now-playing-title'>Now Playing: ${this.nowPlaying.title}</div>
        ${imdbRating ? `<div class='jellyfin-now-playing-rating'>${imdbRating}</div>` : ""}
        <div class='jellyfin-now-playing-quality'>Quality: ${this.nowPlaying.videoQuality || "Unknown Quality"}</div>
        ${["DTS:X", "Dolby Atmos"].includes(audioQuality) ? `<div class='jellyfin-now-playing-audio'>Audio: ${audioQuality}</div>` : ""}
        <div class='jellyfin-now-playing-state'>State: ${state}</div>
        <div class='jellyfin-now-playing-remaining'>Remaining Time: ${this.nowPlaying.runtime - this.nowPlaying.position} min</div>
      `;
    }

    return `
      <div class='jellyfin-now-playing' style='display: flex; flex-direction: column; align-items: flex-start;'>
        <div style='display: flex; justify-content: flex-end; width: 100%;'>
          <img class='jellyfin-poster' src='${this.nowPlaying.image}' style='${posterStyle}'>
          <div style='flex-grow: 1; margin-right: 10px;'>${infoContent}</div>
        </div>
        <div class='jellyfin-progress-bar' style='width: 100%; margin-top: 10px;'>
          <div class='jellyfin-progress-bar-inner' style='width: ${progress}%; height: 10px; background-color: #4caf50;'></div>
        </div>
      </div>
    `;
  },
  initializeSpecialScrolling() {
    const styleElement = document.createElement("style");
    styleElement.innerHTML = `
      .star-wars-scroll {
        font-family: 'Courier New', monospace;
        font-size: 18px;
        color: yellow;
        animation: star-wars-animation 15s linear infinite;
      }
      @keyframes star-wars-animation {
        0% {
          transform: perspective(500px) rotateX(20deg) translateY(100%);
        }
        100% {
          transform: perspective(500px) rotateX(20deg) translateY(-200%);
        }
      }

      .matrix-scroll {
        font-family: 'Courier New', monospace;
        font-size: 18px;
        color: #00ff00;
        animation: matrix-animation 3s linear infinite;
      }
      @keyframes matrix-animation {
        0% {
          transform: translateY(0);
        }
        100% {
          transform: translateY(-100%);
        }
      }

      .jellyfin-now-playing-title {
        display: inline-block;
        animation: jellyfin-title-scroll 10s linear 1;
      }
      @keyframes jellyfin-title-scroll {
        0% {
          transform: translateX(100%);
        }
        100% {
          transform: translateX(-100%);
        }
      }

      .jellyfin-now-playing-tracks {
        overflow: hidden;
        position: relative;
        height: 80px;
        animation: jellyfin-tracks-scroll 10s linear infinite;
      }
      @keyframes jellyfin-tracks-scroll {
        0% {
          transform: translateY(0);
        }
        100% {
          transform: translateY(-100%);
        }
      }
    `;
    document.head.appendChild(styleElement);
  },

  startOverviewScroll() {
    const overviews = document.querySelectorAll(".jellyfin-item-overview");
    overviews.forEach((overview) => {
      overview.style.animationPlayState = "running";
    });
  },
  initializeOverviewScrolling() {
    const styleElement = document.createElement("style");
    styleElement.innerHTML = `
      .jellyfin-item-overview {
        position: relative;
        animation: jellyfin-overview-scroll 10s linear infinite;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
      }
      @keyframes jellyfin-overview-scroll {
        0% {
          transform: translateY(0);
        }
        100% {
          transform: translateY(-100%);
        }
      }
    `;
    document.head.appendChild(styleElement);
  },

  updateContentOnly() {
    const contentWrapper = document.querySelector(".jellyfin-content");
    if (!contentWrapper) return;

    if (this.nowPlaying) {
      contentWrapper.innerHTML = this.renderNowPlaying();
    } else if (this.items.length === 0) {
      contentWrapper.innerHTML = "<div class='jellyfin-message'>Loading content...</div>";
    } else {
      contentWrapper.innerHTML = this.renderRecentlyAdded();
    }
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "jellyfin-wrapper";
    wrapper.innerHTML = "<div class='jellyfin-content'></div>";
    return wrapper;
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "NOW_PLAYING") {
      this.nowPlaying = payload;
      this.updateContentOnly();
    } else if (notification === "RECENTLY_ADDED") {
      this.items = payload;
      this.updateContentOnly();
    }
  }
});


