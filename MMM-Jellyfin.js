Module.register("MMM-Jellyfin", {
  defaults: {
    apiKey: "",
    serverUrl: "",
    userId: "",
    parentId: "",
    contentType: "Movie",  // Now configurable through the config
    maxItems: 15,
    updateInterval: 1 * 60 * 1000,
    rotateInterval: 30 * 1000,
    nowPlayingCheckInterval: 15 * 1000,
    retryInterval: 5 * 60 * 1000,
    title: "Jellyfin",
  },

  notificationReceived(notification, payload) {
    if (notification === "MODULE_RESUMED") {
      console.log("MMM-Jellyfin is resumed.");

      // If resuming the module, you might want to:
      // - Avoid unnecessary data re-fetching
      // - Prevent resetting ongoing animations
      // - Trigger any required actions (like updating the DOM)

      // For example, avoid re-fetching data if it's already up-to-date
      if (!this.shouldUpdate) {
        console.log("No update needed on resume.");
        return; // Skip unnecessary actions when the module is resumed
      }

      // Add your custom logic for resuming the module, like refreshing content if needed
      this.getData(); // Re-fetch data if necessary (e.g., after a long break)
    }

    // Other notifications like MODULE_PAUSED, etc. can be handled similarly
    if (notification === "MODULE_PAUSED") {
      console.log("MMM-Jellyfin is paused.");
      // Handle module pause state (e.g., stop animations, pause data fetching)
    }
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
    this.lastPositionTicks = 0;
    this.shouldUpdate = false; // Add this flag

    this.getData();

    setInterval(() => {
      if (!this.nowPlaying) this.getData();
    }, this.config.updateInterval);

    setInterval(() => {
      if (!this.offline && !this.nowPlaying && this.items.length > 1) {
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        this.shouldUpdate = true;  // Only update when necessary
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

    // API call to check the latest activity log entry for playback stopped
    const activityLogUrl = `${this.config.serverUrl}/System/ActivityLog/Entries`;

    fetch(`${activityLogUrl}?api_key=${this.config.apiKey}&limit=1`)
      .then(response => response.json())
      .then(activityData => {
        if (activityData.Items && activityData.Items.length > 0) {
          const latestEntry = activityData.Items[0];

          // Check if the latest entry indicates playback has stopped
          if (latestEntry.Type === "AudioPlaybackStopped" || latestEntry.Type === "VideoPlaybackStopped") {
            console.log("[MMM-Jellyfin] Playback stopped.");

            // Clear nowPlaying to stop showing the currently playing content
            this.nowPlaying = null;

            // Set flag to false, indicating no media is playing
            this.isPlaying = false;

            // Switch to Recently Added state by fetching data
            this.getData(); // Trigger fetching of Recently Added content
          }
        }
      })
      .catch(error => {
        console.error("[MMM-Jellyfin] Error fetching activity log:", error);
      });
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "JELLYFIN_DATA") {
      this.offline = false;
      //this.show(1000, { lockString: "jellyfin-offline" }, () => { });

      // Check if nowPlaying data has changed
      if (payload.type === "nowPlaying") {
        if (payload.data) {
          // Only update the header if it changes from recently added to now playing
          if (this.nowPlaying !== payload.data) {
            this.nowPlaying = payload.data;
            this.items = [];  // Clear items when switching to now playing
            this.updateHeader(`${this.config.title}: Now Playing`);
          }
        } else {
          this.nowPlaying = null;
          this.updateHeader(""); // Clear the header if no Now Playing data
        }
      }
      // Handle Recently Added
      else if (payload.type === "recentlyAdded") {
        // Only update header if Recently Added data changes
        if (JSON.stringify(this.items) !== JSON.stringify(payload.data)) {
          this.items = payload.data || [];
          this.currentIndex = 0;
          this.nowPlaying = null;
          this.updateHeader(""); // Clear the header for recently added
        }
      }

      // Only update the DOM if there's a meaningful change
      this.updateDom();  // Only update content if necessary
    } else if (notification === "JELLYFIN_OFFLINE") {
      this.offline = true;
      this.updateHeader("");  // Ensure the header is cleared when offline
      this.hide(1000, { lockString: "jellyfin-offline" });  // Hide the entire module completely
    }
  },

  updateHeader(text) {
    this.data.header = text;  // Set the header to the appropriate text (or empty if offline)
    this.updateDom();
  },

  renderContent(data, mediaType, item) {
    const container = document.createElement("div");
    container.className = "jellyfin-container";

    // Apply relative position to the container to allow absolute positioning of child elements
    container.style.position = "relative";
    container.style.paddingBottom = "100px";  // Adjust this value to give enough space for the progress bar and remaining time

    const details = document.createElement("div");
    details.className = "jellyfin-details";

    // For Video, use Name, for Audio use Name
    const title = document.createElement("div");
    title.className = "jellyfin-title";
    title.textContent = mediaType === "Video" ? (data.Name || "Untitled") : (data.Name || "Untitled");
    details.appendChild(title);

    // For Audio, display Album and AlbumArtist
    if (mediaType === "Audio" && data.Album) {
      const album = document.createElement("div");
      album.className = "jellyfin-album";
      album.textContent = `Album: ${data.Album || "Unknown"}`;
      details.appendChild(album);

      const artist = document.createElement("div");
      artist.className = "jellyfin-artist";
      artist.textContent = `Artist: ${data.AlbumArtist || "Unknown"}`;
      details.appendChild(artist);
    } else if (data.PremiereDate) {
      const date = document.createElement("div");
      date.className = "jellyfin-premiere-date";
      const formattedDate = new Date(data.PremiereDate).toLocaleDateString();
      date.textContent = `Premiere: ${formattedDate}`;
      details.appendChild(date);
    }

    if (data.OfficialRating || data.RunTimeTicks) {
      const certRuntimeContainer = document.createElement("div");
      certRuntimeContainer.className = "jellyfin-cert-runtime";

      if (data.OfficialRating) {
        const certificateImg = document.createElement("img");
        certificateImg.className = "jellyfin-certificate";
        certificateImg.src = `modules/MMM-Jellyfin/certificates/${data.OfficialRating}.png`;
        certificateImg.alt = data.OfficialRating;
        certRuntimeContainer.appendChild(certificateImg);
      }

      if (data.RunTimeTicks) {
        const runtime = document.createElement("div");
        runtime.className = "jellyfin-runtime";

        // Format runtime differently for Video and Audio
        if (mediaType === "Audio") {
          const runtimeSeconds = Math.floor(data.RunTimeTicks / 10000000); // Convert ticks to seconds for audio
          const runtimeMinutes = Math.floor(runtimeSeconds / 60);
          const runtimeRemainingSeconds = runtimeSeconds % 60;
          runtime.textContent = `${runtimeMinutes} min ${runtimeRemainingSeconds} sec`;
        } else {
          const runtimeMinutes = Math.floor(data.RunTimeTicks / 600000000); // Convert ticks to minutes for video
          runtime.textContent = `${runtimeMinutes} min`;
        }

        certRuntimeContainer.appendChild(runtime);
      }

      details.appendChild(certRuntimeContainer);
    }

    if (data.Overview) {
      const overview = document.createElement("div");
      overview.className = "jellyfin-overview";

      const overviewText = document.createElement("p");
      overviewText.className = "jellyfin-overview-text"; // Ensure this class is added for scrolling
      overviewText.textContent = data.Overview || "No description available.";

      const overviewScrollContainer = document.createElement("div");
      overviewScrollContainer.className = "jellyfin-overview-scroll";

      overviewScrollContainer.appendChild(overviewText);
      overview.appendChild(overviewScrollContainer);

      details.appendChild(overview);
    }

    // Add progress bar and remaining time logic
    if (this.nowPlaying && mediaType !== "Music") {
      const progressBarContainer = document.createElement("div");
      progressBarContainer.className = "jellyfin-progress-bar-container";

      const progressBar = document.createElement("div");
      progressBar.className = "jellyfin-progress-bar";
      const progressPercentage = (item.positionTicks / item.runTimeTicks) * 100;
      progressBar.style.width = `${progressPercentage}%`;

      const isPaused = item.isPaused;
      if (isPaused) {
        progressBar.style.backgroundColor = "red"; // Red when paused
      } else {
        progressBar.style.backgroundColor = "#4caf50"; // Green when playing
      }

      progressBarContainer.appendChild(progressBar);

      // Position progress bar at the bottom of the module
      progressBarContainer.style.position = "absolute";
      progressBarContainer.style.bottom = "40px"; // Adjust this value if needed to make space

      details.appendChild(progressBarContainer);

      // Remaining Time
      const remainingTime = document.createElement("div");
      remainingTime.className = "jellyfin-remaining-time";
      const remainingTicks = item.runTimeTicks - item.positionTicks;

      // Format remaining time differently for Video and Audio
      if (mediaType === "Audio") {
        const remainingSeconds = Math.floor(remainingTicks / 10000000); // Convert ticks to seconds for audio
        const remainingMinutes = Math.floor(remainingSeconds / 60);
        const remainingRemainingSeconds = remainingSeconds % 60;
        remainingTime.textContent = `Remaining: ${remainingMinutes} min ${remainingRemainingSeconds} sec`;
      } else {
        const remainingMinutes = Math.floor(remainingTicks / 600000000); // Convert ticks to minutes for video
        remainingTime.textContent = `Remaining: ${remainingMinutes} min`;
      }

      remainingTime.style.position = "absolute";
      remainingTime.style.bottom = "10px"; // Adjust this value if needed to make space

      details.appendChild(remainingTime);

      if (!isPaused) {
        this.lastPositionTicks = item.positionTicks;
      }
    }

    // Use poster from item for both Audio and Video
    let posterUrl = item.poster || "";
    const poster = document.createElement("img");
    poster.className = "jellyfin-poster";
    poster.src = posterUrl || "modules/MMM-Jellyfin/placeholder.png";  // Default placeholder image

    if (mediaType === "Audio") {
      // If audio, fetch the album poster using AlbumId
      const albumId = data.AlbumId;
      if (albumId) {
        const albumUrl = `http://192.168.1.96:8096/Items/${albumId}?userId=${this.config.userId}&api_key=${this.config.apiKey}&limit=1`;
        fetch(albumUrl)
          .then(response => response.json())
          .then(albumData => {
            if (albumData && albumData.ImageTags && albumData.ImageTags.Primary) {
              poster.src = `http://192.168.1.96:8096/Items/${albumId}/Images/Primary?api_key=${this.config.apiKey}`;
            }
          })
          .catch(error => console.error("Error fetching album poster:", error));
      }

      poster.style.width = "200px";
      poster.style.height = "200px";
    }

    // If no poster is available for Audio, use a placeholder image
    if (!poster.src || poster.src === "modules/MMM-Jellyfin/placeholder.png") {
      poster.src = "modules/MMM-Jellyfin/placeholder.png";  // Replace with actual placeholder path
    }

    container.appendChild(details);
    container.appendChild(poster);

    return container;
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "jellyfin-wrapper";

    if (this.offline) {
      wrapper.innerHTML = "";  // Clear the content if offline
      return wrapper;
    }

    // If nowPlaying has valid data, show it
    const item = this.nowPlaying || this.items[this.currentIndex];

    if (!item) {
      wrapper.innerHTML = "";  // If there is no item to display, clear content
      return wrapper;
    }

    const itemId = item.id;
    const url = `${this.config.serverUrl}/Items/${itemId}?userId=${this.config.userId}&api_key=${this.config.apiKey}`;

    fetch(url)
      .then(response => response.json())
      .then(data => {
        const mediaType = data.MediaSources[0].MediaStreams[0].Type;
        const content = this.renderContent(data, mediaType, item);
        wrapper.appendChild(content);
      })
      .catch(error => {
        console.error("[MMM-Jellyfin] Error fetching item details:", error);
        const errorMessage = document.createElement("div");
        errorMessage.textContent = `Error: ${error.message}`;
        wrapper.appendChild(errorMessage);
      });

    return wrapper;
  },
});
