/**
 * VynoraApp — Playlist Manager
 * Developed by Kelompok ARENA
 */

export class PlaylistManager {
  constructor(playlistData = [], onSelectVideo = () => {}) {
    this.playlist = [...playlistData];
    this.currentIndex = 0;
    this.onSelectVideo = onSelectVideo;
    this.playlistContainer = document.getElementById("playlist-list");
    this.playlistCountEl = document.getElementById("playlist-count");
    this.emptyPlaylistEl = document.getElementById("empty-playlist");
  }

  getCurrentVideo() {
    if (this.playlist.length === 0) return null;
    return this.playlist[this.currentIndex] || null;
  }

  setCurrentIndex(index) {
    if (index >= 0 && index < this.playlist.length) {
      this.currentIndex = index;
      this.render();
      if (this.onSelectVideo) {
        this.onSelectVideo(this.getCurrentVideo(), this.currentIndex);
      }
    }
  }

  next(repeatMode = false) {
    if (this.playlist.length === 0) return null;
    if (this.currentIndex < this.playlist.length - 1) {
      this.currentIndex++;
    } else if (repeatMode) {
      this.currentIndex = 0;
    } else {
      return null; // Mencapai akhir playlist
    }
    this.render();
    return this.getCurrentVideo();
  }

  previous(repeatMode = false) {
    if (this.playlist.length === 0) return null;
    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else if (repeatMode) {
      this.currentIndex = this.playlist.length - 1;
    } else {
      this.currentIndex = 0; // Tetap di awal
    }
    this.render();
    return this.getCurrentVideo();
  }

  render() {
    if (!this.playlistContainer) return;

    if (this.playlistCountEl) {
      this.playlistCountEl.textContent = `${this.playlist.length} video`;
    }

    if (this.playlist.length === 0) {
      this.playlistContainer.innerHTML = "";
      if (this.emptyPlaylistEl) this.emptyPlaylistEl.classList.remove("hidden");
      return;
    }

    if (this.emptyPlaylistEl) this.emptyPlaylistEl.classList.add("hidden");

    this.playlistContainer.innerHTML = this.playlist
      .map((item, index) => {
        const isActive = index === this.currentIndex;
        return `
          <div class="playlist-item ${isActive ? "active" : ""}" data-index="${index}">
            <div class="playlist-thumb-box">
              <img src="${item.thumbnail}" alt="${item.title}" class="playlist-thumb" loading="lazy" />
              <span class="playlist-type-badge">${item.type}</span>
              ${isActive ? `
                <div class="playlist-item-playing-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </div>
              ` : ""}
            </div>
            <div class="playlist-item-details">
              <h4 class="playlist-item-title">${item.title}</h4>
              <div class="playlist-item-meta">
                <span class="playlist-item-channel">${item.channel}</span>
                <span>•</span>
                <span class="playlist-item-duration">${item.duration}</span>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    // Attach click events
    const items = this.playlistContainer.querySelectorAll(".playlist-item");
    items.forEach((el) => {
      el.addEventListener("click", () => {
        const idx = parseInt(el.getAttribute("data-index"), 10);
        this.setCurrentIndex(idx);
      });
    });
  }
}
