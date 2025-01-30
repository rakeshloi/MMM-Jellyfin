# MMM-JellyNew

A **MagicMirror²** module that integrates with **Jellyfin** to display **Now Playing** media and **Recently Added** items. It supports **Movies, TV Shows, and Audio**, automatically fetching metadata, including **Last.fm artist info** for music.

This is a complete **ground-up rebuild** because... well, I hated the old code. If anyone out there would like to contribute, feel free! There is still a **lag in the progress bar update**, as there is an initial 30-second delay.

I have limited time to work on this but if you do come up with ideas for more features please do get in touch.  I might rebuild it again.  I'm still learning .JS while building this.

---

## 🌟 Features

- **Now Playing** – Displays the currently playing **movie, TV show, or song**.
- **Recently Added** – Cycles through the latest **Movies** added to your Jellyfin library (**Shows and Music coming soon**).
- **Configurable Intervals** – Set how often to refresh recently added content.
- **Smart Updates** – Only refreshes if new media is added, reducing unnecessary API calls.
- **Playback Detection** – Automatically switches between **Now Playing** and **Recently Added**.
- **Smooth UI Transitions** – Fades between items for a clean display.
- **Last.fm Integration** – Fetches **artist bios** for audio media. Optional.
- **Auto-Hide on Server Downtime** – If Jellyfin is down, the module hides itself.

---

## 📌 Installation

1. Navigate to your **MagicMirror modules** directory:
   ```bash
   cd ~/MagicMirror/modules
   ```
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/MMM-JellyNew.git
   ```
3. Navigate into the module directory:
   ```bash
   cd MMM-JellyNew
   ```
4. Install dependencies:
   ```bash
   npm install
   ```

---

## ⚙ Configuration

Add this module to your **MagicMirror** `config.js` file:

```js
{
  module: "MMM-JellyNew",
  position: "top_right", // Choose your preferred position
  config: {
    serverUrl: "http://your-jellyfin-server:8096", // Jellyfin Server URL
    apiKey: "your-api-key-here", // Jellyfin API Key
    userId: "your-user-id", // Jellyfin User ID
    lastFmApiKey: "your-lastfm-api-key", // Required for Audio artist bios
    mediaTypes: ["Movies"], // Options: "Movies", TV Shows and Music coming soon
    recentlyAddedCheckInterval: 3600000, // Refresh every 60 mins
    recentlyAddedCycleTime: 30000, // Show each item for 30 seconds
    showHeaderLine: true, // Show a line under the header
    headerPrefix: "Media Center", // Customize the header
    progressBarColor: "#4caf50", // Color of the progress bar
    progressBarPausedColor: "#ffa500", // Color when paused
    progressBarBackgroundColor: "#ccc", // Background of progress bar
    width: 550, // Module width
    height: 400, // Module height
    fontSize: "14px", // Content font size
    contentFontSize: "14px", // Description font size
    headerFontSize: "16px", // Header font size
    audioPosterSize: 200, // Album art size (Audio)
    videoPosterWidth: 150, // Poster width (Movies/Shows)
    videoPosterHeight: 200  // Poster height (Movies/Shows)
  }
}
```

---

## 🔧 API Setup

### **Jellyfin API Key**
1. Open **Jellyfin** → Go to **Dashboard** → **API Keys**.
2. Click **New API Key**, give it a name, and copy the key.
3. Paste it into `config.js` under `apiKey`.

### **Last.fm API Key (for Audio)**
1. Go to [Last.fm API](https://www.last.fm/api).
2. Create an account (if needed) and **get an API key**.
3. Paste it into `config.js` under `lastFmApiKey`.

---

## 🎨 Layout & UI

- **Posters** are displayed for **Movies & Shows**.
- **Album art** is displayed for **Audio**, along with **Last.fm data** (if available).
- **Progress bar** appears when media is playing.
- **Recently Added** cycles through new content automatically.

---

## 💡 Notes

- If **Jellyfin is down**, the module will **hide itself** until it's back online.
- The module **only refreshes Recently Added** if new items are found.
- **Now Playing takes priority** over Recently Added when media is playing.
- **Audio requires a Last.fm API key** for artist descriptions.

---

## 🚀 Roadmap & Future Features

✅ **Now Playing & Recently Added Support**  
✅ **Last.fm Artist Bio for Audio**  
✅ **Dynamic UI Layout**  
✅ **Hide Module When Jellyfin is Down**  
⏳ **Option for Recently Added TV Shows and Music**  
⏳ **Fix the delay in the progress bar updating**  

---

## 💬 Support & Contributions

Found a **bug**? Have a **feature request**?  
Open an **issue** or **pull request** on [GitHub](https://github.com/yourusername/MMM-JellyNew)!

---

## 📜 License

This module is licensed under the **MIT License**.  
Feel free to **modify** and **use** it for personal projects!
