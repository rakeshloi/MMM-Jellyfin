Module.register("MMM-Jellyfin", {
  defaults: {
    apiKey: "your_api_key",
    serverUrl: "http://192.168.1.96:8096",
    userId: "your_user_id",
    parentId: "09c0916698d5c5390772900c4b80c3ce", // 4K library ID
    contentType: "Movie",
    maxItems: 5,                 // How many films to fetch
    updateInterval: 10 * 60 * 1000, // How often to refresh data from Jellyfin (ms)
    rotateInterval: 30 * 1000,   // How often to rotate the displayed film (ms)
  },

  start() {
    this.items = [];
    this.currentIndex = 0;

    // Fetch data from Jellyfin right away
    this.getData();

    // Periodically refetch data from Jellyfin (e.g., every 10 mins)
    setInterval(() => {
      this.getData();
    }, this.config.updateInterval);

    // Rotate through fetched items every rotateInterval (e.g., 30s)
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
      // 'payload' is an array of film objects from node_helper
      this.items = payload || [];
      this.currentIndex = 0; // Reset to the first item each time new data arrives
      this.updateDom();
    }
  },

  getDom() {
    const wrapper = document.createElement("div");

    // If no items are loaded yet, show a loading message
    if (!this.items.length) {
      wrapper.innerHTML = "Loading 4K movies...";
      return wrapper;
    }

    // Get the current item based on the currentIndex
    const item = this.items[this.currentIndex];

    // Container for the single film view
    const container = document.createElement("div");
    container.className = "jellyfin-single-movie";

    // Thumb image
    const img = document.createElement("img");
    img.src = item.thumb;
    img.className = "jellyfin-thumb";
    container.appendChild(img);

    // Title
    const title = document.createElement("h2");
    title.className = "jellyfin-title";
    title.textContent = item.title;
    container.appendChild(title);

    // Certificate (official rating)
    if (item.officialRating) {
      const rating = document.createElement("div");
      rating.className = "jellyfin-rating";
      rating.textContent = `Certificate: ${item.officialRating}`;
      container.appendChild(rating);
    }

    // Premiere Date
    if (item.premiereDate) {
      const date = new Date(item.premiereDate).toLocaleDateString();
      const premiere = document.createElement("div");
      premiere.className = "jellyfin-premiere-date";
      premiere.textContent = `Premiere Date: ${date}`;
      container.appendChild(premiere);
    }

    // Overview
    if (item.overview) {
      const overview = document.createElement("p");
      overview.className = "jellyfin-overview";
      overview.textContent = item.overview;
      container.appendChild(overview);
    }

    wrapper.appendChild(container);
    return wrapper;
  },
});
