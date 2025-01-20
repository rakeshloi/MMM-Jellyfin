const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
  start() {
    console.log("[MMM-Jellyfin] Node helper started...");
  },

  async fetchNowPlaying(serverUrl, apiKey, userId) {
    try {
      const response = await axios.get(`${serverUrl}/Sessions`, {
        params: { api_key: apiKey },
      });

      const nowPlayingSession = response.data.find(
        (session) => session.NowPlayingItem && session.UserId === userId
      );

      if (!nowPlayingSession || !nowPlayingSession.NowPlayingItem) {
        return null; // Return null when no data is found
      }

      const item = nowPlayingSession.NowPlayingItem;

      const posterUrl =
        item.ImageTags && item.ImageTags.Primary
          ? `${serverUrl}/Items/${item.Id}/Images/Primary?api_key=${apiKey}`
          : null;

      return {
        id: item.Id,
        title: item.Name || "Untitled",
        officialRating: item.OfficialRating || "",
        premiereDate: item.PremiereDate || "",
        overview: item.Overview || "",
        poster: posterUrl,
        runTimeTicks: item.RunTimeTicks || 0,
        positionTicks: nowPlayingSession.PlayState.PositionTicks || 0,
        isPaused: nowPlayingSession.PlayState.IsPaused || false,
      };
    } catch (error) {
      console.error("[MMM-Jellyfin] Error fetching now playing data:", error);
      return null; // Return null on error if Jellyfin is unreachable
    }
  },

  async fetchRecentlyAdded(config) {
    try {
      const response = await axios.get(
        `${config.serverUrl}/Users/${config.userId}/Items/Latest`,
        {
          params: {
            IncludeItemTypes: config.contentType,
            Limit: config.maxItems,
            Fields: "Overview,MediaSourceCount,RunTimeTicks", // Ensure RunTimeTicks is requested
            ParentId: config.parentId || null,
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary,Thumb,Banner",
            EnableTotalRecordCount: false,
          },
          headers: {
            "X-Emby-Token": config.apiKey,
          },
        }
      );

      if (!response.data || response.data.length === 0) {
        return []; // Return an empty array if no data
      }

      return response.data.map((item) => {
        const posterUrl =
          item.ImageTags && item.ImageTags.Primary
            ? `${config.serverUrl}/Items/${item.Id}/Images/Primary?api_key=${config.apiKey}`
            : null;

        return {
          id: item.Id,
          title: item.Name || "Untitled",
          officialRating: item.OfficialRating || "",
          premiereDate: item.PremiereDate || "",
          overview: item.Overview || "",
          poster: posterUrl,
          runTimeTicks: item.RunTimeTicks || 0,  // Add RunTimeTicks to the returned data
        };
      });
    } catch (error) {
      console.error("[MMM-Jellyfin] Error fetching recently added data:", error);
      return []; // Return empty array if there's an error
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "FETCH_JELLYFIN_DATA") {
      console.log("[MMM-Jellyfin] Fetching recently added data...");
      this.fetchRecentlyAdded(payload).then((items) => {
        if (items.length === 0) {
          // If no items are fetched, indicate Jellyfin is down
          this.sendSocketNotification("JELLYFIN_DATA", {
            type: "recentlyAdded",
            data: null,  // Send null to indicate no data
          });
        } else {
          this.sendSocketNotification("JELLYFIN_DATA", {
            type: "recentlyAdded",
            data: items,
          });
        }
      });
    } else if (notification === "FETCH_NOW_PLAYING_DETAILS") {
      console.log("[MMM-Jellyfin] Fetching now playing data...");
      const { serverUrl, apiKey, userId } = payload;
      this.fetchNowPlaying(serverUrl, apiKey, userId).then((nowPlayingItem) => {
        if (nowPlayingItem === null) {
          // If no Now Playing data is returned, send null to indicate Jellyfin is down
          this.sendSocketNotification("JELLYFIN_DATA", {
            type: "nowPlaying",
            data: null,
          });
        } else {
          this.sendSocketNotification("JELLYFIN_DATA", {
            type: "nowPlaying",
            data: nowPlayingItem,
          });
        }
      });
    }
  },
});
