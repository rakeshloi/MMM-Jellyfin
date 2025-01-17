getDom: function() {
  const wrapper = document.createElement("div");
  wrapper.className = "jellyfin-wrapper";

  if (this.offline) {
    return wrapper;
  }

  const item = this.nowPlaying || this.items[this.currentIndex];
  if (!item) {
    wrapper.innerHTML = "";
    return wrapper;
  }

  const container = document.createElement("div");
  container.className = "jellyfin-container";

  const poster = document.createElement("img");
  poster.className = "jellyfin-poster";
  poster.src = item.poster || "";
  container.appendChild(poster);

  const details = document.createElement("div");
  details.className = "jellyfin-details";

  const title = document.createElement("div");
  title.className = "jellyfin-title";
  title.textContent = item.title || "Untitled";
  details.appendChild(title);

  if (item.premiereDate) {
    const date = document.createElement("div");
    date.className = "jellyfin-premiere-date";
    const formattedDate = new Date(item.premiereDate).toLocaleDateString();
    date.textContent = `Premiere: ${formattedDate}`;
    details.appendChild(date);
  }

  if (item.officialRating) {
    const certificateImg = document.createElement("img");
    certificateImg.className = "jellyfin-certificate";
    certificateImg.src = `modules/MMM-Jellyfin/certificates/${item.officialRating}.png`;
    certificateImg.alt = item.officialRating;
    details.appendChild(certificateImg);
  }

  if (item.overview) {
    const overview = document.createElement("div");
    overview.className = "scrollable-overview";

    const overviewText = document.createElement("p");
    overviewText.textContent = item.overview || "No description available.";
    overview.appendChild(overviewText);
    details.appendChild(overview);

    // Temporarily add to DOM to measure height
    wrapper.appendChild(container);
    document.body.appendChild(wrapper);

    // Calculate line height and maximum allowed height
    const lineHeight = parseFloat(getComputedStyle(overviewText).lineHeight);
    const maxAllowedHeight = lineHeight * 4;

    // Check if the content exceeds 4 lines
    if (overviewText.scrollHeight > maxAllowedHeight) {
      overviewText.classList.add("scrollable-content");
    } else {
      overviewText.classList.remove("scrollable-content");
    }

    // Remove from DOM after measurement
    document.body.removeChild(wrapper);
  }

  container.appendChild(details);
  wrapper.appendChild(container);
  return wrapper;
}
