// current weather conditions display
import STATUS from './status.js';
import { fetchAsync } from './utils/fetch.js';
import { formatTimeSimple24Hour, fromUTCObject, minusDays, plusDays, startOfDay } from './utils/date-utils.js';
import WeatherDisplay from './weatherdisplay.js';
import { isPlaying, msg, registerDisplay } from './navigation.js';
import * as utils from './radar-utils.js';
import { version } from './progress.js';
import setTiles from './radar-tiles.js';

// Empty overrides object for static version
const OVERRIDES = {};

const RADAR_HOST = 'mesonet.agron.iastate.edu';
class Radar extends WeatherDisplay {
  constructor(navId, elemId) {
    super(navId, elemId, 'Local Radar');

    this.okToDrawCurrentConditions = false;
    this.okToDrawCurrentDateTime = false;

    // set max images
    this.dopplerRadarImageMax = 6;

    // Staleness tracking
    this.lastDataRefresh = null;
    this.maxDataAge = 45 * 60 * 1000; // 45 minutes in milliseconds

    // Restore original timing system
    this.timing.baseDelay = 525;
    this.timing.delay = [
      { time: 10, si: 5 },
      { time: 6, si: 5 },
      { time: 2, si: 0 },
      { time: 2, si: 1 },
      { time: 2, si: 2 },
      { time: 2, si: 3 },
      { time: 2, si: 4 },
      { time: 6, si: 5 },
      { time: 2, si: 0 },
      { time: 2, si: 1 },
      { time: 2, si: 2 },
      { time: 2, si: 3 },
      { time: 2, si: 4 },
      { time: 6, si: 5 },
      { time: 2, si: 0 },
      { time: 2, si: 1 },
      { time: 2, si: 2 },
      { time: 2, si: 3 },
      { time: 2, si: 4 },
      { time: 10, si: 5 },
    ];
  }

  async getData(weatherParameters, refresh) {
    if (!super.getData(weatherParameters, refresh)) {
      return;
    }

    // ALASKA AND HAWAII AREN'T SUPPORTED!
    if (this.weatherParameters.state === 'AK' || this.weatherParameters.state === 'HI') {
      this.setStatus(STATUS.noData);
      return;
    }

    // get the workers started
    if (!this.workers) {
      // get some web workers started
      this.workers = new Array(this.dopplerRadarImageMax).fill(null).map(() => radarWorker());
    }

    const baseUrl = `https://${RADAR_HOST}/archive/data/`;
    const baseUrlEnd = '/GIS/uscomp/?F=0&P=n0r*.png';
    const baseUrls = [];
    let date = startOfDay(minusDays(new Date(), 1));

    // make urls for yesterday and today
    while (date <= startOfDay(new Date())) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      baseUrls.push(`${baseUrl}${year}/${month}/${day}${baseUrlEnd}`);
      date = plusDays(date, 1);
    }

    const lists = (
      await Promise.all(
        baseUrls.map(async url => {
          try {
            // get a list of available radars with retry logic
            return fetchAsync(url, 'text', { retryCount: 3 });
          } catch (error) {
            console.log('Unable to get list of radars after retries');
            console.error(error);
            return false;
          }
        })
      )
    ).filter(d => d);

