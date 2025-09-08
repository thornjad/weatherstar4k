// Simplified NoSleep utility for modern browsers using native Wake Lock API

class NoSleep {
  constructor() {
    this.enabled = false;
    this._wakeLock = null;
    this._renewalInterval = null;
    this._renewalTimeout = 60 * 60 * 1000; // 1 hour (renew before 24h timeout)

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

      // Set up renewal logic
      this._setupRenewal();

      this._wakeLock.addEventListener('release', () => {
        console.log('Wake Lock released.');
        this._clearRenewal();
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
    this._clearRenewal();
  }

  _setupRenewal() {
    this._clearRenewal(); // Clear any existing renewal

    this._renewalInterval = setInterval(async () => {
      if (this.enabled && this._wakeLock) {
        try {
          // Release current wake lock
          this._wakeLock.release();

          // Request new wake lock
          this._wakeLock = await navigator.wakeLock.request('screen');
          console.log('Wake Lock renewed successfully.');

          // Set up release listener for new wake lock
          this._wakeLock.addEventListener('release', () => {
            console.log('Wake Lock released.');
            this._clearRenewal();
          });
        } catch (err) {
          console.error('Wake Lock renewal failed:', err);
          this.enabled = false;
          this._clearRenewal();
        }
      }
    }, this._renewalTimeout);
  }

  _clearRenewal() {
    if (this._renewalInterval) {
      clearInterval(this._renewalInterval);
      this._renewalInterval = null;
    }
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
