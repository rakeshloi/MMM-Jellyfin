/**
 * node_helper.js
 *
 * Fetches data from Jellyfin using /Users/{userId}/Items/Latest
 * or any other desired endpoint. Focuses on "Primary" for posters.
 * Now includes error handling to notify the front-end if Jellyfin is offline.
 */
const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
  start() {
    console.log("[MMM-Jellyfin] node_helper started...");
  },

  async fetchJellyfinData(config) {
    try {
      // Call the Jellyfin API
      const response = await axios.get(
        `${config.serverUrl}/Users/${config.userId}/Items/Latest`,
        {
          params: {
            IncludeItemTypes: config.contentType, // e.g. "Movie"
            Limit: config.maxItems,
            Fields: "Overview,MediaSourceCount",
            ParentId: config.parentId, // optional library filter
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary,Thumb,Banner",
            EnableTotalRecordCount: false,
          },
          headers: {
            "X-Emby-Token": config.apiKey,
          },
        }
      );

      // Transform the data into a simpler structure
      const items = response.data.map((item) => {
        // Poster/fallback
        let posterUrl = null;
        if (item.ImageTags && item.ImageTags.Primary) {
          posterUrl = `${config.serverUrl}/Items/${item.Id}/Images/Primary?api_key=${config.apiKey}`;
        } else if (item.ImageTags && item.ImageTags.Thumb) {
          posterUrl = `${config.serverUrl}/Items/${item.Id}/Images/Thumb?api_key=${config.apiKey}`;
        }

        return {
          id: item.Id,
          title: item.Name || "Untitled",
          officialRating: item.OfficialRating || "",
          premiereDate: item.PremiereDate || "",
          overview: item.Overview || "",
          poster: posterUrl,
        };
      });

      return items;
    } catch (error) {
      // If there's an error (e.g., Jellyfin is down), log it and throw it up the chain
      console.error("[MMM-Jellyfin] Error fetching Jellyfin data:", error.message || error);
      throw error; // Rethrow for the caller to handle
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "FETCH_JELLYFIN_DATA") {
      this.fetchJellyfinData(payload)
        .then((items) => {
          // Successfully fetched Jellyfin data
          this.sendSocketNotification("JELLYFIN_DATA", items);
        })
        .catch((error) => {
          // Notify front-end that Jellyfin is offline
          this.sendSocketNotification("JELLYFIN_OFFLINE", {});
        });
    }
  },
});
