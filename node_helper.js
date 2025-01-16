const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
  start() {
    console.log("[MMM-Jellyfin] Node helper started...");
  },

  async fetchNowPlayingDetails(serverUrl, apiKey, itemId) {
    try {
      const response = await axios.get(`${serverUrl}/Items/${itemId}`, {
        params: {
          api_key: apiKey,
          Fields: "Overview,OfficialRating,PremiereDate,MediaSourceCount",
        },
      });
      return response.data;
    } catch (error) {
      console.error("[MMM-Jellyfin] Error fetching now playing details:", error);
      return null;
    }
  },

  async fetchJellyfinData(config) {
    try {
      const response = await axios.get(
        `${config.serverUrl}/Users/${config.userId}/Items/Latest`,
        {
          params: {
            IncludeItemTypes: config.contentType,
            Limit: config.maxItems,
            Fields: "Overview,MediaSourceCount",
            ParentId: config.parentId,
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary,Thumb,Banner",
            EnableTotalRecordCount: false,
          },
          headers: {
            "X-Emby-Token": config.apiKey,
          },
        }
      );

      const items = response.data.map((item) => {
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
      console.error("[MMM-Jellyfin] Error fetching Jellyfin data:", error);
      return [];
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "FETCH_JELLYFIN_DATA") {
      this.fetchJellyfinData(payload).then((items) => {
        this.sendSocketNotification("JELLYFIN_DATA", {
          type: "recentlyAdded",
          data: items,
        });
      });
    } else if (notification === "FETCH_NOW_PLAYING_DETAILS") {
      const { serverUrl, apiKey, itemId } = payload;
      this.fetchNowPlayingDetails(serverUrl, apiKey, itemId).then((itemDetails) => {
        this.sendSocketNotification("JELLYFIN_DATA", {
          type: "nowPlaying",
          data: itemDetails,
        });
      });
    }
  },
});
