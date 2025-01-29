let serverUrl, apiKey, userId; // Declare variables to be set dynamically

let checkInterval = 60000; // Default 60 seconds
let activityCheckInterval = 10000; // Default 10 seconds for activity log check
let sessionCheckInterval = 10000; // Default 10 seconds for session checks
let currentActivityState = null; // Store the current activity state
let playbackActive = false; // Track if playback is currently active
let recentlyAddedItems = []; // Store recently added items
let isPaused = false; // Track the paused state
let currentProgress = 0; // Track the progress of playback
let remainingTime = ''; // Track remaining time
let sessionCheckIntervalId = null; // Store session check interval ID
let currentMediaId = null; // Track the currently playing media ID
let isTransitioning = false; // New flag to manage the transition
let recentlyAddedIndex = 0; // Track current item index

let moduleConfig = {
    mediaTypes: ['Movies'], // Default media types if not set in config
    checkInterval: 60000,
    activityCheckInterval: 10000,
    recentlyAddedCheckInterval: 3600000, // Default 60 mins
    headerPrefix: 'Media Center', // Default header prefix
    width: 500,
    height: 450,
    fontSize: '14px', // Configurable font size for remaining time
    contentFontSize: '14px', // Configurable font size for content
    progressBarColor: '#4caf50',
    progressBarPausedColor: '#ffa500',
    progressBarBackgroundColor: '#ccc',
    headerFontSize: '16px',
    showHeaderLine: true,
    audioPosterSize: 200, // Default size for Audio posters
    videoPosterWidth: 150, // Default width for Movies/Shows posters
    videoPosterHeight: 200 // Default height for Movies/Shows posters
};