    // convert to an array of gif urls
    const pngs = lists.flatMap((html, htmlIdx) => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(html, 'text/html');
      // add the base url
      const base = xmlDoc.createElement('base');
      base.href = baseUrls[htmlIdx];
      xmlDoc.head.append(base);
      const anchors = xmlDoc.querySelectorAll('a');
      const urls = [];
      Array.from(anchors).forEach(elem => {
        if (elem.innerHTML?.match(/n0r_\d{12}\.png/)) {
          urls.push(elem.href);
        }
      });
      return urls;
    });

    // get the last few images
    const timestampRegex = /_(\d{12})\.png/;
    const sortedPngs = pngs.sort((a, b) => (a.match(timestampRegex)[1] < b.match(timestampRegex)[1] ? -1 : 1));
    const urls = sortedPngs.slice(-this.dopplerRadarImageMax);

    // calculate offsets and sizes
    const offsetX = 120 * 2;
    const offsetY = 69 * 2;
    const sourceXY = utils.getXYFromLatitudeLongitudeMap(this.weatherParameters);
    const radarSourceXY = utils.getXYFromLatitudeLongitudeDoppler(this.weatherParameters, offsetX, offsetY);

    // set up the base map and overlay tiles
    setTiles({
      sourceXY,
      elemId: this.elemId,
    });

    // Load the most recent doppler radar images.
    let radarInfo;
    try {
      radarInfo = await Promise.all(
        urls.map(async (url, index) => {
          const processedRadar = await this.workers[index].processRadar({
            url,
            RADAR_HOST,
            OVERRIDES,
            radarSourceXY,
          });

          // store the time
          const timeMatch = url.match(/_(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)\./);

          const [, year, month, day, hour, minute] = timeMatch;
          const time = fromUTCObject({
            year: parseInt(year),
            month: parseInt(month),
            day: parseInt(day),
            hour: parseInt(hour),
            minute: parseInt(minute),
          });

          const onscreenCanvas = document.createElement('canvas');
          onscreenCanvas.width = processedRadar.width;
          onscreenCanvas.height = processedRadar.height;
          const onscreenContext = onscreenCanvas.getContext('bitmaprenderer');
          onscreenContext.transferFromImageBitmap(processedRadar);

          const dataUrl = onscreenCanvas.toDataURL();

          const elem = this.fillTemplate('frame', {
            map: { type: 'img', src: dataUrl },
          });
          return {
            time,
            elem,
          };
        })
      );
    } catch (error) {
      console.log('Radar processing failed:', error.message);
      this.setStatus(STATUS.failed);
      return;
    }

    // put the elements in the container
    const scrollArea = this.elem.querySelector('.scroll-area');
    scrollArea.innerHTML = '';
    scrollArea.append(...radarInfo.map(r => r.elem));

    // set max length
    this.timing.totalScreens = radarInfo.length;

    this.times = radarInfo.map(radar => radar.time);
    // Start with the latest frame (index 5)
    this.screenIndex = 5;
    
    // Record successful data refresh time
    this.lastDataRefresh = Date.now();
    this.setStatus(STATUS.loaded);
  }

  // Check if radar data is too stale and needs refresh
  isDataStale() {
    if (!this.lastDataRefresh || !this.times || this.times.length === 0) {
      return false; // No data yet, not considered stale
    }

    const now = Date.now();
    const dataAge = now - this.lastDataRefresh;
    const latestRadarTime = Math.max(...this.times.map(t => t.getTime()));
    const radarAge = now - latestRadarTime;

    // Consider data stale if:
    // 1. We haven't refreshed data in maxDataAge (45 minutes), OR
    // 2. The newest radar image is more than 30 minutes old
    const isRefreshStale = dataAge > this.maxDataAge;
    const isRadarContentStale = radarAge > (30 * 60 * 1000); // 30 minutes

    if (isRefreshStale || isRadarContentStale) {
      const refreshAgeMin = Math.round(dataAge / 60000);
      const radarAgeMin = Math.round(radarAge / 60000);
      console.log(`Radar data is stale: last refresh ${refreshAgeMin}min ago, newest image ${radarAgeMin}min old`);
      return true;
    }

    return false;
  }

  // Force refresh radar data if stale
  async checkAndRefreshStaleData() {
    if (this.isDataStale() && this.loadingStatus !== STATUS.loading) {
      console.log('Forcing radar refresh due to stale data');
      await this.getData(this.weatherParameters, true);
    }
  }

  async drawCanvas() {
    super.drawCanvas();
    
    // Check for stale data and refresh if needed (non-blocking)
    this.checkAndRefreshStaleData().catch(error => {
      console.warn('Staleness check failed:', error);
    });
    
    const time = formatTimeSimple24Hour(this.times[this.screenIndex]);
    const timePadded = time.length >= 5 ? time : `&nbsp;${time}`;
    this.elem.querySelector('.header .right .time').innerHTML = timePadded;

    // get image offset calculation
    // is slides slightly because of scaling so we have to take a measurement from the rendered page
    const actualFrameHeight = this.elem.querySelector('.frame').scrollHeight;

    // scroll to image
    this.elem.querySelector('.scroll-area').style.top = `${-this.screenIndex * actualFrameHeight}px`;

    this.finishDraw();
  }

  // Override navigation methods to skip to next/previous display instead of moving between radar frames
  navNext(command) {
    // If no command is provided, this is manual navigation - skip to next display
    if (!command) {
      this.sendNavDisplayMessage(msg.response.next);
      return;
    }
    // Otherwise, use the parent class navigation for automatic progression
    super.navNext(command);
  }

  navPrev(command) {
    // If no command is provided, this is manual navigation - skip to previous display
    if (!command) {
      this.sendNavDisplayMessage(msg.response.previous);
      return;
    }
    // Otherwise, use the parent class navigation for automatic progression
    super.navPrev(command);
  }

  // Override the checkNavigation method for radar-specific timing
  checkNavigation(timestamp) {
    if (!this.isActive || !isPlaying()) {
      return;
    }

    const elapsed = timestamp - this.startTime;
    const baseDelay = this.timing.baseDelay || 525;
    const currentCount = Math.floor(elapsed / baseDelay);

    // Update screen index based on count (matching original baseCountChange)
    this.updateScreenFromBaseCount(currentCount);

    // Check if we've reached the end
    const delayArray = Array.isArray(this.timing.delay) ? this.timing.delay : [this.timing.delay];
    const totalDelay = delayArray.reduce((sum, delay) => sum + delay.time, 0);
    if (currentCount >= totalDelay) {
      this.sendNavDisplayMessage(msg.response.next);
    }
  }

  // Update screen index based on count (matching original baseCountChange)
  updateScreenFromBaseCount(count) {
    let accumulatedTime = 0;
    let newScreenIndex = 5; // Default to latest frame

    // ensure delay is an array before iterating
    const delayArray = Array.isArray(this.timing.delay) ? this.timing.delay : [this.timing.delay];
    for (let i = 0; i < delayArray.length; i++) {
      const delay = delayArray[i];
      if (count < accumulatedTime + delay.time) {
        newScreenIndex = delay.si;
        break;
      }
      accumulatedTime += delay.time;
    }

    if (this.screenIndex !== newScreenIndex) {
      this.screenIndex = newScreenIndex;
      this.drawCanvas();
    }
  }
}

