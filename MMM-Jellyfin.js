/**
 * MMM-Jellyfin.js
 *
 * Example MagicMirror module that:
 * - Fetches data via node_helper.js
 * - Shows a poster in a fixed-width column (120px) on the left
 * - Places text in a flexible column on the right
 * - Cycles through items one at a time
 * - Dynamically sizes to avoid an overly tall layout
 * - Hides the module if Jellyfin is offline
 */

Module.register("MMM-Jellyfin", {
  defaults: {
    apiKey: "",                   // e.g. "c8949e03f8c643..."
    serverUrl: "",                // e.g. "http://192.168.1.96:8096"
    userId: "",                   // e.g. "6e22d56b32924d17a2bdb0eee9094d8a"
    parentId: "",                 // optional library ID
    contentType: "Movie",         // "Movie", "Series", etc.
    maxItems: 5,                  // how many items to fetch
    updateInterval: 10 * 60 * 1000, // fetch new data every 10 mins
    rotateInterval: 30 * 1000     // rotate to next item every 30s
  },

  // Load our module’s CSS
  getStyles() {
    return ["MMM-Jellyfin.css"];
  },

  start() {
    console.log("Starting MMM-Jellyfin...");
    this.items = [];
    this.currentIndex = 0;
    
    // Track if Jellyfin is offline
    this.offline = false;

    // Fetch data from node_helper right away
    this.getData();

    // Refresh data from Jellyfin periodically
    setInterval(() => {
      this.getData();
    }, this.config.updateInterval);

    // Cycle through items at rotateInterval
    setInterval(() => {
      // Only rotate if we have 2+ items and not offline
      if (!this.offline && this.items.length > 1) {
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        this.updateDom();
      }
    }, this.config.rotateInterval);
  },

  /**
   * Request data from node_helper.js
   */
  getData() {
    this.sendSocketNotification("FETCH_JELLYFIN_DATA", this.config);
  },

  /**
   * Receive data back from node_helper
   */
  socketNotificationReceived(notification, payload) {
    if (notification === "JELLYFIN_DATA") {
      // Jellyfin is online
      this.offline = false;
      // Show the module (if it was hidden)
      this.show(1000, { lockString: "jellyfin-offline" });

      // Reset items
      this.items = payload || [];
      this.currentIndex = 0;
      this.updateDom();
    }
    else if (notification === "JELLYFIN_OFFLINE") {
      // Jellyfin is unreachable
      this.offline = true;
      // Hide the module
      this.hide(1000, { lockString: "jellyfin-offline" });
    }
  },

  /**
   * Render the DOM elements for the current Jellyfin item
   */
  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "jellyfin-wrapper"; // Will rely on CSS for alignment, etc.

    // If Jellyfin is offline, either show a message or return nothing
    if (this.offline) {
      // Example: show a small text
      wrapper.innerHTML = "Jellyfin is offline...";
      return wrapper;
    }

    // If no data yet, show a loading message
    if (!this.items.length) {
      wrapper.innerHTML = "Loading Jellyfin data...";
      return wrapper;
    }

    // Grab the current item from the array
    const item = this.items[this.currentIndex];

    // Main container for poster + text
    const container = document.createElement("div");
    // Use flex so we can have a fixed-width poster column and flexible text
    container.style.display = "flex";
    container.style.flexDirection = "row";
    // If you want the poster and text top-aligned:
    container.style.alignItems = "flex-start";
    // If you want them vertically centered:
    // container.style.alignItems = "center";

    /**
     * POSTER COLUMN
     *
     * A small wrapper for the poster, forcing a fixed width (e.g., 120px).
     */
    const posterWrapper = document.createElement("div");
    // "flex: 0 0 120px" means:
    //  0 = don't grow, 0 = don't shrink, 120px = fixed width
    posterWrapper.style.flex = "0 0 120px";
    // We'll add some margin on the right to separate it from the text
    posterWrapper.style.marginRight = "10px";

    // Create the poster image
    const posterImg = document.createElement("img");
    posterImg.src = item.poster || ""; // in case there's no poster
    // Force a constant size
    posterImg.style.width  = "120px";
    posterImg.style.height = "200px";
    posterImg.style.objectFit = "cover"; // or "contain" to avoid cropping

    // Append image to the poster wrapper
    posterWrapper.appendChild(posterImg);

    /**
     * TEXT COLUMN
     *
     * Takes the remaining horizontal space, so the text can be wider.
     */
    const textWrapper = document.createElement("div");
    // Let this column be flexible (1 = can grow/shrink, auto basis)
    textWrapper.style.flex = "1 1 auto";
    textWrapper.style.display = "flex";
    textWrapper.style.flexDirection = "column";
    // If you want the text top-aligned:
    textWrapper.style.justifyContent = "flex-start";
    // Or center it next to the poster:
    // textWrapper.style.justifyContent = "center";
    textWrapper.style.fontSize = "0.85em";

    // Title
    const title = document.createElement("h2");
    title.style.fontSize = "1em";
    title.style.margin = "0 0 4px 0";
    title.textContent = item.title || "Untitled";
    textWrapper.appendChild(title);

    // Certificate / Official Rating
    if (item.officialRating) {
      const rating = document.createElement("div");
      rating.style.color = "#ccc";
      rating.style.fontSize = "0.8em";
      rating.style.marginBottom = "4px";
      rating.textContent = `Certificate: ${item.officialRating}`;
      textWrapper.appendChild(rating);
    }

    // Premiere Date
    if (item.premiereDate) {
      const dateDiv = document.createElement("div");
      dateDiv.style.color = "#ccc";
      dateDiv.style.fontSize = "0.8em";
      dateDiv.style.marginBottom = "4px";
      const dateStr = new Date(item.premiereDate).toLocaleDateString();
      dateDiv.textContent = `Premiere: ${dateStr}`;
      textWrapper.appendChild(dateDiv);
    }

    // Overview (description)
    if (item.overview) {
      const overview = document.createElement("p");
      overview.style.fontSize = "0.8em";
      overview.style.lineHeight = "1.2em";
      overview.style.margin = "6px 0 0 0";
      overview.textContent = item.overview;
      textWrapper.appendChild(overview);
    }

    // Add poster + text columns to the main container
    container.appendChild(posterWrapper);
    container.appendChild(textWrapper);

    // Finally, add the container to the wrapper
    wrapper.appendChild(container);
    return wrapper;
  }
});
