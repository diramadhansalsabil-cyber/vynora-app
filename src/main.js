/**
 * VynoraApp — Main Application Orchestrator (GoTube Clean Edition)
 * Developed by Kelompok ARENA
 * Tagline: "Your Visual World, One Tap Away."
 */

import { UnifiedVideoPlayer } from "./player.js";
import { renderTeamSection } from "./team.js";
import { initialPlaylist, defaultSettings } from "./data/config.js";
import { upload as uploadToVercelBlob } from "@vercel/blob/client";

document.addEventListener("DOMContentLoaded", () => {
  /* ========================================================================
     STATE VARIABLES
     ======================================================================== */
  let playlist = [...initialPlaylist];
  let currentIndex = 0;
  let activeCategory = "all";
  let settings = { ...defaultSettings };
  let isScrubbing = false;
  let isMiniPlayerVisible = true;

  /* ========================================================================
     DOM ELEMENTS
     ======================================================================== */
  // Status Bar & Header
  const statusClock = document.getElementById("status-clock");
  const searchInput = document.getElementById("search-input");
  const catChips = document.querySelectorAll(".cat-chip");
  const btnProfile = document.getElementById("btn-profile");
  const addVideoDialog = document.getElementById("add-video-dialog");
  const addVideoForm = document.getElementById("add-video-form");
  const addVideoError = document.getElementById("add-video-error");
  const addVideoSubmit = document.getElementById("btn-submit-video");
  const addVideoName = document.getElementById("add-video-name");
  const addVideoChannel = document.getElementById("add-video-channel");
  const addVideoCategory = document.getElementById("add-video-category");
  const addVideoCaption = document.getElementById("add-video-caption");
  const addVideoLink = document.getElementById("add-video-link");
  const addVideoFile = document.getElementById("add-video-file");
  const addVideoLinkField = document.getElementById("add-video-link-field");
  const addVideoFileField = document.getElementById("add-video-file-field");
  const addLinkTab = document.getElementById("tab-add-link");
  const addUploadTab = document.getElementById("tab-add-upload");
  let addVideoMode = "link";

  // Views & Tabs
  const bottomTabs = document.querySelectorAll(".gotube-tab");
  const viewSections = document.querySelectorAll(".view-section");
  const videoGrid = document.getElementById("video-grid");
  const verticalPlaylist = document.getElementById("vertical-playlist");
  const playlistTotalCount = document.getElementById("playlist-total-count");
  const downloadList = document.getElementById("download-list");
  const downloadTotalCount = document.getElementById("download-total-count");
  const downloadsEmpty = document.getElementById("downloads-empty");

  // Mini Player
  const miniPlayer = document.getElementById("mini-player");
  const miniThumb = document.getElementById("mini-thumb");
  const miniTitle = document.getElementById("mini-title");
  const miniChannel = document.getElementById("mini-channel");
  const miniBtnPlayPause = document.getElementById("mini-btn-play-pause");
  const miniIconPlay = document.getElementById("mini-icon-play");
  const miniIconPause = document.getElementById("mini-icon-pause");
  const miniBtnClose = document.getElementById("mini-btn-close");
  const miniOpenDetail = document.getElementById("mini-open-detail");
  const miniOpenDetailText = document.getElementById("mini-open-detail-text");

  // Watch Detail Overlay (Gambar 2)
  const watchOverlay = document.getElementById("watch-overlay");
  const btnMinimizeWatch = document.getElementById("btn-minimize-watch");
  const videoTitle = document.getElementById("video-title");
  const watchCaption = document.getElementById("watch-caption");
  const videoViewsDate = document.getElementById("video-views-date");
  const videoChannel = document.getElementById("video-channel");
  const creatorAvatar = document.getElementById("creator-avatar");
  const likeCount = document.getElementById("like-count");
  const watchLikeBtn = document.getElementById("watch-like-btn");
  const recList = document.getElementById("rec-list");
  const tiktokOpenLinkWrap = document.getElementById("tiktok-open-link-wrap");
  const tiktokOpenLink = document.getElementById("tiktok-open-link");

  // Watch Controls
  const btnPlayPause = document.getElementById("btn-play-pause");
  const iconPlay = document.getElementById("icon-play");
  const iconPause = document.getElementById("icon-pause");
  const btnPrevious = document.getElementById("btn-previous");
  const btnNext = document.getElementById("btn-next");
  const btnStop = document.getElementById("btn-stop");
  const btnRepeat = document.getElementById("btn-repeat");
  const progressSlider = document.getElementById("progress-slider");
  const timeCurrent = document.getElementById("time-current");
  const timeDuration = document.getElementById("time-duration");
  const retryBtn = document.getElementById("retry-btn");

  // Action Bar Buttons
  const actPlaylist = document.getElementById("act-playlist");
  const actPower = document.getElementById("act-power");
  const actPip = document.getElementById("act-pip");
  const actShare = document.getElementById("act-share");
  const actMute = document.getElementById("act-mute");
  const watchVolIcon = document.getElementById("watch-vol-icon");
  const watchVolLabel = document.getElementById("watch-vol-label");
  const btnSub = document.getElementById("btn-sub");

  // Toast
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");

  /* ========================================================================
     HELPERS
     ======================================================================== */
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  function showToast(msg, duration = 2000) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = msg;
    toast.classList.remove("hidden");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.add("hidden");
    }, duration);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  // Update real-time clock
  function updateClock() {
    if (!statusClock) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    statusClock.textContent = `${h}:${m}`;
  }
  updateClock();
  setInterval(updateClock, 10000);

  /* ========================================================================
     PLAYER INSTANTIATION
     ======================================================================== */
  const player = new UnifiedVideoPlayer({
    initialVolume: settings.defaultVolume,
    onStateChange: (state) => {
      const isPlaying = state === "playing";

      // Sinkronisasi ikon tombol play/pause di Watch view
      if (iconPlay && iconPause) {
        if (isPlaying) {
          iconPlay.classList.add("hidden");
          iconPause.classList.remove("hidden");
        } else {
          iconPlay.classList.remove("hidden");
          iconPause.classList.add("hidden");
        }
      }

      // Sinkronisasi ikon di Mini player
      if (miniIconPlay && miniIconPause) {
        if (isPlaying) {
          miniIconPlay.classList.add("hidden");
          miniIconPause.classList.remove("hidden");
        } else {
          miniIconPlay.classList.remove("hidden");
          miniIconPause.classList.add("hidden");
        }
      }
    },
    onTimeUpdate: (currentTime, duration, percent) => {
      if (!isScrubbing) {
        if (progressSlider) progressSlider.value = percent;
        if (timeCurrent) timeCurrent.textContent = formatTime(currentTime);
        if (timeDuration && duration > 0) timeDuration.textContent = formatTime(duration);
      }
    },
    onEnded: () => {
      moveCurrentVideoToTop();
      if (settings.autoplayNext) {
        nextVideo();
      }
    },
    onError: () => {
      showToast("Gagal memuat video");
    }
  });

  /* ========================================================================
     PLAYLIST & VIDEO SELECTION LOGIC
     ======================================================================== */
  function getCurrentVideo() {
    return playlist[currentIndex] || playlist[0];
  }

  function renderVideoThumbnail(video, className) {
    if (video.thumbnail) {
      return `<img src="${escapeHTML(video.thumbnail)}" class="${className}" alt="${escapeHTML(video.title)}" loading="lazy" />`;
    }

    if (video.type === "mp4") {
      return `<div class="${className} local-video-cover" aria-label="Video lokal">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5.5v13l10-6.5-10-6.5Z"></path>
        </svg>
        <span>VIDEO LOKAL</span>
      </div>`;
    }

    if (video.embedUrl) {
      return `<iframe
        class="${className} tiktok-thumbnail"
        src="${escapeHTML(video.embedUrl)}"
        title="Pratinjau video ${escapeHTML(video.type)}: ${escapeHTML(video.title)}"
        loading="lazy"
        tabindex="-1"
        aria-hidden="true"
      ></iframe>`;
    }

    return `<img src="${escapeHTML(video.thumbnail)}" class="${className}" alt="${escapeHTML(video.title)}" loading="lazy" />`;
  }

  function selectVideo(index, autoPlay = true, openDetail = true) {
    if (index < 0 || index >= playlist.length) return;
    currentIndex = index;
    const video = playlist[currentIndex];

    // Update Mini Player UI
    if (miniThumb) miniThumb.src = video.thumbnail || "/vynora-mark.png";
    if (miniTitle) miniTitle.textContent = video.title;
    if (miniChannel) miniChannel.textContent = video.channel;
    if (miniPlayer) miniPlayer.classList.remove("hidden");
    const usesSocialEmbed = ["tiktok", "instagram", "facebook", "vimeo"].includes(video.type);
    if (miniPlayer) miniPlayer.classList.toggle("tiktok-mode", usesSocialEmbed);

    // Update Watch Overlay Detail UI (Gambar 2)
    if (watchOverlay) {
      watchOverlay.classList.toggle("social-embed-mode", usesSocialEmbed);
      watchOverlay.classList.toggle("tiktok-mode", ["tiktok", "instagram"].includes(video.type));
    }
    if (videoTitle) videoTitle.textContent = video.title;
    if (watchCaption) {
      watchCaption.textContent = video.caption || video.description || "";
      watchCaption.classList.toggle("hidden", !watchCaption.textContent);
    }
    if (videoViewsDate) videoViewsDate.textContent = `${video.views} • ${video.date}`;
    if (videoChannel) videoChannel.textContent = video.channel;
    if (creatorAvatar) creatorAvatar.src = video.avatar || video.thumbnail || "/vynora-mark.png";
    if (likeCount) likeCount.textContent = video.likes || "4.9k";
    if (tiktokOpenLink) {
      tiktokOpenLink.href = video.sourceUrl || "#";
      tiktokOpenLink.textContent = `Buka video di ${video.type === "tiktok" ? "TikTok" : video.type[0].toUpperCase() + video.type.slice(1)}`;
    }
    if (tiktokOpenLinkWrap) tiktokOpenLinkWrap.classList.toggle("hidden", !video.sourceUrl || video.type === "mp4");

    // Muat ke Unified Player
    player.loadVideo(video, autoPlay);

    // Buka detail view jika diminta
    if (openDetail && watchOverlay) {
      watchOverlay.classList.remove("hidden");
    }

    renderRecommendations();
    renderVerticalPlaylist();
  }

  function nextVideo() {
    let nextIdx = currentIndex + 1;
    if (nextIdx >= playlist.length) {
      if (settings.repeatPlaylist) {
        nextIdx = 0;
      } else {
        showToast("Akhir playlist");
        return;
      }
    }
    selectVideo(nextIdx, true, false);
    showToast(`Memutar: ${playlist[nextIdx].title}`);
  }

  function moveCurrentVideoToTop() {
    if (currentIndex <= 0 || currentIndex >= playlist.length) return;

    const [completedVideo] = playlist.splice(currentIndex, 1);
    playlist.unshift(completedVideo);
    currentIndex = 0;
    renderHomeGrid(searchInput ? searchInput.value : "");
    renderVerticalPlaylist();
    renderDownloads();
    renderRecommendations();
  }

  function prevVideo() {
    if (player.getCurrentTime() > 3) {
      player.seekTo(0);
      showToast("Mengulang dari awal");
      return;
    }
    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) {
      prevIdx = settings.repeatPlaylist ? playlist.length - 1 : 0;
    }
    selectVideo(prevIdx, true, false);
    showToast(`Memutar: ${playlist[prevIdx].title}`);
  }

  /* ========================================================================
     RENDERING FUNCTIONS
     ======================================================================== */
  // 1. Render 2-Column Home Grid (Gambar 1)
  function renderHomeGrid(filterText = "") {
    if (!videoGrid) return;

    let items = playlist;
    if (activeCategory !== "all") {
      items = items.filter(v => v.category === activeCategory);
    }
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      items = items.filter((video) => [
        video.title,
        video.channel,
        video.caption,
        video.contentCategory,
        video.description
      ].some((value) => String(value || "").toLowerCase().includes(q)));
    }

    videoGrid.innerHTML = items
      .map((vid) => {
        const actualIndex = playlist.findIndex(p => p.id === vid.id);
        const catBadge = vid.type === "tiktok" ? "TIKTOK" : (vid.type === "mp4" ? "MP4" : "YT");
        let badgeColor = "#2563eb";
        if (vid.category === "film") badgeColor = "#dc2626";
        else if (vid.category === "drama") badgeColor = "#9333ea";
        else if (vid.category === "comedy") badgeColor = "#f59e0b";
        else if (vid.category === "pop") badgeColor = "#0891b2";
        else if (vid.category === "sad") badgeColor = "#475569";
        else if (vid.category === "dj") badgeColor = "#e11d48";
        else if (vid.type === "mp4") badgeColor = "#16a34a";

        return `
          <div class="grid-card" data-idx="${actualIndex}">
            <div class="grid-thumb-box ${["tiktok", "instagram", "facebook", "vimeo"].includes(vid.type) || vid.type === "mp4" ? "tiktok-cover-box" : ""}">
              ${renderVideoThumbnail(vid, "grid-thumb")}
              ${vid.duration ? `<span class="grid-duration">${vid.duration}</span>` : ""}
              <span class="grid-source-badge" style="background:${badgeColor};">${catBadge}</span>
            </div>
            <div class="grid-meta">
              <img src="${escapeHTML(vid.avatar || vid.thumbnail || "/vynora-mark.png")}" class="grid-avatar" alt="Avatar" />
              <div class="grid-info">
                <h4 class="grid-title">${escapeHTML(vid.title)}</h4>
                <p class="grid-channel">${escapeHTML(vid.channel)}</p>
                <p class="grid-caption">${escapeHTML(vid.caption || vid.description || "")}</p>
                <span class="content-category-badge">${escapeHTML(vid.contentCategory || "lainnya")}</span>
              </div>
              <span class="grid-more-btn">⋮</span>
            </div>
          </div>
        `;
      })
      .join("");

    // Klik card untuk memutar & membuka Watch Overlay
    videoGrid.querySelectorAll(".grid-card").forEach((card) => {
      card.addEventListener("click", () => {
        const idx = parseInt(card.getAttribute("data-idx"), 10);
        selectVideo(idx, true, true);
      });
    });
  }

  // 2. Render Vertical List di My Video / Playlist tab
  function renderVerticalPlaylist() {
    if (!verticalPlaylist) return;
    if (playlistTotalCount) playlistTotalCount.textContent = `${playlist.length} Video Tersedia`;

    verticalPlaylist.innerHTML = playlist
      .map((vid, index) => {
        const isCurrent = index === currentIndex;
        return `
          <div class="vlist-item${isCurrent ? " is-current" : ""}" data-idx="${index}">
            <div class="vlist-thumb-box">
              ${renderVideoThumbnail(vid, "vlist-thumb")}
              ${vid.duration ? `<span class="vlist-duration">${vid.duration}</span>` : ""}
            </div>
            <div class="vlist-details">
              <h4 class="vlist-title">${escapeHTML(vid.title)}</h4>
              <p class="vlist-channel">${escapeHTML(vid.channel)}</p>
              <span class="vlist-stats">${escapeHTML(vid.contentCategory || "lainnya")} • ${escapeHTML(vid.caption || vid.views)}</span>
            </div>
            <span class="grid-more-btn">⋮</span>
          </div>
        `;
      })
      .join("");

    verticalPlaylist.querySelectorAll(".vlist-item").forEach((item) => {
      item.addEventListener("click", () => {
        const idx = parseInt(item.getAttribute("data-idx"), 10);
        selectVideo(idx, true, true);
      });
    });
  }

  function renderDownloads() {
    if (!downloadList) return;
    const availableVideos = playlist
      .map((video, index) => ({ video, index }))
      .filter(({ video }) => (video.type === "mp4" && video.src) || video.sourceUrl);

    if (downloadTotalCount) {
      const localCount = availableVideos.filter(({ video }) => video.type === "mp4").length;
      downloadTotalCount.textContent = `${availableVideos.length} Video • ${localCount} MP4`;
    }
    if (downloadsEmpty) {
      downloadsEmpty.classList.toggle("hidden", availableVideos.length > 0);
    }

    downloadList.innerHTML = availableVideos
      .map(({ video, index }) => {
        const isLocalVideo = video.type === "mp4";
        const platformName = video.type === "tiktok" ? "TikTok" : video.type[0].toUpperCase() + video.type.slice(1);
        const action = isLocalVideo
          ? `<a class="download-action" href="${escapeHTML(video.downloadUrl || video.src)}" download="${escapeHTML(video.id || "vynora-video")}.mp4" aria-label="Unduh ${escapeHTML(video.title)}" title="Unduh video">`
          : `<a class="download-action source-action" href="${escapeHTML(video.sourceUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Buka ${escapeHTML(video.title)} di ${escapeHTML(platformName)}" title="Buka di ${escapeHTML(platformName)}">`;
        const actionIcon = isLocalVideo
          ? `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5M12 15V3"></path>`
          : `<path d="M14 3h7v7"></path><path d="M10 14 21 3"></path><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"></path>`;
        return `
        <div class="vlist-item download-item" data-idx="${index}">
          <div class="vlist-thumb-box">
            ${renderVideoThumbnail(video, "vlist-thumb")}
            ${video.duration ? `<span class="vlist-duration">${escapeHTML(video.duration)}</span>` : ""}
          </div>
          <div class="vlist-details">
            <h4 class="vlist-title">${escapeHTML(video.title)}</h4>
            <p class="vlist-channel">${escapeHTML(video.channel)}</p>
            <span class="vlist-stats">${escapeHTML(video.contentCategory || "lainnya")} • ${isLocalVideo ? "MP4 siap diunduh" : `Buka di ${escapeHTML(platformName)}`}</span>
          </div>
          ${action}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${actionIcon}</svg>
          </a>
        </div>
      `;
      })
      .join("");

    downloadList.querySelectorAll(".download-item").forEach((item) => {
      item.addEventListener("click", (event) => {
        if (event.target.closest(".download-action")) return;
        const index = Number(item.getAttribute("data-idx"));
        selectVideo(index, true, true);
      });
    });
  }

  // 3. Render Rekomendasi di Bawah Player pada Watch View (Gambar 2)
  function renderRecommendations() {
    if (!recList) return;

    const otherVideos = playlist.filter((_, idx) => idx !== currentIndex);
    recList.innerHTML = otherVideos
      .map((vid) => {
        const actualIdx = playlist.findIndex(p => p.id === vid.id);
        return `
          <div class="rec-item" data-idx="${actualIdx}">
            <div class="vlist-thumb-box">
              ${renderVideoThumbnail(vid, "vlist-thumb")}
              ${vid.duration ? `<span class="vlist-duration">${vid.duration}</span>` : ""}
            </div>
            <div class="vlist-details">
              <h4 class="vlist-title">${escapeHTML(vid.title)}</h4>
              <p class="vlist-channel">${escapeHTML(vid.channel)}</p>
              <span class="vlist-stats">${escapeHTML(vid.views)} • ${escapeHTML(vid.date)}</span>
            </div>
            <span class="grid-more-btn">⋮</span>
          </div>
        `;
      })
      .join("");

    recList.querySelectorAll(".rec-item").forEach((item) => {
      item.addEventListener("click", () => {
        const idx = parseInt(item.getAttribute("data-idx"), 10);
        selectVideo(idx, true, false);
      });
    });
  }

  /* ========================================================================
     EVENT LISTENERS & CONTROLS
     ======================================================================== */
  // Mini Player Events
  if (miniBtnPlayPause) {
    miniBtnPlayPause.addEventListener("click", (e) => {
      e.stopPropagation();
      if (player.isPlaying) {
        player.pause();
        showToast("Dijeda");
      } else {
        player.play();
        showToast("Diputar");
      }
    });
  }

  if (miniBtnClose) {
    miniBtnClose.addEventListener("click", (e) => {
      e.stopPropagation();
      player.stop();
      if (miniPlayer) miniPlayer.classList.add("hidden");
    });
  }

  if (miniOpenDetail) {
    miniOpenDetail.addEventListener("click", () => {
      if (watchOverlay) watchOverlay.classList.remove("hidden");
    });
  }
  if (miniOpenDetailText) {
    miniOpenDetailText.addEventListener("click", () => {
      if (watchOverlay) watchOverlay.classList.remove("hidden");
    });
  }

  // Watch Sheet Minimize Button (Kembali ke Feed, Mini Player tetap berjalan)
  if (btnMinimizeWatch) {
    btnMinimizeWatch.addEventListener("click", () => {
      moveCurrentVideoToTop();
      if (watchOverlay) watchOverlay.classList.add("hidden");
      if (miniPlayer) miniPlayer.classList.remove("hidden");
    });
  }

  // Watch Sheet Playback Controls
  if (btnPlayPause) {
    btnPlayPause.addEventListener("click", () => {
      if (player.isPlaying) {
        player.pause();
        showToast("Dijeda");
      } else {
        player.play();
        showToast("Diputar");
      }
    });
  }

  if (btnStop) {
    btnStop.addEventListener("click", () => {
      player.stop();
      if (progressSlider) progressSlider.value = 0;
      if (timeCurrent) timeCurrent.textContent = "00:00";
      showToast("Berhenti (Reset ke awal)");
    });
  }

  if (btnNext) {
    btnNext.addEventListener("click", () => {
      nextVideo();
    });
  }

  if (btnPrevious) {
    btnPrevious.addEventListener("click", () => {
      prevVideo();
    });
  }

  if (btnRepeat) {
    btnRepeat.addEventListener("click", () => {
      settings.repeatPlaylist = !settings.repeatPlaylist;
      btnRepeat.classList.toggle("active", settings.repeatPlaylist);
      showToast(`Repeat: ${settings.repeatPlaylist ? "Aktif" : "Nonaktif"}`);
    });
  }

  // Progress Bar Scrubbing
  if (progressSlider) {
    progressSlider.addEventListener("input", (e) => {
      isScrubbing = true;
      const val = parseFloat(e.target.value);
      const dur = player.getDuration();
      if (dur > 0 && timeCurrent) {
        timeCurrent.textContent = formatTime((val / 100) * dur);
      }
    });

    progressSlider.addEventListener("change", (e) => {
      const val = parseFloat(e.target.value);
      player.seekTo(val);
      isScrubbing = false;
    });
  }

  // Action Buttons
  if (watchLikeBtn) {
    let liked = false;
    watchLikeBtn.addEventListener("click", () => {
      liked = !liked;
      watchLikeBtn.style.color = liked ? "#2563eb" : "";
      if (likeCount) likeCount.textContent = liked ? "5.0k" : "4.9k";
      showToast(liked ? "Disukai 👍" : "Batal menyukai");
    });
  }

  if (actMute) {
    actMute.addEventListener("click", () => {
      const isMuted = player.toggleMute();
      if (watchVolLabel) watchVolLabel.textContent = isMuted ? "Muted" : "Volume";
      showToast(isMuted ? "Audio dibisukan" : "Audio aktif");
    });
  }

  if (actPlaylist) {
    actPlaylist.addEventListener("click", () => {
      showToast("Tersimpan ke Playlist Favorit");
    });
  }

  if (actPower) {
    actPower.addEventListener("click", () => {
      showToast("Mode hemat daya (Audio aktif di latar)");
    });
  }

  if (actPip) {
    actPip.addEventListener("click", () => {
      if (watchOverlay) watchOverlay.classList.add("hidden");
      showToast("Beralih ke mode Mini Player");
    });
  }

  if (actShare) {
    actShare.addEventListener("click", () => {
      navigator.clipboard?.writeText(window.location.href);
      showToast("Tautan disalin ke papan klip!");
    });
  }

  if (btnSub) {
    let subbed = false;
    btnSub.addEventListener("click", () => {
      subbed = !subbed;
      btnSub.textContent = subbed ? "Subscribed" : "Subscribe";
      btnSub.style.backgroundColor = subbed ? "#64748b" : "#0f172a";
      showToast(subbed ? "Berlangganan Kelompok ARENA" : "Batal berlangganan");
    });
  }

  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      showToast("Mencoba memuat ulang video...");
      player.retry();
    });
  }

  // Category Tabs Filter
  catChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      catChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      activeCategory = chip.getAttribute("data-cat");
      renderHomeGrid(searchInput ? searchInput.value : "");
    });
  });

  // Search Input Filter
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      renderHomeGrid(e.target.value);
    });
  }

  // Bottom Navigation Switcher
  bottomTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-tab");

      bottomTabs.forEach((t) => t.classList.remove("active"));
      viewSections.forEach((s) => s.classList.remove("active"));

      tab.classList.add("active");
      const targetSection = document.getElementById(`view-${target}`);
      if (targetSection) targetSection.classList.add("active");

      // Kontrol visibilitas Header & Category Bar
      const gotubeHeader = document.getElementById("gotube-header");
      const categoryTabs = document.getElementById("category-tabs");

      if (target === "about") {
        // Saat membuka halaman profil, sembunyikan header search dan category bar
        if (gotubeHeader) gotubeHeader.classList.add("hidden");
        if (categoryTabs) categoryTabs.classList.add("hidden");
      } else if (target !== "home") {
        if (gotubeHeader) gotubeHeader.classList.remove("hidden");
        if (categoryTabs) categoryTabs.classList.add("hidden");
      } else {
        // Kembali ke Home
        if (gotubeHeader) gotubeHeader.classList.remove("hidden");
        if (categoryTabs) categoryTabs.classList.remove("hidden");
      }

      // Jika dari detail, tutup drawer saat ganti tab
      if (watchOverlay && !watchOverlay.classList.contains("hidden")) {
        moveCurrentVideoToTop();
      }
      if (watchOverlay) watchOverlay.classList.add("hidden");
      if (target === "downloads") renderDownloads();
    });
  });

  if (btnProfile) {
    btnProfile.addEventListener("click", () => {
      const aboutTab = document.getElementById("tab-about");
      if (aboutTab) aboutTab.click();
    });
  }

  const btnProfileBack = document.getElementById("btn-profile-back");
  if (btnProfileBack) {
    btnProfileBack.addEventListener("click", () => {
      const homeTab = document.getElementById("tab-home");
      if (homeTab) homeTab.click();
    });
  }

  function setAddVideoMode(mode) {
    addVideoMode = mode;
    const isLinkMode = mode === "link";
    addLinkTab.classList.toggle("active", isLinkMode);
    addUploadTab.classList.toggle("active", !isLinkMode);
    addLinkTab.setAttribute("aria-selected", String(isLinkMode));
    addUploadTab.setAttribute("aria-selected", String(!isLinkMode));
    addVideoLinkField.classList.toggle("hidden", !isLinkMode);
    addVideoFileField.classList.toggle("hidden", isLinkMode);
    addVideoLink.required = isLinkMode;
    addVideoFile.required = !isLinkMode;
    if (addVideoError) addVideoError.classList.add("hidden");
  }

  document.getElementById("btn-add-video")?.addEventListener("click", () => {
    addVideoDialog.showModal();
  });
  document.getElementById("btn-close-add-video")?.addEventListener("click", () => {
    addVideoDialog.close();
  });
  addLinkTab?.addEventListener("click", () => setAddVideoMode("link"));
  addUploadTab?.addEventListener("click", () => setAddVideoMode("upload"));

  async function createFirstFrameCover(file) {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    try {
      const loaded = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Video tidak dapat dibaca untuk membuat sampul.")), 15000);
        video.addEventListener("loadeddata", () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
        video.addEventListener("error", () => {
          clearTimeout(timeout);
          reject(new Error("Video tidak dapat dibaca. Pastikan file MP4 dapat diputar."));
        }, { once: true });
      });
      video.src = objectUrl;
      await loaded;

      if (!video.videoWidth || !video.videoHeight) {
        throw new Error("Video tidak memiliki frame gambar yang dapat digunakan sebagai sampul.");
      }

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Browser tidak dapat membuat gambar sampul.");
      for (const maxWidth of [480, 360, 240]) {
        const scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const cover = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
        if (cover && cover.size <= 512 * 1024) return cover;
      }
      throw new Error("Sampul video terlalu besar untuk diunggah.");
    } finally {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    }
  }

  addVideoForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!addVideoForm.reportValidity()) return;

    const title = addVideoName.value.trim();
    const channel = addVideoChannel.value.trim();
    const contentCategory = addVideoCategory.value;
    const caption = addVideoCaption.value.trim();

    addVideoError.classList.add("hidden");
    addVideoSubmit.disabled = true;
    addVideoSubmit.textContent = "Mengirim...";

    try {
      let response;
      if (addVideoMode === "link") {
        response = await fetch("/api/videos/social", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: addVideoLink.value.trim(), title, channel, contentCategory, caption })
        });
      } else {
        const file = addVideoFile.files[0];
        if (!file || !file.name.toLowerCase().endsWith(".mp4") || file.size > 50 * 1024 * 1024) {
          throw new Error("Pilih file MP4 dengan ukuran maksimum 50 MB.");
        }
        addVideoSubmit.textContent = "Membuat sampul...";
        const cover = await createFirstFrameCover(file);
        if (import.meta.env.VERCEL_BLOB_ENABLED) {
          const uploadId = crypto.randomUUID();
          addVideoSubmit.textContent = "Mengunggah ke penyimpanan...";
          const [videoBlob, coverBlob] = await Promise.all([
            uploadToVercelBlob(`uploads/${uploadId}-video.mp4`, file, {
              access: "public",
              handleUploadUrl: "/api/videos/upload",
              clientPayload: JSON.stringify({ uploadId, kind: "video" }),
              contentType: "video/mp4",
              multipart: true
            }),
            uploadToVercelBlob(`uploads/${uploadId}-cover.jpg`, cover, {
              access: "public",
              handleUploadUrl: "/api/videos/upload",
              clientPayload: JSON.stringify({ uploadId, kind: "cover" }),
              contentType: "image/jpeg"
            })
          ]);
          addVideoSubmit.textContent = "Menyimpan detail video...";
          response = await fetch("/api/videos/upload-complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uploadId,
              title,
              channel,
              contentCategory,
              caption,
              videoUrl: videoBlob.url,
              thumbnailUrl: coverBlob.url
            })
          });
        } else {
          const upload = new FormData();
          upload.append("title", title);
          upload.append("channel", channel);
          upload.append("contentCategory", contentCategory);
          upload.append("caption", caption);
          upload.append("video", file, file.name);
          upload.append("thumbnail", cover, "first-frame.jpg");
          addVideoSubmit.textContent = "Mengunggah video...";
          response = await fetch("/api/videos/upload", {
            method: "POST",
            body: upload
          });
        }
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Video gagal ditambahkan.");
      playlist.push(result);
      addVideoDialog.close();
      addVideoForm.reset();
      setAddVideoMode("link");
      activeCategory = "all";
      if (searchInput) searchInput.value = "";
      catChips.forEach((chip) => chip.classList.toggle("active", chip.dataset.cat === "all"));
      renderHomeGrid();
      renderVerticalPlaylist();
      renderDownloads();
      selectVideo(playlist.length - 1, true, true);
      showToast("Video berhasil ditambahkan ke feed.");
    } catch (error) {
      addVideoError.textContent = error.message || "Tidak dapat mengirim video. Periksa koneksi server.";
      addVideoError.classList.remove("hidden");
    } finally {
      addVideoSubmit.disabled = false;
      addVideoSubmit.textContent = "Tambahkan ke feed";
    }
  });

  async function loadSharedVideos() {
    try {
      const response = await fetch("/api/videos");
      if (!response.ok) throw new Error(`Video list request returned ${response.status}`);
      const sharedVideos = await response.json();
      if (!Array.isArray(sharedVideos)) throw new Error("Video list response is not an array.");
      const knownIds = new Set(playlist.map((video) => video.id));
      playlist.push(...sharedVideos.filter((video) => video && !knownIds.has(video.id)));
      renderHomeGrid(searchInput ? searchInput.value : "");
      renderVerticalPlaylist();
      renderDownloads();
      renderRecommendations();
    } catch (error) {
      console.error("Could not load shared videos:", error);
    }
  }

  /* ========================================================================
     INITIAL SETUP
     ======================================================================== */
  renderHomeGrid();
  renderVerticalPlaylist();
  renderTeamSection();

  // Inisialisasi video pertama di mini player tanpa autoplay otomatis agar browser tidak menolak
  selectVideo(0, false, false);
  loadSharedVideos();
});
