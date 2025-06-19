// Simplified NoSleep utility for modern browsers

// Detect native Wake Lock API support
const nativeWakeLock = () => {
  return "wakeLock" in navigator;
};

class NoSleep {
  constructor() {
    this.enabled = false;

    if (nativeWakeLock()) {
      this._wakeLock = null;
      const handleVisibilityChange = () => {
        if (this._wakeLock !== null && document.visibilityState === "visible") {
          this.enable();
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      document.addEventListener("fullscreenchange", handleVisibilityChange);
    } else {
      // Set up no sleep video element for browsers without Wake Lock API
      this.noSleepVideo = document.createElement("video");
      this.noSleepVideo.setAttribute("title", "No Sleep");
      this.noSleepVideo.setAttribute("playsinline", "");

      // Create a minimal video source (1x1 pixel transparent video)
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "transparent";
      ctx.fillRect(0, 0, 1, 1);

      const stream = canvas.captureStream();
      this.noSleepVideo.srcObject = stream;
      this.noSleepVideo.loop = true;
    }
  }

  async enable() {
    if (nativeWakeLock()) {
      try {
        this._wakeLock = await navigator.wakeLock.request("screen");
        this.enabled = true;
        console.log("Wake Lock active.");
        this._wakeLock.addEventListener("release", () => {
          console.log("Wake Lock released.");
        });
      } catch (err) {
        this.enabled = false;
        console.error(err.name + ", " + err.message);
        throw err;
      }
    } else {
      try {
        await this.noSleepVideo.play();
        this.enabled = true;
      } catch (err) {
        this.enabled = false;
        throw err;
      }
    }
  }

  disable() {
    if (nativeWakeLock()) {
      if (this._wakeLock) {
        this._wakeLock.release();
      }
      this._wakeLock = null;
    } else {
      this.noSleepVideo.pause();
    }
    this.enabled = false;
  }

  get isEnabled() {
    return this.enabled;
  }
}

// Track state of nosleep locally to avoid a null case error
// when nosleep.disable is called without first calling .enable
let wakeLock = false;

const noSleep = (enable = false) => {
  // get a nosleep controller
  if (!noSleep.controller) noSleep.controller = new NoSleep();
  // don't call anything if the states match
  if (wakeLock === enable) return false;
  // store the value
  wakeLock = enable;
  // call the function
  if (enable) return noSleep.controller.enable();
  return noSleep.controller.disable();
};

export default noSleep;
