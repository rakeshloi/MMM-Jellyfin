Module.register("MMM-Jellyfin", {
  defaults: {
    apiKey: "your_api_key",
    serverUrl: "http://192.168.1.96:8096",
    userId: "your_user_id",
    parentId: "09c0916698d5c5390772900c4b80c3ce", // e.g., 4K library
    contentType: "Movie",
    maxItems: 5,                  // Number of items to fetch
    updateInterval: 10 * 60 * 1000, // Fetch new data every 10 mins
    rotateInterval: 30 * 1000,    // Switch to next movie every 30s
  },

  start() {
    this.items = [];
    this.currentIndex = 0;

    // Initial data load
    this.getData();

    // Refresh data every updateInterval
    setInterval(() => {
      this.getData();
    }, this.config.updateInterval);

    // Cycle through items every rotateInterval
    setInterval(() => {
      if (this.items.length > 1) {
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        this.updateDom();
      }
    }, this.config.rotateInterval);
  },

  getData() {
    // Ask node_helper to fetch from Jellyfin
    this.sendSocketNotification("FETCH_JELLYFIN_DATA", this.config);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "JELLYFIN_DATA") {
      this.items = payload || [];
      this.currentIndex = 0; // Reset index on new data
      this.updateDom();
    }
  },

  getDom() {
    const wrapper = document.createElement("div");

    // If no items, display a simple loading message
    if (!this.items.length) {
      wrapper.innerHTML = "Loading 4K movies...";
      return wrapper;
    }

    // Grab the current item
    const item = this.items[this.currentIndex];

    // Outer container
    const container = document.createElement("div");
    container.className = "jellyfin-single-movie";

    // Poster image on the left
    const poster = document.createElement("img");
    poster.src = item.thumb;
    poster.className = "jellyfin-thumb";
    container.appendChild(poster);

    // Details container on the right
    const details = document.createElement("div");
    details.className = "jellyfin-details";

    // Movie title
    const title = document.createElement("h2");
    title.className = "jellyfin-title";
    title.textContent = item.title;
    details.appendChild(title);

    // Certificate (OfficialRating)
    if (item.officialRating) {
      const rating = document.createElement("div");
      rating.className = "jellyfin-rating";
      rating.textContent = `Certificate: ${item.officialRating}`;
      details.appendChild(rating);
    }

    // Premiere Date
    if (item.premiereDate) {
      const date = new Date(item.premiereDate).toLocaleDateString();
      const premiere = document.createElement("div");
      premiere.className = "jellyfin-premiere-date";
      premiere.textContent = `Premiere Date: ${date}`;
      details.appendChild(premiere);
    }

    // Overview
    if (item.overview) {
      const overview = document.createElement("p");
      overview.className = "jellyfin-overview";
      overview.textContent = item.overview;
      details.appendChild(overview);
    }

    // Add details to the container
    container.appendChild(details);

    // Add container to wrapper
    wrapper.appendChild(container);

    return wrapper;
  },
});
