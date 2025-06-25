// display spc outlook in a bar graph

import STATUS from './status.js';
import { fetchAsync } from './utils/fetch.js';
import { getDayName, plusDays } from './utils/date-utils.js';
import WeatherDisplay from './weatherdisplay.js';
import { registerDisplay } from './navigation.js';
import testPolygon from './utils/polygon.js';

// list of interesting files ordered [0] = today, [1] = tomorrow...
const urlPattern = day => `https://www.spc.noaa.gov/products/outlook/day${day}otlk_cat.nolyr.geojson`;

const testAllPoints = (point, data) => {
  // returns all points where the data matches as an array of days and then matches of the properties of the data

  const result = [];
  data.forEach((day, index) => {
    result[index] = false;
    if (day === undefined) {
      return;
    }
    day.features.forEach(feature => {
      if (!feature.geometry.coordinates) {
        return;
      }
      const inPolygon = testPolygon(point, feature.geometry);
      if (inPolygon) {
        result[index] = feature.properties;
      }
    });
  });

  return result;
};

const barSizes = {
  TSTM: 60,
  MRGL: 150,
  SLGT: 210,
  ENH: 270,
  MDT: 330,
  HIGH: 390,
};

class SpcOutlook extends WeatherDisplay {
  constructor(navId, elemId) {
    super(navId, elemId, 'SPC Outlook');
    // don't display on progress/navigation screen
    this.showOnProgress = false;

    this.files = [null, null, null].map((v, i) => urlPattern(i + 1));

    this.timing.totalScreens = 1;
  }

  async getData(weatherParameters, refresh) {
    if (!super.getData(weatherParameters, refresh)) {
      return;
    }

    // initial data does not need to be reloaded on a location change, only during silent refresh
    if (!this.initialData || refresh) {
      try {
        const filePromises = await Promise.allSettled(this.files.map(file => fetchAsync(file, 'json')));
        this.initialData = filePromises.map(outlookDay => outlookDay.value);
      } catch (error) {
        console.error('Unable to get spc outlook');
        console.error(error.status, error.responseJSON);
        // if there's no previous data, fail
        if (!this.initialData) {
          this.setStatus(STATUS.failed);
          return;
        }
      }
    }
    this.data = testAllPoints([weatherParameters.longitude, weatherParameters.latitude], this.initialData);

    // if all the data returns false the there's nothing to do, skip this screen
    if (this.data.reduce((prev, cur) => prev || !!cur, false)) {
      this.timing.totalScreens = 1;
    } else {
      this.timing.totalScreens = 0;
    }

    this.screenIndex = 0;
    this.setStatus(STATUS.loaded);
  }

  async drawCanvas() {
    super.drawCanvas();

    const days = this.data.map((day, index) => {
      const dayName = getDayName(plusDays(new Date(), index));

      const fill = {};
      fill['day-name'] = dayName;

      const elem = this.fillTemplate('day', fill);

      const bar = elem.querySelector('.risk-bar');
      if (day.LABEL) {
        bar.style.width = `${barSizes[day.LABEL]}px`;
      } else {
        bar.style.display = 'none';
      }

      return elem;
    });

    const dayContainer = this.elem.querySelector('.days');
    dayContainer.innerHTML = '';
    dayContainer.append(...days);

    // finish drawing
    this.finishDraw();
  }
}

// register display
registerDisplay(new SpcOutlook(10, 'spc-outlook'));
