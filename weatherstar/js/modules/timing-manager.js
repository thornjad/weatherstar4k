import { formatTimeWithSeconds24Hour } from './utils/date-utils.js';

/**
 * Centralized timing manager using requestAnimationFrame
 */
class TimingManager {
  constructor() {
    this.animationId = null;
    this.lastUpdate = 0;
    this.callbacks = new Map();
    this.isRunning = false;
    this.isVisible = true;

    // Handle visibility changes automatically
    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden;
      if (this.isVisible && this.callbacks.size > 0) {
        this.forceRestart();
      }
    });
  }

  /**
   * Add a callback to be executed at specified intervals
   * @param {string} id - Unique identifier for the callback
   * @param {Function} callback - Function to execute
   * @param {number} interval - Interval in milliseconds
   */
  addCallback(id, callback, interval) {
    this.callbacks.set(id, { callback, interval, lastCall: 0 });
    if (!this.isRunning) {
      this.start();
    }
  }

  /**
   * Remove a callback by ID
   * @param {string} id - Callback identifier
   */
  removeCallback(id) {
    this.callbacks.delete(id);
    if (this.callbacks.size === 0) {
      this.stop();
    }
  }

  /**
   * Start the animation frame loop
   */
  start() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.lastUpdate = performance.now();
    this.animationId = requestAnimationFrame(this.update.bind(this));
  }

  /**
   * Stop the animation frame loop
   */
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isRunning = false;
  }

  /**
   * Main update loop using requestAnimationFrame
   * @param {number} timestamp - High-resolution timestamp
   */
  update(timestamp) {
    if (!this.isRunning) {
      return;
    }

    // Only execute callbacks if visible
    if (this.isVisible) {
      // Update all callbacks
      for (const [id, { callback, interval, lastCall }] of this.callbacks) {
        if (timestamp - lastCall >= interval) {
          try {
            callback(timestamp);
            const cb = this.callbacks.get(id);
            if (cb) {
              cb.lastCall = timestamp;
            }
          } catch (error) {
            console.error(`Error in timing callback ${id}:`, error);
          }
        }
      }
    }

    // Always continue the animation frame loop
    this.animationId = requestAnimationFrame(this.update.bind(this));
  }

  /**
   * Clear all callbacks and stop the loop
   */
  clear() {
    this.stop();
    this.callbacks.clear();
  }

  /**
   * Force restart the timing manager (useful after visibility changes)
   */
  forceRestart() {
    if (this.callbacks.size > 0) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get current timing statistics for debugging
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      isVisible: this.isVisible,
      callbackCount: this.callbacks.size,
      callbacks: Array.from(this.callbacks.keys()),
    };
  }
}

// Global timing manager instance
export const timingManager = new TimingManager();

/**
 * Clock manager for centralized time display updates
 */
class ClockManager {
  constructor() {
    this.lastUpdate = '';
    this.elements = new Set();
  }

  /**
   * Add a display element to receive clock updates
   * @param {HTMLElement} element - Display element
   */
  addElement(element) {
    this.elements.add(element);
    this.update(element);
  }

  /**
   * Remove a display element from clock updates
   * @param {HTMLElement} element - Display element
   */
  removeElement(element) {
    this.elements.delete(element);
  }

  /**
   * Update clock display for specified element or all elements
   * @param {HTMLElement} element - Optional specific element
   */
  update(element = null) {
    const now = new Date();
    const timeString = formatTimeWithSeconds24Hour(now);

    if (timeString !== this.lastUpdate) {
      this.lastUpdate = timeString;

      const elements = element ? [element] : Array.from(this.elements);
      elements.forEach(elem => {
        const timeElem = elem.querySelector('.date-time.time');
        if (timeElem) {
          timeElem.innerHTML = timeString.toUpperCase();
        }
      });
    }
  }
}

// Register clock manager with timing manager (updates every second)
export const clockManager = new ClockManager();
timingManager.addCallback('clock', () => clockManager.update(), 1000);

// Global debug function for timing issues
window.debugTiming = () => {
  console.log('Timing Manager Status:', timingManager.getStats());
  console.log('Clock Manager Elements:', clockManager.elements.size);

  if (window.CurrentWeatherScroll?.getScrollStatus) {
    console.log('Current Weather Scroll Status:', window.CurrentWeatherScroll.getScrollStatus());
  }

  // Check if any displays are active
  const activeDisplays = Array.from(timingManager.callbacks.keys()).filter(id => id.startsWith('nav-'));
  console.log('Active Display Callbacks:', activeDisplays);
};

// Global restart function for timing system
window.restartTiming = () => {
  console.log('Restarting timing system...');
  timingManager.forceRestart();
  console.log('Timing system restarted:', timingManager.getStats());
};
