const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
  start() {
    console.log("MMM-Jellyfin helper started...");
  },

  async fetchJellyfinData(config) {
    try {
      // Call Jellyfin for recently added 4K movies
      // Adjust parameters if you have specific library, etc.
      const response = await axios.get(
        `${config.serverUrl}/Users/${config.userId}/Items/Latest`,
        {
          params: {
            IncludeItemTypes: config.contentType, // e.g. "Movie"
            Limit: config.maxItems,              // e.g. 5
            Fields: "Overview,PrimaryImageAspectRatio,MediaSourceCount",
            ParentId: config.parentId,           // For your 4K library
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary,Backdrop,Banner,Thumb",
            EnableTotalRecordCount: false,
          },
          headers: {
            "X-Emby-Token": config.apiKey,
          },
        }
      );

      // Transform the data into a simpler array of items
      const items = response.data.map((item) => ({
        id: item.Id,
        title: item.Name,
        // Use the Thumb image if available; else fallback to Primary
        thumb: item.ImageTags?.Thumb
          ? `${config.serverUrl}/Items/${item.Id}/Images/Thumb?api_key=${config.apiKey}`
          : `${config.serverUrl}/Items/${item.Id}/Images/Primary?api_key=${config.apiKey}`,
        premiereDate: item.PremiereDate,
        officialRating: item.OfficialRating,
        overview: item.Overview || "",
      }));

      return items;
    } catch (error) {
      console.error("Error fetching Jellyfin data:", error);
      return [];
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "FETCH_JELLYFIN_DATA") {
      this.fetchJellyfinData(payload).then((items) => {
        this.sendSocketNotification("JELLYFIN_DATA", items);
      });
    }
  },
});
