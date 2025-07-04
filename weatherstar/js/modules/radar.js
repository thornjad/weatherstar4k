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
            // get a list of available radars
            return fetchAsync(url, 'text');
          } catch (error) {
            console.log('Unable to get list of radars');
            console.error(error);
            this.setStatus(STATUS.failed);
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
    const radarInfo = await Promise.all(
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

    // put the elements in the container
    const scrollArea = this.elem.querySelector('.scroll-area');
    scrollArea.innerHTML = '';
    scrollArea.append(...radarInfo.map(r => r.elem));

    // set max length
    this.timing.totalScreens = radarInfo.length;

    this.times = radarInfo.map(radar => radar.time);
    // Start with the latest frame (index 5)
    this.screenIndex = 5;
    this.setStatus(STATUS.loaded);
  }

  async drawCanvas() {
    super.drawCanvas();
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
      // prepare for done message
      worker.onmessage = e => {
        if (e?.data instanceof Error) {
          reject(e.data);
        } else if (e?.data instanceof ImageBitmap) {
          resolve(e.data);
        }
      };

      // start up the worker
      worker.postMessage(data);
    });

  // return the object
  return {
    processRadar,
  };
};

// register display
registerDisplay(new Radar(11, 'radar'));
