
# MMM-Jellyfin
Testing and tweaking 'Now playing'.
Everything else works and was tested on a RPi 5.

A MagicMirror module that integrates with a Jellyfin server to display **recently added** items or **now playing** content. The module dynamically switches between **"Recently Added"** and **"Now Playing"**, showing detailed information and progress for the currently playing item when applicable.

## Features

- **Now Playing Support**: Automatically displays "Now Playing" content (title, poster, and progress bar) if a user is actively playing something on Jellyfin.  
- **Recently Added**: Shows recently added movies, series, or other content when nothing is playing.  
- **Dynamic Switching**: Seamlessly switches between "Now Playing" and "Recently Added" views.  
- **Progress Bar**: Displays playback progress for "Now Playing" items, including a visual indicator for paused vs. playing states.  
- **Auto-Hide When Offline**: Automatically hides the module when Jellyfin is unreachable and re-displays when the server becomes available again.  
- **Customizable Layout**: Uses a clean, flexible layout with posters on the left and text on the right.  

---

## Installation

1. Navigate to your MagicMirror `modules` folder:
   ```bash
   cd ~/MagicMirror/modules
   ```
2. Clone or copy this module:
   ```bash
   git clone https://github.com/YourUsername/MMM-Jellyfin.git
   ```
   Ensure the folder is named **`MMM-Jellyfin`**.
3. Go into the module folder and install dependencies:
   ```bash
   cd MMM-Jellyfin
   npm install
   ```

---

## Configuration

Add the module to your MagicMirror `config/config.js` file. Here’s an example:

```js
{
  module: "MMM-Jellyfin",
  position: "bottom_right", // or any other region
  config: {
    apiKey: "YOUR_API_KEY",                // Jellyfin API key
    serverUrl: "http://XXX.XXX.X.XX:8096", // Jellyfin server URL
    userId: "YOUR_USER_ID",                // Jellyfin user ID
    contentType: "Movie",                  // e.g., "Movie", "Series", etc.
    maxItems: 5,                           // Number of recently added items to fetch
    updateInterval: 10 * 60 * 1000,        // Refresh data every 10 minutes
    rotateInterval: 30 * 1000              // Rotate between items every 30 seconds
  }
}
```

---

### How to Find Your Jellyfin API Key and User ID

- **API Key**: In the Jellyfin Web UI, go to **Dashboard > API Keys**, or create a new one in **Users > Advanced > API Keys**.  
- **User ID**:  
  - Go to **Dashboard > Users** in the Jellyfin Web UI.  
  - Click on your username and check the URL for the `userId` (e.g., `?userId=123456`).  
  - Alternatively, call `/Users` from the Jellyfin API with your API key to retrieve your user ID.  

---

## How It Works

1. **Now Playing**:  
   - If a user is actively watching something on Jellyfin, the module displays the "Now Playing" item with a poster, title, and progress bar.  
   - If the media is paused, the progress bar is displayed in red. If it's playing, the bar is green.  

2. **Recently Added**:  
   - If no "Now Playing" content is detected, the module shows recently added items, cycling through them one by one.  

3. **Offline Detection**:  
   - If Jellyfin is unreachable, the module hides itself automatically and displays no content. It checks again at the next `updateInterval` and reappears if Jellyfin is back online.

---

## Styling & Layout

### Layout Overview

- **Posters** are shown on the left in a fixed-width column (e.g., 120px wide).  
- **Text Content** (e.g., title, certificate, overview) appears in a flexible column on the right.  

### CSS Adjustments

You can modify the module's CSS file (`MMM-Jellyfin.css`) for further customization. For example:

- Adjust the poster size:
  ```css
  .jellyfin-wrapper img {
    width: 120px;
    height: 200px;
    object-fit: cover;
  }
  ```
- Set a maximum width for the text container:
  ```css
  .jellyfin-wrapper .details {
    max-width: 300px;
  }
  ```

---

## Example Output

### Now Playing

When "Now Playing" content is detected:
```
+-----------------------------+
| [Poster]  Title: Movie Name |
|           Progress: ▓▓▓▓░░ |
+-----------------------------+
```

### Recently Added

When displaying "Recently Added" items:
```
+-----------------------------+
| [Poster]  Title: Movie Name |
|           Certificate: 15   |
|           Premiere: 2024-12 |
|           Overview: ...     |
+-----------------------------+
```

---

## Troubleshooting

1. **Module Doesn’t Appear**:  
   - Verify your Jellyfin API key and server URL are correct.  
   - Check your MagicMirror logs (`pm2 logs` or the terminal output) for errors.  

2. **Nothing Shows When Playing Something**:  
   - Ensure you’re signed in with the same Jellyfin user specified in your `config.js`.  
   - Check the `/Sessions` endpoint manually to confirm "Now Playing" data is available.  

3. **Module Doesn’t Hide When Offline**:  
   - Verify your `node_helper.js` sends the `"JELLYFIN_OFFLINE"` notification on errors.  

---

## Contributing

Feel free to open issues or submit pull requests if you’d like to enhance the module further. All contributions are welcome! 🚀

---

### License

This module is licensed under the [MIT License](LICENSE).
