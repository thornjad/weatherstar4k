// base weather display class

import STATUS from './status.js';
import { displayNavMessage, isPlaying, msg, updateStatus } from './navigation.js';
import { formatDate, formatTimeWithSeconds24Hour } from './utils/date-utils.js';
import { clockManager, timingManager } from './timing-manager.js';

class WeatherDisplay {
  constructor(navId, elemId, name) {
    // navId is used in messaging and sort order
    this.navId = navId;
    this.elemId = undefined;
    this.data = undefined;
    this.loadingStatus = STATUS.loading;
    this.name = name ?? elemId;
    this.getDataCallbacks = [];
    this.stillWaitingCallbacks = [];
    this.isEnabled = true;
    this.okToDrawCurrentConditions = true;
    this.okToDrawCurrentDateTime = true;
    this.showOnProgress = true;
    this.autoRefreshHandle = null;

    // Simplified timing properties
    this.displayDuration = 13500; // 13.5 seconds default
    this.startTime = 0;
    this.isActive = false;

    // default navigation timing
    this.timing = {
      totalScreens: 1,
      baseDelay: 13500, // 13.5 seconds
      delay: 1, // 1*13.5seconds = 13.5 seconds total display time
    };
    this.navBaseCount = 0;
    this.screenIndex = -1; // special starting condition

    // store elemId once
    this.storeElemId(elemId);

    this.setStatus(STATUS.loading);

    // get any templates
    document.addEventListener('DOMContentLoaded', () => {
      this.loadTemplates();
    });
  }

  // set data status and send update to navigation module
  setStatus(value) {
    this.loadingStatus = value;
    updateStatus({
      id: this.navId,
      status: this.loadingStatus,
    });
  }

  get status() {
    return this.loadingStatus;
  }

  set status(state) {
    this.loadingStatus = state;
  }

  storeElemId(elemId) {
    // only create it once
    if (this.elemId) {
      return;
    }
    this.elemId = elemId;
  }

  // get necessary data for this display
  getData(weatherParameters, refresh) {
    // refresh doesn't delete existing data, and is reused if the silent refresh fails
    if (!refresh) {
      this.data = undefined;
      // clear any refresh timers
      this.clearAutoReload();
    }

    // store weatherParameters locally in case we need them later
    if (weatherParameters) {
      this.weatherParameters = weatherParameters;
    }

    // set status
    if (this.isEnabled) {
      this.setStatus(STATUS.loading);
    } else {
      this.setStatus(STATUS.disabled);
      return false;
    }

    // set up auto reload if necessary
    this.setAutoReload();

    return true;
  }

  // return any data requested before it was available
  getDataCallback() {
    // call each callback
    this.getDataCallbacks.forEach(fxn => fxn(this.data));
    // clear the callbacks
    this.getDataCallbacks = [];
  }

  drawCanvas() {
    // clean up the first-run flag in screen index
    if (this.screenIndex < 0) {
      this.screenIndex = 0;
    }
    if (this.okToDrawCurrentDateTime) {
      this.drawCurrentDateTime();
    }
    if (this.okToDrawCurrentConditions) {
      postMessage({ type: 'current-weather-scroll', method: 'start' });
    }
  }

  finishDraw() {
    // Simplified clock handling - no interval management needed
    if (this.okToDrawCurrentDateTime) {
      this.drawCurrentDateTime();
    }
  }

  drawCurrentDateTime() {
    // Get the current date and time
    const now = new Date();
    const time = formatTimeWithSeconds24Hour(now);
    const date = formatDate(now);

    const dateElem = this.elem.querySelector('.date-time.date');
    const timeElem = this.elem.querySelector('.date-time.time');

    if (timeElem && this.lastTime !== time) {
      timeElem.innerHTML = time.toUpperCase();
    }
    this.lastTime = time;

    if (dateElem && this.lastDate !== date) {
      dateElem.innerHTML = date.toUpperCase();
    }
    this.lastDate = date;
  }

  // show/hide the canvas and start/stop the navigation timer
  showCanvas(navCmd) {
    // Reset timing if enabled
    if (navCmd === msg.command.firstFrame) {
      this.navNext(navCmd);
    }
    if (navCmd === msg.command.lastFrame) {
      this.navPrev(navCmd);
    }

    this.isActive = true;
    // reset start time to prevent accumulation over long periods
    this.startTime = performance.now();

    // Register with timing manager for navigation
    if (this.timing && this.timing.totalScreens > 0) {
      timingManager.addCallback(`nav-${this.navId}`, this.checkNavigation.bind(this), this.timing.baseDelay);
    }

    // Register with clock manager if needed
    if (this.okToDrawCurrentDateTime) {
      clockManager.addElement(this.elem);
    }

    this.elem.classList.add('show');
    document.querySelector('#divTwc').classList.add(this.elemId);
  }

