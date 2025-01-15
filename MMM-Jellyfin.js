Module.register("MMM-Jellyfin", {
  defaults: {
    apiKey: "your_api_key",
    serverUrl: "http://192.168.1.96:8096",
    userId: "your_user_id",
    parentId: "09c0916698d5c5390772900c4b80c3ce",
    contentType: "Movie",
    maxItems: 5,
    updateInterval: 10 * 60 * 1000, // 10 mins
    rotateInterval: 30 * 1000,      // 30 secs
  },

  start() {
    this.items = [];
    this.currentIndex = 0;
    this.getData();

    // Refresh data from Jellyfin periodically
    setInterval(() => {
      this.getData();
    }, this.config.updateInterval);

    // Cycle through items
    setInterval(() => {
      if (this.items.length > 1) {
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        this.updateDom();
      }
    }, this.config.rotateInterval);
  },

  getData() {
    this.sendSocketNotification("FETCH_JELLYFIN_DATA", this.config);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "JELLYFIN_DATA") {
      this.items = payload || [];
      this.currentIndex = 0;
      this.updateDom();
    }
  },

  getDom() {
    // Outer wrapper with fixed size
    const wrapper = document.createElement("div");
    wrapper.className = "jellyfin-wrapper"; // 400×350 bounding box

    if (!this.items.length) {
      wrapper.innerHTML = "Loading 4K movies...";
      return wrapper;
    }

    // Grab the current item
    const item = this.items[this.currentIndex];

    // Container that holds poster + details
    const container = document.createElement("div");
    container.className = "jellyfin-container"; // flex container inside the 400×350 box

    // Poster (on the left)
    const poster = document.createElement("img");
    poster.src = item.thumb;
    poster.className = "jellyfin-thumb";
    container.appendChild(poster);

    // Details (on the right)
    const details = document.createElement("div");
    details.className = "jellyfin-details";

    const title = document.createElement("h2");
    title.className = "jellyfin-title";
    title.textContent = item.title;
    details.appendChild(title);

    // Official rating
    if (item.officialRating) {
      const rating = document.createElement("div");
      rating.className = "jellyfin-rating";
      rating.textContent = `Certificate: ${item.officialRating}`;
      details.appendChild(rating);
    }

    // Premiere date
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

    container.appendChild(details);
    wrapper.appendChild(container);
    return wrapper;
  },
});