Module.register('MMM-Jellyfin', {
    start: function () {
        console.log('Starting MMM-Jellyfin...');
        if (this.config) {
            moduleConfig = { ...moduleConfig, ...this.config };
        }

        // Assign values from config
        serverUrl = moduleConfig.serverUrl;
        apiKey = moduleConfig.apiKey;
        userId = moduleConfig.userId;

        if (!serverUrl || !apiKey || !userId) {
            console.error("MMM-JellyNew: Missing required configuration (serverUrl, apiKey, or userId). Module will not function correctly.");
            return;
        }

        this.checkServerStatus(); // Initial check on startup

        // Check server status every minute
        setInterval(() => {
            this.checkServerStatus();
        }, 60000);

        this.startRecentlyAddedTimer(); // Start auto-refresh timer

        // Bind methods
        this.startActivityLogCheck = this.startActivityLogCheck.bind(this);
        this.checkActivityLog = this.checkActivityLog.bind(this);
        this.managePlayback = this.managePlayback.bind(this);
        this.fetchAndDisplayPlayingItemDetails = this.fetchAndDisplayPlayingItemDetails.bind(this);
        this.fetchRecentlyAdded = this.fetchRecentlyAdded.bind(this);

        this.startActivityLogCheck();
    },

    checkServerStatus: async function () {
        try {
            const response = await fetch(`${serverUrl}/System/Ping`);
            if (!response.ok) throw new Error('Server did not respond properly.');

            console.log("Jellyfin is online.");
            this.show(); // Show the module if it's hidden
            return true;
        } catch (error) {
            console.warn("Jellyfin server is down or unreachable.");
            this.hide(); // Hide the module if the server is down
            return false;
        }
    },

    getDom: function () {
        const wrapper = document.createElement('div');
        wrapper.id = 'MMM-Jellyfin-wrapper';
        wrapper.style.width = `${moduleConfig.width}px`;
        wrapper.style.height = `${moduleConfig.height}px`;

        const header = document.createElement('div');
        header.id = 'MMM-Jellyfin-header';
        header.className = 'module-header';
        header.style.textAlign = 'right';
        header.style.fontSize = moduleConfig.headerFontSize;
        if (moduleConfig.showHeaderLine) {
            header.style.borderBottom = '1px solid #ddd';
            header.style.paddingBottom = '5px';
        }
        header.innerHTML = `${moduleConfig.headerPrefix} - ${playbackActive ? 'Now Playing' : 'Recently Added'}`;
        wrapper.appendChild(header);

        const content = document.createElement('div');
        content.id = 'MMM-Jellyfin-content';
        content.style.display = 'flex';
        content.style.alignItems = 'center';
        content.style.justifyContent = 'space-between';
        content.style.marginTop = '10px';
        wrapper.appendChild(content);

        const footer = document.createElement('div');
        footer.id = 'MMM-Jellyfin-footer';
        footer.style.display = 'none'; // Hide footer by default
        footer.innerHTML = `
            <div id="progress-bar" style="position: relative; height: 10px; background: ${moduleConfig.progressBarBackgroundColor}; border-radius: 5px;">
                <div id="progress-bar-fill" style="height: 100%; width: 0%; background: ${moduleConfig.progressBarColor}; border-radius: 5px;"></div>
            </div>
            <p id="progress-time" style="text-align: left; margin-top: 5px; font-size: ${moduleConfig.fontSize};">${remainingTime}</p>
        `;
        wrapper.appendChild(footer);

        return wrapper;
    },

    updateHeader: function () {
        const header = document.getElementById('MMM-Jellyfin-header');
        if (header) {
            header.innerHTML = `${moduleConfig.headerPrefix} - ${playbackActive ? 'Now Playing' : 'Recently Added'}`;
        }
    },

    updateFooter: function () {
        const footer = document.getElementById('MMM-Jellyfin-footer');
        const progressBarFill = document.getElementById('progress-bar-fill');
        const progressTime = document.getElementById('progress-time');

        if (footer) {
            if (playbackActive) {
                footer.style.display = 'block';
                if (progressBarFill) {
                    progressBarFill.style.width = `${currentProgress}%`;
                    progressBarFill.style.background = isPaused ? moduleConfig.progressBarPausedColor : moduleConfig.progressBarColor;
                }
                if (progressTime) {
                    progressTime.innerText = isPaused
                        ? 'Paused'
                        : `Remaining Time: ${remainingTime}`;
                }
            } else {
                footer.style.display = 'none';
            }
        }
    },

    updateContentUI: async function (itemDetails) { // Make the function async
        const content = document.getElementById('MMM-Jellyfin-content');

        if (content) {
            content.innerHTML = '';

            const leftColumn = document.createElement('div');
            leftColumn.style.flex = '1';
            leftColumn.style.textAlign = 'left';
            leftColumn.style.fontSize = moduleConfig.contentFontSize;

            const rightColumn = document.createElement('div');
            rightColumn.style.flex = '0 0 auto';
            rightColumn.style.marginLeft = '10px';

            // Determine poster size and placeholder logic
            const isAudio = itemDetails.Type === 'Audio';
            const posterSize = isAudio
                ? `${moduleConfig.audioPosterSize}px`
                : `${moduleConfig.videoPosterWidth}px`;

            const posterHeight = isAudio
                ? `${moduleConfig.audioPosterSize}px`
                : `${moduleConfig.videoPosterHeight}px`;

            // Construct primary, ParentBackdropItemId, and placeholder image URLs
            const primaryImageUrl = `${serverUrl}/Items/${itemDetails.Id}/Images/Primary?api_key=${apiKey}`;
            const parentBackdropImageUrl = itemDetails.ParentBackdropItemId
                ? `${serverUrl}/Items/${itemDetails.ParentBackdropItemId}/Images/Backdrop?api_key=${apiKey}`
                : null;

            const placeholderImage = isAudio
                ? `modules/MMM-Jellyfin/placeholder/audio_placeholder.png`
                : `modules/MMM-Jellyfin/placeholder/movie_placeholder.png`;

            // Set the poster image with graceful fallbacks
            const posterImage = document.createElement('img');
            posterImage.src = primaryImageUrl; // Try primary image first
            posterImage.alt = 'Poster';
            posterImage.style.width = posterSize;
            posterImage.style.height = posterHeight;
            posterImage.style.objectFit = 'cover';

            // Fallback to ParentBackdropItemId if primary fails
            posterImage.onerror = function () {
                if (parentBackdropImageUrl) {
                    console.log(`Primary image failed, trying ParentBackdropItemId: ${parentBackdropImageUrl}`);
                    this.onerror = null; // Avoid infinite loop
                    this.src = parentBackdropImageUrl;
                } else {
                    console.log(`No ParentBackdropItemId available, using placeholder.`);
                    this.src = placeholderImage; // Fallback to placeholder if no ParentBackdropItemId
                }
            };

            rightColumn.appendChild(posterImage);

            // Format the PremiereDate as DD MM YYYY
            const premiereDate = itemDetails.PremiereDate
                ? new Date(itemDetails.PremiereDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                })
                : 'N/A';

            // Calculate runtime in hours and minutes
            const runtimeTicks = itemDetails.RunTimeTicks || 0;
            const ticksPerMinute = 600000000; // 1 minute in ticks
            const totalMinutes = Math.floor(runtimeTicks / ticksPerMinute);
            const runtimeHours = Math.floor(totalMinutes / 60);
            const runtimeMinutes = totalMinutes % 60;

            let formattedRuntime;
            if (itemDetails.Type === 'Episode') {
                formattedRuntime = runtimeHours > 0
                    ? `${runtimeHours}h ${runtimeMinutes}m`
                    : `${runtimeMinutes}m`;
            } else {
                formattedRuntime = runtimeTicks
                    ? `${runtimeHours}h ${runtimeMinutes}m`
                    : 'N/A';
            }

            // Lookup for the certificate image
            const certificate = itemDetails.OfficialRating || 'Unknown';
            const certificateImagePath = `modules/MMM-Jellyfin/certificates/${certificate}.png`;

            // Community Rating (rounded)
            const communityRating = itemDetails.CommunityRating
                ? itemDetails.CommunityRating.toFixed(1)
                : 'N/A';

            // Resolution and Atmos logic
            const selectedResolution = ['Vision', '4K', '1080'].find((res) =>
                itemDetails.MediaStreams?.some((stream) => stream.DisplayTitle?.includes(res))
            );
            const resolutionImagePath = selectedResolution
                ? `modules/MMM-Jellyfin/quality/${selectedResolution.toLowerCase()}.png`
                : null;

            const isAtmos = itemDetails.MediaStreams?.[1]?.DisplayTitle?.includes('Atmos');
            const atmosImagePath = isAtmos ? `modules/MMM-Jellyfin/quality/atmos.png` : null;

            const certificateImage = this.createImageElement(certificateImagePath, '40px');
            const resolutionImage = resolutionImagePath
                ? this.createImageElement(resolutionImagePath, '50px', '5px')
                : null;
            const atmosImage = atmosImagePath
                ? this.createImageElement(atmosImagePath, '50px', '5px')
                : null;

            let overviewTextContent = itemDetails.Overview || 'No Description Available';

            // Fetch Last.fm data if the item is Audio and an AlbumArtist is provided
            if (isAudio && itemDetails.AlbumArtist) {
                try {
                    const lastFmOverview = await this.fetchArtistDetailsFromLastFM(itemDetails.AlbumArtist);
                    if (lastFmOverview) {
                        overviewTextContent = lastFmOverview;
                    } else {
                        console.warn('No data fetched from Last.fm. Using fallback overview.');
                    }
                } catch (error) {
                    console.warn('Failed to fetch artist data from Last.fm:', error);
                }
            }

            // Add series name for Shows
            if (itemDetails.Type === 'Episode' && itemDetails.SeriesName) {
                const seriesNameElement = document.createElement('h4');
                seriesNameElement.style.fontWeight = 'bold';
                seriesNameElement.style.color = '#ccc';
                seriesNameElement.style.marginBottom = '0px';
                seriesNameElement.innerText = itemDetails.SeriesName;
                leftColumn.appendChild(seriesNameElement);
            }

            // Add artist name for Audio
            if (isAudio && itemDetails.AlbumArtist) {
                const artistNameElement = document.createElement('h4');
                artistNameElement.style.fontWeight = 'bold';
                artistNameElement.style.color = '#ccc';
                artistNameElement.style.marginBottom = '0px';
                artistNameElement.style.fontSize = '16px';
                artistNameElement.innerText = itemDetails.AlbumArtist;
                leftColumn.appendChild(artistNameElement);
            }

            // Add title
            const titleElement = document.createElement('h3');
            titleElement.style.fontWeight = 'bold';
            titleElement.style.marginTop = '0px';
            titleElement.style.marginBottom = '0px';
            titleElement.innerText = itemDetails.Name || 'Unknown Title';
            leftColumn.appendChild(titleElement);

            // Add album name for Audio and move closer to the title
            if (itemDetails.Type === 'Audio' && itemDetails.Album) {
                const albumNameElement = document.createElement('h4');
                albumNameElement.style.fontWeight = 'bold';
                albumNameElement.style.color = '#ccc';
                albumNameElement.style.marginTop = '0px'; // Adjust margin to move closer to the title
                albumNameElement.style.marginBottom = '0px'; // No bottom margin
                albumNameElement.style.fontSize = '16px'; // Set smaller font size
                albumNameElement.innerText = itemDetails.Album;
                leftColumn.appendChild(albumNameElement);
            }

            // Add runtime and premiere date for Movies (hide for Shows and Audio)
            if (itemDetails.Type === 'Movie' && premiereDate) {
                const runtimeElement = document.createElement('p');
                runtimeElement.style.margin = '5px 0';
                runtimeElement.innerText = `Premiere: ${premiereDate} | Runtime: ${formattedRuntime}`;
                leftColumn.appendChild(runtimeElement);
            } else if (itemDetails.Type !== 'Audio') {
                const runtimeElement = document.createElement('p');
                runtimeElement.style.margin = '5px 0';
                runtimeElement.innerText = `Runtime: ${formattedRuntime}`;
                leftColumn.appendChild(runtimeElement);
            }

            const detailsRow = document.createElement('div');
            detailsRow.style.display = 'flex';
            detailsRow.style.alignItems = 'center';
            detailsRow.style.gap = '10px';

            // Add certificate and quality images only for Movies
            if (itemDetails.Type === 'Movie') {
                detailsRow.appendChild(certificateImage);
            }
            if (resolutionImage) detailsRow.appendChild(resolutionImage);
            if (atmosImage) detailsRow.appendChild(atmosImage);

            // Add rating only for non-Audio items
            if (itemDetails.Type !== 'Audio') {
                const ratingText = document.createElement('span');
                ratingText.innerText = `Rating: ${communityRating}`;
                ratingText.style.fontSize = moduleConfig.contentFontSize;
                ratingText.style.color = '#ddd';
                detailsRow.appendChild(ratingText);
            }

            leftColumn.appendChild(detailsRow);

            // Add genre only if available
            if (itemDetails.Genres && itemDetails.Genres.length > 0) {
                const genres = itemDetails.Genres.join(', ');
                const genreElement = document.createElement('p');
                genreElement.style.margin = '5px 0';
                genreElement.innerText = `Genre: ${genres}`;
                leftColumn.appendChild(genreElement);
            }

            // Add overview with dynamic scrolling
            const overviewContainer = document.createElement('div');
            overviewContainer.style.marginTop = '0';
            overviewContainer.style.maxHeight = '5.6em'; // 5 lines of text
            overviewContainer.style.overflow = 'hidden';
            overviewContainer.style.lineHeight = '1.4';
            overviewContainer.style.position = 'relative';
            overviewContainer.style.fontSize = moduleConfig.contentFontSize;

            const overviewText = document.createElement('p');
            overviewText.style.margin = '0';
            overviewText.innerText = overviewTextContent; // Use fetched or fallback overview
            overviewContainer.appendChild(overviewText);

            leftColumn.appendChild(overviewContainer);
            content.appendChild(leftColumn);
            content.appendChild(rightColumn);

            // Start smooth scrolling dynamically based on text length
            this.startSmoothOverviewScrolling(overviewContainer, overviewText);
        }
    },


    startSmoothOverviewScrolling: function (container, text) {
        const totalScrollDuration = 25000; // Total duration for one complete scroll (25 seconds)
        const resetDuration = 2000; // Duration for the reset transition (in ms, configurable)
        const scrollDistance = text.scrollHeight - container.clientHeight;

        if (scrollDistance > 0) {
            const totalFrames = totalScrollDuration / 16; // Roughly 60 FPS, 16ms per frame
            const scrollStep = scrollDistance / totalFrames; // Step size for normal scrolling
            let scrollPosition = 0;
            let isResetting = false;

            const smoothScroll = () => {
                if (isResetting) {
                    // Smooth reset to the top
                    const resetFrames = resetDuration / 16; // Frames for the reset transition
                    const resetStep = scrollDistance / resetFrames; // Step size for reset
                    scrollPosition -= resetStep;

                    container.scrollTop = Math.max(0, scrollPosition);

                    if (scrollPosition <= 0) {
                        // Reset complete, start scrolling again
                        isResetting = false;
                        scrollPosition = 0;
                        requestAnimationFrame(smoothScroll);
                    } else {
                        requestAnimationFrame(smoothScroll);
                    }
                } else {
                    // Normal scrolling
                    scrollPosition += scrollStep;
                    container.scrollTop = scrollPosition;

                    if (scrollPosition >= scrollDistance) {
                        // Pause at the bottom and initiate reset
                        setTimeout(() => {
                            isResetting = true;
                            requestAnimationFrame(smoothScroll);
                        }, 500); // Optional pause before reset
                    } else {
                        requestAnimationFrame(smoothScroll);
                    }
                }
            };

            requestAnimationFrame(smoothScroll);
        }
    },

    fetchArtistDetailsFromLastFM: async function (artistName) {
        console.log(artistName)
        const apiKey = this.config.lastFmApiKey; // Replace with your Last.fm API key
        const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(
            artistName
        )}&api_key=${apiKey}&format=json`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch data from Last.fm');
        }

        const data = await response.json();
        if (data.artist && data.artist.bio && data.artist.bio.content) {
            return data.artist.bio.content.split('\n')[0]; // Return the first paragraph of bio
        }
        return null; // Return null if no data is found
    },


    createImageElement: function (src, width, marginLeft = '0px') {
        const img = document.createElement('img');
        img.src = src;
        img.style.width = width;
        img.style.height = 'auto';
        img.style.marginLeft = marginLeft;
        img.style.marginBottom = '5px';
        img.onerror = function () {
            this.style.display = 'none';
        };
        return img;
    },

    startActivityLogCheck: function () {
        console.log('Starting activity log check...');
        setInterval(() => {
            this.checkActivityLog();
        }, activityCheckInterval);
    },

    checkActivityLog: async function () {
        try {
            const response = await fetch(`${serverUrl}/System/ActivityLog/Entries?api_key=${apiKey}&limit=1`, {
                headers: { 'X-Emby-Token': apiKey }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch activity log');
            }

            const data = await response.json();
            const targetStates = [
                'AudioPlayback',
                'VideoPlayback',
                'AudioPlaybackStopped',
                'VideoPlaybackStopped',
                'SessionEnded'
            ];

            if (data.Items.length > 0) {
                const logEntry = data.Items[0];
                if (targetStates.includes(logEntry.Type)) {
                    currentActivityState = logEntry.Type;

                    if (['AudioPlayback', 'VideoPlayback'].includes(logEntry.Type)) {
                        playbackActive = true;
                        this.managePlayback(true, logEntry.ItemId);
                    } else {
                        playbackActive = false;
                        this.managePlayback(false);
                    }
                    this.updateHeader();
                    this.updateFooter();
                }
            }
        } catch (error) {
            console.error('Error fetching activity log:', error);
        }
    },

    managePlayback: function (isPlaying, itemId = null) {
        if (isPlaying) {
            playbackActive = true;

            // Stop Recently Added cycle
            if (this.recentlyAddedInterval) {
                clearInterval(this.recentlyAddedInterval);
                this.recentlyAddedInterval = null;
                console.log("Paused Recently Added cycling due to Now Playing.");
            }

            // Fetch and display Now Playing item
            if (!sessionCheckIntervalId) {
                this.fetchAndDisplayPlayingItemDetails(itemId);
                sessionCheckIntervalId = setInterval(() => {
                    this.fetchSessionDetails(); // Update playback progress
                }, sessionCheckInterval);
            }
        } else {
            playbackActive = false;

            // Ensure recentlyAddedDetails exists before checking its length
            if (!this.recentlyAddedInterval && Array.isArray(this.recentlyAddedDetails) && this.recentlyAddedDetails.length > 0) {
                this.startRecentlyAddedCycle();
                console.log("Resumed Recently Added cycling.");
            }

            clearInterval(sessionCheckIntervalId);
            sessionCheckIntervalId = null;
            this.fetchRecentlyAdded();
        }

        this.updateHeader();
        this.updateFooter();
    },

    fetchRecentlyAdded: async function () {
        console.log('Fetching recently added items...');
        let url = '';

        const isOnline = await this.checkServerStatus();
        if (!isOnline) return; // Stop execution if the server is down

        if (moduleConfig.mediaTypes.includes('Movies')) {
            url = `${serverUrl}/Users/${userId}/Items/Latest?IncludeItemTypes=Movie&Limit=15&api_key=${apiKey}`;
        } else if (moduleConfig.mediaTypes.includes('Shows')) {
            url = `${serverUrl}/Users/${userId}/Items/Latest?collectionType=tvshows&ParentId=a656b907eb3a73532e40e44b968d0225&api_key=${apiKey}`;
        } else if (moduleConfig.mediaTypes.includes('Audio')) {
            url = `${serverUrl}/Users/${userId}/Items/Latest?collectionType=music&ParentId=7e64e319657a9516ec78490da03edccb&api_key=${apiKey}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch recently added items');

            const data = await response.json();
            console.log(data);

            if (JSON.stringify(data) === JSON.stringify(recentlyAddedItems)) {
                console.log("Recently added items have not changed. Skipping update.");
                return; // Do not update UI if no change
            }

            recentlyAddedItems = data;
            console.log(`Updated Recently Added - Found ${recentlyAddedItems.length} items.`);

            // Fetch detailed metadata for each item
            let detailedItems = [];
            for (let item of recentlyAddedItems) {
                const details = await this.fetchItemDetails(item.Id);
                if (details) {
                    detailedItems.push(details);
                }
            }

            this.recentlyAddedDetails = detailedItems;

            if (detailedItems.length > 0) {
                this.updateContentUI(detailedItems[0]); // Show first item
                this.startRecentlyAddedCycle(); // Start cycling
            } else {
                console.log('No detailed recently added items found.');
            }

        } catch (error) {
            console.error('Error fetching recently added items:', error);
        }
    },

    fetchItemDetails: async function (itemId) {
        try {
            const response = await fetch(`${serverUrl}/Items/${itemId}?userId=${userId}&api_key=${apiKey}`);
            if (!response.ok) throw new Error('Failed to fetch item details');

            return await response.json(); // Return detailed item data
        } catch (error) {
            console.error(`Error fetching details for item ${itemId}:`, error);
            return null;
        }
    },

    startRecentlyAddedTimer: function () {
        const intervalTime = moduleConfig.recentlyAddedCheckInterval || 3600000; // Default 60 mins
        console.log(`Starting Recently Added auto-refresh every ${intervalTime / 60000} minutes.`);

        setInterval(() => {
            this.fetchRecentlyAdded();
        }, intervalTime);
    },

    startRecentlyAddedCycle: function () {
        const cycleTime = moduleConfig.recentlyAddedCycleTime || 30000; // Default 30 seconds

        // Prevent duplicate intervals
        if (this.recentlyAddedInterval) {
            clearInterval(this.recentlyAddedInterval);
        }

        this.recentlyAddedInterval = setInterval(() => {
            if (!playbackActive && this.recentlyAddedDetails.length > 0) {
                recentlyAddedIndex = (recentlyAddedIndex + 1) % this.recentlyAddedDetails.length;
                this.fadeOutAndUpdate(recentlyAddedIndex);
            }
        }, cycleTime);

        console.log(`Started Recently Added cycling every ${cycleTime / 1000} seconds.`);
    },

    fadeOutAndUpdate: function (index) {
        const content = document.getElementById('MMM-Jellyfin-content');

        if (content) {
            content.style.transition = "opacity 1s ease-out"; // Smooth fade-out
            content.style.opacity = "0";

            setTimeout(() => {
                this.updateContentUI(this.recentlyAddedDetails[index]);

                content.style.transition = "opacity 1s ease-in"; // Smooth fade-in
                content.style.opacity = "1";
            }, 1000); // Wait 1s before switching content
        }
    },

    fetchAndDisplayItemDetails: async function (itemId, isRecentlyAdded = false) {
        try {
            const response = await fetch(`${serverUrl}/Items/${itemId}?userId=${userId}&api_key=${apiKey}`);
            if (!response.ok) throw new Error('Failed to fetch item details');

            const itemDetails = await response.json();
            this.updateContentUI(itemDetails, isRecentlyAdded);
        } catch (error) {
            console.error('Error fetching item details:', error);
        }
    },

    fetchAndDisplayPlayingItemDetails: async function (itemId) {
        try {
            const response = await fetch(`${serverUrl}/Items/${itemId}?userId=${userId}&api_key=${apiKey}`);
            if (!response.ok) throw new Error('Failed to fetch playing item details');

            const itemDetails = await response.json();
            this.updateContentUI(itemDetails);
        } catch (error) {
            console.error('Error fetching playing item details:', error);
        }
    },

    fetchSessionDetails: async function () {
        try {
            const response = await fetch(`${serverUrl}/Sessions?api_key=${apiKey}`);
            if (!response.ok) throw new Error('Failed to fetch session details');

            const data = await response.json();

            if (data.length > 0 && data[0].NowPlayingItem) {
                const newMediaId = data[0].NowPlayingItem.Id; // Get the currently playing media ID

                if (newMediaId !== this.currentPlayingMediaId) {
                    // If the media has changed, update the UI
                    console.log('Media has changed. Updating UI...');
                    this.currentPlayingMediaId = newMediaId; // Update stored media ID
                    await this.updateContentUI(data[0].NowPlayingItem); // Refresh the entire UI
                } else {
                    // Media hasn't changed; update only progress and playback details
                    console.log('Media unchanged. Updating progress...');
                    isPaused = data[0].PlayState.IsPaused;

                    const positionTicks = data[0].PlayState.PositionTicks;
                    const runTimeTicks = data[0].NowPlayingItem.RunTimeTicks;
                    currentProgress = Math.round((positionTicks / runTimeTicks) * 100);

                    const remainingTicks = runTimeTicks - positionTicks;
                    remainingTime = this.calculateRemainingTime(remainingTicks, data[0].NowPlayingItem.Type);

                    this.updateFooter(); // Update progress bar and remaining time
                }
            } else {
                // If no playing item is found, stop playback
                console.log('Playback has stopped.');
                this.managePlayback(false);
            }
        } catch (error) {
            console.error('Error fetching session details:', error);
        }
    },

    calculateRemainingTime: function (remainingTicks, mediaType) {
        if (mediaType === 'Audio') {
            const remainingMinutes = Math.floor(remainingTicks / 600000000);
            const remainingSeconds = Math.floor((remainingTicks % 600000000) / 10000000);
            return `${remainingMinutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
        } else if (mediaType === 'Movie') {
            const remainingHours = Math.floor(remainingTicks / 36000000000);
            const remainingMinutes = Math.floor((remainingTicks % 36000000000) / 600000000);

            return remainingHours > 0
                ? `${remainingHours}h ${remainingMinutes}m`
                : `${remainingMinutes}m`;
        } else {
            const remainingMinutes = Math.floor(remainingTicks / 600000000);
            const remainingSeconds = Math.floor((remainingTicks % 600000000) / 10000000);
            return `${remainingMinutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
        }
    },
});
