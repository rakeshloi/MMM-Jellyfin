getDom() {
  const wrapper = document.createElement("div");
  wrapper.className = "jellyfin-wrapper";

  if (this.offline) {
    return wrapper;
  }

  const item = this.nowPlaying || this.items[this.currentIndex];
  if (!item) {
    wrapper.innerHTML = "Loading Jellyfin data...";
    return wrapper;
  }

  const posterWrapper = document.createElement("div");
  posterWrapper.className = "jellyfin-poster";

  const poster = document.createElement("img");
  poster.src = item.poster || "";
  poster.style.width = "120px";
  poster.style.height = "200px";
  poster.style.objectFit = "cover";
  posterWrapper.appendChild(poster);

  const details = document.createElement("div");
  details.className = "jellyfin-details";

  const title = document.createElement("h2");
  title.textContent = item.title || "Untitled";
  title.style.fontSize = "0.9em";
  title.style.margin = "0 0 4px 0";
  details.appendChild(title);

  if (item.premiereDate) {
    const date = document.createElement("div");
    date.textContent = `Premiere: ${new Date(item.premiereDate).toLocaleDateString()}`;
    date.style.fontSize = "0.8em";
    date.style.color = "#ccc";
    date.style.marginBottom = "4px";
    details.appendChild(date);
  }

  if (item.officialRating) {
    const certificateImg = document.createElement("img");
    certificateImg.src = `modules/MMM-Jellyfin/certificates/${item.officialRating}.png`;
    certificateImg.alt = item.officialRating;
    certificateImg.className = "jellyfin-certificate";
    details.appendChild(certificateImg);
  }

  const overview = document.createElement("div");
  overview.className = "scrollable-overview";
  const overviewText = document.createElement("p");
  overviewText.textContent = item.overview || "No description available.";
  overview.appendChild(overviewText);
  details.appendChild(overview);

  wrapper.appendChild(posterWrapper);
  wrapper.appendChild(details);

  return wrapper;
}
