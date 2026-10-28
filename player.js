/**
 * VynoraApp — Unified Video Player Controller
 * Developed by Kelompok ARENA
 * 
 * Mengatur pemutaran video TikTok, YouTube, dan HTML5 secara terpadu.
 */

export class UnifiedVideoPlayer {
  constructor(options = {}) {
    this.html5Video = document.getElementById("html5-player");
    this.ytContainer = document.getElementById("youtube-player-container");
    this.tiktokContainer = document.getElementById("tiktok-player-container");
    this.tiktokFrame = document.getElementById("tiktok-player");
    this.overlayLoading = document.getElementById("overlay-loading");
    this.overlayError = document.getElementById("overlay-error");
    this.errorMessage = document.getElementById("error-message");
    this.overlayPlayBtn = document.getElementById("overlay-play-btn");
    this.videoContainer = document.getElementById("video-container");

    this.onStateChange = options.onStateChange || (() => {});
    this.onTimeUpdate = options.onTimeUpdate || (() => {});
    this.onEnded = options.onEnded || (() => {});
    this.onError = options.onError || (() => {});

    this.currentMode = "html5"; // 'html5' | 'youtube' | 'tiktok'
    this.currentVideo = null;
    this.ytPlayer = null;
    this.ytReady = false;
    this.ytApiLoading = false;
    this.ytTimer = null;
    this.isPlaying = false;
    this.volume = options.initialVolume ?? 0.8;
    this.isMuted = false;

    this.initHTML5Events();
    this.initTapToPlay();
  }

