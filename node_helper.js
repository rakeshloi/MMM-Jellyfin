const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
  start() {
    console.log("MMM-Jellyfin helper started...");
  },

  async fetchJellyfinData(config) {
    try {
      const validContentTypes = ["Movie", "Series", "Episode", "Audio", "MusicAlbum"];
      if (!validContentTypes.includes(config.contentType)) {
        console.error("Invalid content type. Defaulting to 'Movie'.");
        config.contentType = "Movie";
      }

      const response = await axios.get(
        `${config.serverUrl}/Users/${config.userId || ""}/Items`,
        {
          params: {
            SortBy: config.sortBy,
            SortOrder: config.sortOrder,
            IncludeItemTypes: config.contentType,
            Limit: config.maxItems,
          },
          headers: {
            "X-Emby-Token": config.apiKey,
          },
        }
      );

      const items = response.data.Items.map((item) => ({
        title: item.Name,
        poster: `${config.serverUrl}/Items/${item.Id}/Images/Primary?api_key=${config.apiKey}`,
        addedDate: item.DateCreated,
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