// create a radar worker with helper functions
const radarWorker = () => {
  // create the worker
  const worker = new Worker(`/resources/radar-worker.js?_=${version()}`, {
    type: 'module',
  });

  const processRadar = data =>
    new Promise((resolve, reject) => {
      // Add timeout for worker operations
      const timeoutId = setTimeout(() => {
        reject(new Error('Worker timeout after 30 seconds'));
      }, 30_000);

      // prepare for done message
      worker.onmessage = e => {
        clearTimeout(timeoutId);
        if (e?.data instanceof Error) {
          reject(e.data);
        } else if (e?.data instanceof ImageBitmap) {
          resolve(e.data);
        }
      };

      // Handle worker errors
      worker.onerror = (error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Worker error: ${error.message}`));
      };

      // start up the worker
      worker.postMessage(data);
    });

  // Retry wrapper for processRadar with exponential backoff
  const processRadarWithRetry = async (data, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await processRadar(data);
      } catch (error) {
        console.log(`Radar worker attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw error; // Final attempt failed
        }

        // Exponential backoff: 1s, 4s, 16s
        const backoffDelay = Math.pow(4, attempt - 1) * 1000;
        console.log(`Retrying radar worker in ${backoffDelay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  };

  // return the object
  return {
    processRadar: processRadarWithRetry,
  };
};

// register display
registerDisplay(new Radar(11, 'radar'));
