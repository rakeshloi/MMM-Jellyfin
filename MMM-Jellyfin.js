Module.register("MMM-Jellyfin", {
    defaults: {
      apiKey: "your_api_key",
      serverUrl: "http://your-jellyfin-server:8096",
      userId: "your_user_id", // Optional
      updateInterval: 10 * 60 * 1000, // Update every 10 minutes
      maxItems: 5, // Number of items to display
      contentType: "Movie", // Options: "Movie", "Episode", "Series", etc.
      sortBy: "DateCreated", // Sorting criteria
      sortOrder: "Descending", // Options: "Ascending", "Descending"
    },
  
    start() {
      this.items = [];
      this.getData();
      setInterval(() => {
        this.getData();
      }, this.config.updateInterval);
    },
  
    getData() {
      this.sendSocketNotification("FETCH_JELLYFIN_DATA", this.config);
    },
  
    socketNotificationReceived(notification, payload) {
      if (notification === "JELLYFIN_DATA") {
        this.items = payload;
        this.updateDom();
      }
    },
  
    getDom() {
      const wrapper = document.createElement("div");
      if (!this.items.length) {
        wrapper.innerHTML = "Loading content from Jellyfin...";
        return wrapper;
      }
  
      const list = document.createElement("ul");
      this.items.forEach((item) => {
        const listItem = document.createElement("li");
  
        const img = document.createElement("img");
        img.src = item.poster;
        img.style.width = "50px";
        img.style.marginRight = "10px";
  
        const title = document.createElement("span");
        title.innerHTML = item.title;
  
        listItem.appendChild(img);
        listItem.appendChild(title);
        list.appendChild(listItem);
      });
  
      wrapper.appendChild(list);
      return wrapper;
    },
  });
  