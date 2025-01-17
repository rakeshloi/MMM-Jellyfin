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
        return null;
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
      return null;
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
            Fields: "Overview,MediaSourceCount",
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
        };
      });
    } catch (error) {
      console.error("[MMM-Jellyfin] Error fetching recently added data:", error);
      return [];
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "FETCH_JELLYFIN_DATA") {
      console.log("[MMM-Jellyfin] Fetching recently added data...");
      this.fetchRecentlyAdded(payload).then((items) => {
        this.sendSocketNotification("JELLYFIN_DATA", {
          type: "recentlyAdded",
          data: items,
        });
      });
    } else if (notification === "FETCH_NOW_PLAYING_DETAILS") {
      console.log("[MMM-Jellyfin] Fetching now playing data...");
      const { serverUrl, apiKey, userId } = payload;
      this.fetchNowPlaying(serverUrl, apiKey, userId).then((nowPlayingItem) => {
        this.sendSocketNotification("JELLYFIN_DATA", {
          type: "nowPlaying",
          data: nowPlayingItem,
        });
      });
    }
  },
});
