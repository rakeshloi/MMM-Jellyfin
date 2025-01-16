/**
 * node_helper.js
 *
 * Fetches "Recently Added" items or "Now Playing" session data from Jellyfin.
 * Focuses on adding support for "Now Playing".
 */
const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
  start() {
    console.log("[MMM-Jellyfin] node_helper started...");
  },

  // Fetch "Recently Added" items
  async fetchRecentlyAdded(config) {
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

      // Simplify the data
      return response.data.map((item) => {
        let posterUrl = null;
        if (item.ImageTags?.Primary) {
          posterUrl = `${config.serverUrl}/Items/${item.Id}/Images/Primary?api_key=${config.apiKey}`;
        } else if (item.ImageTags?.Thumb) {
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
    } catch (error) {
      console.error("[MMM-Jellyfin] Error fetching Recently Added:", error.message || error);
      throw error;
    }
  },

  // Fetch "Now Playing" sessions
  async fetchNowPlaying(config) {
    try {
      const response = await axios.get(`${config.serverUrl}/Sessions`, {
        headers: {
          "X-Emby-Token": config.apiKey,
        },
      });

      // Filter for the desired user
      const sessions = response.data.filter((session) => session.UserId === config.userId);

      if (sessions.length > 0 && sessions[0].NowPlayingItem) {
        const session = sessions[0];
        const nowPlayingItem = session.NowPlayingItem;

        // Simplify the data
        return {
          isPlaying: true,
          title: nowPlayingItem.Name || "Now Playing",
          poster: `${config.serverUrl}/Items/${nowPlayingItem.Id}/Images/Primary?api_key=${config.apiKey}`,
          runTimeTicks: nowPlayingItem.RunTimeTicks || 0,
          positionTicks: session.PlayState?.PositionTicks || 0,
          isPaused: session.PlayState?.IsPaused || false,
        };
      }

      return { isPlaying: false };
    } catch (error) {
      console.error("[MMM-Jellyfin] Error fetching Now Playing:", error.message || error);
      throw error;
    }
  },

  // Main logic for determining what to fetch
  async fetchData(config) {
    // Check for "Now Playing"
    const nowPlaying = await this.fetchNowPlaying(config);
    if (nowPlaying.isPlaying) {
      return { type: "nowPlaying", data: nowPlaying };
    }

    // If nothing is playing, fetch "Recently Added"
    const recentlyAdded = await this.fetchRecentlyAdded(config);
    return { type: "recentlyAdded", data: recentlyAdded };
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "FETCH_JELLYFIN_DATA") {
      this.fetchData(payload)
        .then((result) => {
          // Send either "nowPlaying" or "recentlyAdded" data to the front-end
          this.sendSocketNotification("JELLYFIN_DATA", result);
        })
        .catch((error) => {
          console.error("[MMM-Jellyfin] Jellyfin fetch failed:", error.message || error);
          this.sendSocketNotification("JELLYFIN_OFFLINE", {});
        });
    }
  },
});