  hideCanvas() {
    this.isActive = false;

    // Remove from timing managers
    timingManager.removeCallback(`nav-${this.navId}`);
    clockManager.removeElement(this.elem);

    this.elem.classList.remove('show');
    document.querySelector('#divTwc').classList.remove(this.elemId);
  }

  get active() {
    return this.elem.offsetHeight !== 0;
  }

  get enabled() {
    return this.isEnabled;
  }

  // Simplified navigation methods
  navNext(command) {
    // If no command is provided, this is manual navigation - skip to next display
    if (!command) {
      this.sendNavDisplayMessage(msg.response.next);
      return;
    }

    if (command === msg.command.firstFrame) {
      this.startTime = performance.now();
      this.screenIndex = 0;
    } else {
      // Handle next screen logic based on your specific needs
      this.screenIndex = (this.screenIndex + 1) % (this.timing?.totalScreens || 1);
    }
    this.updateScreenFromBaseCount();
  }

  navPrev(command) {
    // If no command is provided, this is manual navigation - skip to previous display
    if (!command) {
      this.sendNavDisplayMessage(msg.response.previous);
      return;
    }

    if (command === msg.command.lastFrame) {
      this.screenIndex = (this.timing?.totalScreens || 1) - 1;
    } else {
      // Handle previous screen logic
      if (this.screenIndex <= 0) {
        this.sendNavDisplayMessage(msg.response.previous);
        return;
      }
      this.screenIndex--;
    }
    this.updateScreenFromBaseCount();
  }

  async updateScreenFromBaseCount() {
    // Simplified screen update logic
    if (this.screenIndexChange) {
      this.screenIndexChange(this.screenIndex);
    } else {
      await this.drawCanvas();
    }
  }

  sendNavDisplayMessage(message) {
    displayNavMessage({
      id: this.navId,
      type: message,
    });
  }

  loadTemplates() {
    this.templates = {};
    this.elem = document.querySelector(`#${this.elemId}-html`);
    if (!this.elem) {
      return;
    }
    document.querySelectorAll(`#${this.elemId}-html .template`).forEach(template => {
      const className = template.classList[0];
      const node = template.cloneNode(true);
      node.classList.remove('template');
      this.templates[className] = node;
      template.remove();
    });
  }

  fillTemplate(name, fillValues) {
    // get the template
    const templateNode = this.templates[name];
    if (!templateNode) {
      return false;
    }

    // clone it
    const template = templateNode.cloneNode(true);

    Object.entries(fillValues).forEach(([key, value]) => {
      // get the specified element
      const elem = template.querySelector(`.${key}`);
      if (!elem) {
        return;
      }

      // fill based on type provided
      if (typeof value === 'string' || typeof value === 'number') {
        // string and number fill the first found selector
        elem.innerHTML = value;
      } else if (value?.type === 'img') {
        // fill the image source
        elem.querySelector('img').src = value.src;
      } else if (value?.type === 'canvas') {
        elem.append(value.canvas);
      }
    });

    return template;
  }

  // still waiting for data (retries triggered)
  stillWaiting() {
    if (this.isEnabled) {
      this.setStatus(STATUS.retrying);
    }
    // handle still waiting callbacks
    this.stillWaitingCallbacks.forEach(callback => callback());
    this.stillWaitingCallbacks = [];
  }

  clearAutoReload() {
    if (this.autoRefreshHandle) {
      clearInterval(this.autoRefreshHandle);
      this.autoRefreshHandle = null;
    }
  }

  clearAllIntervals() {
    // Remove from timing managers
    timingManager.removeCallback(`nav-${this.navId}`);
    clockManager.removeElement(this.elem);

    // Clear auto refresh interval (keep this as it's for data refresh)
    this.clearAutoReload();
  }

  setAutoReload() {
    // refresh time can be forced by the user (for hazards)
    const refreshTime = this.refreshTime ?? 600_000;
    this.autoRefreshHandle = this.autoRefreshHandle ?? setInterval(() => this.getData(false, true), refreshTime);
  }

  // Replace complex navigation timing with simple duration-based timing
  checkNavigation(timestamp) {
    if (!this.isActive || !isPlaying()) {
      return;
    }

    const elapsed = timestamp - this.startTime;
    const shouldAdvance = elapsed >= this.displayDuration;

    if (shouldAdvance) {
      this.sendNavDisplayMessage(msg.response.next);
    }
  }
}

export default WeatherDisplay;