  /* ========================================================================
     TAP TO PLAY ON VIDEO CONTAINER
     ======================================================================== */
  initTapToPlay() {
    if (this.overlayPlayBtn) {
      this.overlayPlayBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.play();
      });
    }

    if (this.videoContainer) {
      this.videoContainer.addEventListener("click", () => {
        if (this.currentMode === "html5") {
          if (this.isPlaying) {
            this.pause();
          } else {
            this.play();
          }
        }
      });
    }
  }

  /* ========================================================================
     HTML5 VIDEO CONTROLLER
     ======================================================================== */
  initHTML5Events() {
    if (!this.html5Video) return;

    this.html5Video.volume = this.volume;

    this.html5Video.addEventListener("waiting", () => {
      this.showLoading(true);
      this.onStateChange("buffering");
    });

    this.html5Video.addEventListener("canplay", () => {
      this.showLoading(false);
      this.hideError();
    });

    this.html5Video.addEventListener("playing", () => {
      this.showLoading(false);
      this.hidePlayOverlay();
      this.isPlaying = true;
      this.onStateChange("playing");
    });

    this.html5Video.addEventListener("pause", () => {
      this.isPlaying = false;
      this.showPlayOverlay();
      this.onStateChange("paused");
    });

    this.html5Video.addEventListener("ended", () => {
      this.isPlaying = false;
      this.showPlayOverlay();
      this.onStateChange("ended");
      this.onEnded();
    });

    this.html5Video.addEventListener("timeupdate", () => {
      if (this.currentMode !== "html5") return;
      const cur = this.html5Video.currentTime || 0;
      const dur = this.html5Video.duration || 0;
      const percent = dur > 0 ? (cur / dur) * 100 : 0;
      this.onTimeUpdate(cur, dur, percent);
    });

    this.html5Video.addEventListener("progress", () => {
      if (this.currentMode !== "html5") return;
      const buffered = this.html5Video.buffered;
      const dur = this.html5Video.duration;
      if (buffered && buffered.length > 0 && dur > 0) {
        const bufferedEnd = buffered.end(buffered.length - 1);
        const percent = (bufferedEnd / dur) * 100;
        const bufferedEl = document.getElementById("progress-buffered");
        if (bufferedEl) bufferedEl.style.width = `${Math.min(100, percent)}%`;
      }
    });

    this.html5Video.addEventListener("error", (e) => {
      // Hanya tampilkan error jika benar-benar ada source yang gagal dimuat
      if (this.html5Video.src && this.html5Video.error) {
        console.error("HTML5 Video Error code:", this.html5Video.error.code, e);
        this.showError("Gagal memuat video MP4. Ketuk tombol Coba Lagi.");
        this.onStateChange("error");
        this.onError(e);
      }
    });
  }

  /* ========================================================================
     YOUTUBE IFRAME API CONTROLLER
     ======================================================================== */
  initYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      this.ytReady = true;
      return;
    }
    if (this.ytApiLoading) return;

    this.ytApiLoading = true;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      this.ytReady = true;
      this.ytApiLoading = false;
      console.log("YouTube IFrame API Ready");
      if (this.currentVideo && this.currentVideo.type === "youtube") {
        this.setupYouTubePlayer(this.currentVideo.youtubeId);
      }
    };
  }

  setupYouTubePlayer(videoId) {
    if (!window.YT || !window.YT.Player) {
      this.pendingVideoId = videoId;
      return;
    }

    if (this.ytPlayer) {
      if (typeof this.ytPlayer.loadVideoById === "function") {
        this.ytPlayer.loadVideoById(videoId);
      } else {
        this.pendingVideoId = videoId;
      }
      return;
    }

    this.ytPlayer = new window.YT.Player("youtube-player", {
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        controls: 1,
        enablejsapi: 1,
        origin: window.location.origin
      },
      events: {
        onReady: (event) => {
          this.ytPlayerReady = true;
          this.showLoading(false);
          this.hideError();
          if (this.pendingVideoId) {
            const nextId = this.pendingVideoId;
            this.pendingVideoId = null;
            event.target.loadVideoById(nextId);
          } else {
            event.target.setVolume(this.volume * 100);
            event.target.playVideo();
          }
          this.startYouTubeProgressTimer();
        },
        onStateChange: (event) => {
          if (this.currentMode !== "youtube") return;
          switch (event.data) {
            case 1: // Playing
              this.showLoading(false);
              this.hidePlayOverlay();
              this.hideError();
              this.isPlaying = true;
              this.onStateChange("playing");
              this.startYouTubeProgressTimer();
              break;
            case 2: // Paused
              this.isPlaying = false;
              this.onStateChange("paused");
              this.stopYouTubeProgressTimer();
              break;
            case 3: // Buffering
              this.showLoading(true);
              this.onStateChange("buffering");
              break;
            case 0: // Ended
              this.isPlaying = false;
              this.onStateChange("ended");
              this.stopYouTubeProgressTimer();
              this.onEnded();
              break;
            default:
              break;
          }
        },
        onError: (err) => {
          console.error("YouTube Player Error code:", err.data, err);
          let msg = "Video gagal dimuat.";
          const code = err && err.data;
          if (code === 101 || code === 150) {
            msg = "Pemilik video melarang pemutaran di luar situs YouTube.";
          } else if (code === 100) {
            msg = "Video tidak ditemukan atau telah dihapus.";
          } else if (code === 2) {
            msg = "ID video tidak valid.";
          }
          this.showError(msg);
          this.onStateChange("error");
          this.onError(err);
        }
      }
    });
  }

  startYouTubeProgressTimer() {
    this.stopYouTubeProgressTimer();
    this.ytTimer = setInterval(() => {
      if (this.ytPlayer && typeof this.ytPlayer.getCurrentTime === "function") {
        const cur = this.ytPlayer.getCurrentTime() || 0;
        const dur = this.ytPlayer.getDuration() || 0;
        const percent = dur > 0 ? (cur / dur) * 100 : 0;
        this.onTimeUpdate(cur, dur, percent);
      }
    }, 250);
  }

  stopYouTubeProgressTimer() {
    if (this.ytTimer) {
      clearInterval(this.ytTimer);
      this.ytTimer = null;
    }
  }

  getTikTokPlayerUrl(videoId, autoPlay) {
    const params = new URLSearchParams({
      controls: "1",
      autoplay: autoPlay ? "1" : "0",
      muted: autoPlay ? "1" : "0",
      description: "0",
      music_info: "0"
    });
    return `https://www.tiktok.com/player/v1/${videoId}?${params}`;
  }

  isSocialEmbed() {
    return ["tiktok", "instagram", "facebook", "vimeo"].includes(this.currentMode);
  }

  /* ========================================================================
     PUBLIC VIDEO ACTIONS
     ======================================================================== */
  loadVideo(videoItem, autoPlay = true) {
    if (!videoItem) return;
    this.currentVideo = videoItem;
    this.hideError();
    this.showLoading(true);

    if (this.html5Video) {
      this.html5Video.pause();
      this.html5Video.classList.add("hidden");
    }
    if (this.ytContainer) this.ytContainer.classList.add("hidden");
    if (this.tiktokContainer) this.tiktokContainer.classList.add("hidden");
    if (this.tiktokFrame) this.tiktokFrame.src = "about:blank";
    this.stopYouTubeProgressTimer();

    if (["tiktok", "instagram", "facebook", "vimeo"].includes(videoItem.type)) {
      this.currentMode = videoItem.type;
      if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === "function") {
        this.ytPlayer.pauseVideo();
      }

      const embedUrl = videoItem.embedUrl
        || (videoItem.type === "tiktok" && /^\d+$/.test(String(videoItem.tiktokId || ""))
          ? this.getTikTokPlayerUrl(String(videoItem.tiktokId), autoPlay)
          : "");
      const allowedHosts = {
        tiktok: "www.tiktok.com",
        instagram: "www.instagram.com",
        facebook: "www.facebook.com",
        vimeo: "player.vimeo.com"
      };
      let isValidEmbed = false;
      try {
        const parsedEmbedUrl = new URL(embedUrl);
        isValidEmbed = parsedEmbedUrl.protocol === "https:"
          && !parsedEmbedUrl.username
          && !parsedEmbedUrl.password
          && parsedEmbedUrl.hostname === allowedHosts[videoItem.type];
      } catch {
        isValidEmbed = false;
      }

      if (!isValidEmbed || !this.tiktokFrame || !this.tiktokContainer) {
        this.showError("Tautan embed video tidak valid.");
        this.onStateChange("error");
        return;
      }

      this.tiktokContainer.classList.remove("hidden");
      this.tiktokFrame.src = embedUrl;
      this.isPlaying = false;
      this.showLoading(false);
      this.onStateChange("paused");
      return;
    }

    if (videoItem.type === "youtube") {
      this.currentMode = "youtube";
      if (this.ytContainer) {
        this.ytContainer.classList.remove("hidden");
      }

      if (!this.ytReady) this.initYouTubeAPI();
      if (this.ytReady) {
        this.setupYouTubePlayer(videoItem.youtubeId);
      } else {
        console.log("Menunggu inisialisasi YouTube API...");
      }
    } else {
      // HTML5 MP4 Mode
      this.currentMode = "html5";
      if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === "function") {
        this.ytPlayer.pauseVideo();
      }
      if (this.html5Video) {
        this.html5Video.classList.remove("hidden");
        this.html5Video.src = videoItem.src;
        this.html5Video.load();

        if (autoPlay) {
          const playPromise = this.html5Video.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                this.isPlaying = true;
                this.showLoading(false);
                this.hidePlayOverlay();
                this.onStateChange("playing");
              })
              .catch((err) => {
                // Browser Autoplay Policy: diblokir sampai ada klik pertama
                console.info("Autoplay dicegah oleh browser; menunggu sentuhan pengguna.", err);
                this.showLoading(false);
                this.isPlaying = false;
                this.showPlayOverlay();
                this.onStateChange("paused");
              });
          }
        } else {
          this.showLoading(false);
          this.isPlaying = false;
          this.showPlayOverlay();
          this.onStateChange("paused");
        }
      }
    }
  }

  play() {
    this.hideError();
    if (this.isSocialEmbed()) return;
    if (this.currentMode === "youtube" && this.ytPlayer && typeof this.ytPlayer.playVideo === "function") {
      this.ytPlayer.playVideo();
    } else if (this.html5Video) {
      this.html5Video.play().then(() => {
        this.isPlaying = true;
        this.hidePlayOverlay();
      }).catch((e) => {
        console.warn("Gagal memutar:", e);
      });
    }
  }

  pause() {
    if (this.isSocialEmbed()) return;
    if (this.currentMode === "youtube" && this.ytPlayer && typeof this.ytPlayer.pauseVideo === "function") {
      this.ytPlayer.pauseVideo();
    } else if (this.html5Video) {
      this.html5Video.pause();
    }
    this.isPlaying = false;
    this.showPlayOverlay();
  }

  stop() {
    if (this.isSocialEmbed()) return;
    if (this.currentMode === "youtube" && this.ytPlayer) {
      if (typeof this.ytPlayer.stopVideo === "function") {
        this.ytPlayer.stopVideo();
      }
      if (typeof this.ytPlayer.seekTo === "function") {
        this.ytPlayer.seekTo(0, true);
      }
      this.stopYouTubeProgressTimer();
    } else if (this.html5Video) {
      this.html5Video.pause();
      this.html5Video.currentTime = 0;
    }
    this.isPlaying = false;
    this.showPlayOverlay();
    this.onStateChange("stopped");
    this.onTimeUpdate(0, this.getDuration(), 0);
  }

  seekTo(percent) {
    if (this.isSocialEmbed()) return;
    const dur = this.getDuration();
    if (dur <= 0) return;
    const targetTime = (percent / 100) * dur;

    if (this.currentMode === "youtube" && this.ytPlayer && typeof this.ytPlayer.seekTo === "function") {
      this.ytPlayer.seekTo(targetTime, true);
    } else if (this.html5Video) {
      this.html5Video.currentTime = targetTime;
    }
  }

  setVolume(volume0to1) {
    this.volume = Math.max(0, Math.min(1, volume0to1));
    if (this.html5Video) {
      this.html5Video.volume = this.volume;
      this.html5Video.muted = this.isMuted;
    }
    if (this.ytPlayer && typeof this.ytPlayer.setVolume === "function") {
      this.ytPlayer.setVolume(this.isMuted ? 0 : this.volume * 100);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.setVolume(this.volume);
    return this.isMuted;
  }

  getDuration() {
    if (this.isSocialEmbed()) return 0;
    if (this.currentMode === "youtube" && this.ytPlayer && typeof this.ytPlayer.getDuration === "function") {
      return this.ytPlayer.getDuration() || 0;
    } else if (this.html5Video) {
      return this.html5Video.duration || 0;
    }
    return 0;
  }

  getCurrentTime() {
    if (this.isSocialEmbed()) return 0;
    if (this.currentMode === "youtube" && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === "function") {
      return this.ytPlayer.getCurrentTime() || 0;
    } else if (this.html5Video) {
      return this.html5Video.currentTime || 0;
    }
    return 0;
  }

  /* ========================================================================
     OVERLAY HELPERS
     ======================================================================== */
  showLoading(isLoading) {
    if (!this.overlayLoading) return;
    if (isLoading) {
      this.overlayLoading.classList.remove("hidden");
    } else {
      this.overlayLoading.classList.add("hidden");
    }
  }

  showPlayOverlay() {
    if (this.overlayPlayBtn) this.overlayPlayBtn.classList.remove("hidden");
  }

  hidePlayOverlay() {
    if (this.overlayPlayBtn) this.overlayPlayBtn.classList.add("hidden");
  }

  showError(msg) {
    this.showLoading(false);
    this.hidePlayOverlay();
    if (this.errorMessage) this.errorMessage.textContent = msg;
    if (this.overlayError) this.overlayError.classList.remove("hidden");
  }

  hideError() {
    if (this.overlayError) this.overlayError.classList.add("hidden");
  }

  retry() {
    if (!this.currentVideo) return;
    this.hideError();
    this.showLoading(true);
    if (this.isSocialEmbed() && this.tiktokFrame) {
      const embedUrl = this.currentVideo.embedUrl
        || (this.currentVideo.type === "tiktok" && /^\d+$/.test(String(this.currentVideo.tiktokId || ""))
          ? this.getTikTokPlayerUrl(String(this.currentVideo.tiktokId), true)
          : "");
      if (!embedUrl) {
        this.showError("Tautan embed video tidak tersedia.");
        return;
      }
      this.tiktokFrame.src = embedUrl;
      this.showLoading(false);
    } else if (this.currentMode === "youtube") {
      if (this.ytPlayer && typeof this.ytPlayer.loadVideoById === "function") {
        this.ytPlayer.loadVideoById(this.currentVideo.youtubeId);
      } else {
        this.setupYouTubePlayer(this.currentVideo.youtubeId);
      }
    } else if (this.html5Video) {
      this.html5Video.load();
      this.html5Video.play().catch(() => {});
    }
  }
}
