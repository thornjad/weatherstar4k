// Simplified NoSleep utility for modern browsers using native Wake Lock API

class NoSleep {
  constructor() {
    this.enabled = false;
    this._wakeLock = null;
    
    const handleVisibilityChange = () => {
      if (this._wakeLock !== null && document.visibilityState === 'visible') {
        this.enable();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleVisibilityChange);
  }

  async enable() {
    try {
      this._wakeLock = await navigator.wakeLock.request('screen');
      this.enabled = true;
      console.log('Wake Lock active.');
      this._wakeLock.addEventListener('release', () => {
        console.log('Wake Lock released.');
      });
    } catch (err) {
      this.enabled = false;
      console.error('Wake Lock failed:', err);
      throw err;
    }
  }

  disable() {
    if (this._wakeLock) {
      this._wakeLock.release();
      this._wakeLock = null;
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
  if (!noSleep.controller) {
    noSleep.controller = new NoSleep();
  }
  // don't call anything if the states match
  if (wakeLock === enable) {
    return false;
  }
  // store the value
  wakeLock = enable;
  // call the function
  if (enable) {
    return noSleep.controller.enable();
  }
  return noSleep.controller.disable();
};

export default noSleep;
