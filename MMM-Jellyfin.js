getDom() {
  const wrapper = document.createElement("div");
  wrapper.className = "jellyfin-wrapper";

  if (this.offline) {
    wrapper.innerHTML = "Jellyfin is offline...";
    return wrapper;
  }

  const item = this.nowPlaying || this.items[this.currentIndex];
  if (!item) {
    wrapper.innerHTML = "Loading Jellyfin data...";
    return wrapper;
  }

  const container = document.createElement("div");
  container.className = "jellyfin-container";

  // Poster section
  const posterWrapper = document.createElement("div");
  posterWrapper.style.display = "flex";
  posterWrapper.style.alignItems = "center";
  posterWrapper.style.marginRight = "10px";

  const poster = document.createElement("img");
  poster.className = "jellyfin-poster";
  poster.src = item.poster || "";
  posterWrapper.appendChild(poster);

  // Details section (title, premiere date, certificate, overview)
  const details = document.createElement("div");
  details.className = "jellyfin-details";

  // Movie title
  const title = document.createElement("div");
  title.className = "jellyfin-title";
  title.textContent = item.title || "Untitled";
  details.appendChild(title);

  // Premiere date
  if (item.premiereDate) {
    const date = document.createElement("div");
    date.className = "jellyfin-premiere-date";
    const formattedDate = new Date(item.premiereDate).toLocaleDateString();
    date.textContent = `Premiere: ${formattedDate}`;
    details.appendChild(date);
  }

  // Certificate image (if available)
  if (item.officialRating) {
    const certificateImg = document.createElement("img");
    certificateImg.className = "jellyfin-certificate";
    certificateImg.src = `modules/MMM-Jellyfin/certificates/${item.officialRating}.png`;
    certificateImg.alt = item.officialRating;
    details.appendChild(certificateImg);
  }

  // Overview (if available)
  const overview = document.createElement("div");
  overview.className = "scrollable-overview";

  const overviewText = document.createElement("p");
  overviewText.textContent = item.overview || "No description available.";

  // Save scroll position before rendering
  const currentScrollPosition = overview.scrollTop || 0;

  overview.appendChild(overviewText);
  details.appendChild(overview);

  // Only update if the overview text has changed
  if (this.previousOverview !== item.overview) {
    this.previousOverview = item.overview;
    this.scrollPosition = currentScrollPosition; // Preserve scroll position
  } else {
    // Restore previous scroll position if the overview content hasn't changed
    overview.scrollTop = this.scrollPosition || 0;
  }

  // Add the details and poster to the container
  container.appendChild(posterWrapper);
  container.appendChild(details);

  // Append the container to the wrapper
  wrapper.appendChild(container);

  return wrapper;
}
