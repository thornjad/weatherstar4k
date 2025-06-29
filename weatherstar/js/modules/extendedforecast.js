// display extended forecast graphically
// technically uses the same data as the local forecast, we'll let the browser do the caching of that

import STATUS from './status.js';
import { fetchAsync } from './utils/fetch.js';
import { getLargeIcon } from './icons.js';
import { preloadImg } from './utils/image.js';
import { getShortDayName, plusDays, startOfDay } from './utils/date-utils.js';
import WeatherDisplay from './weatherdisplay.js';
import { registerDisplay } from './navigation.js';

class ExtendedForecast extends WeatherDisplay {
  constructor(navId, elemId) {
    super(navId, elemId, 'Extended Forecast');

    this.timing.totalScreens = 2;
    this.timing.baseDelay = 10000; // 10 seconds per screen
  }

  async getData(weatherParameters, refresh) {
    if (!super.getData(weatherParameters, refresh)) {
      return;
    }

    try {
      this.data = await fetchAsync(this.weatherParameters.forecast, 'json', {
        data: {
          units: 'us',
        },
        retryCount: 3,
        stillWaiting: () => this.stillWaiting(),
      });
    } catch (error) {
      console.error('Unable to get extended forecast');
      console.error(error.status, error.responseJSON);
      // if there's no previous data, fail
      if (!this.data) {
        this.setStatus(STATUS.failed);
        return;
      }
    }
    this.screenIndex = 0;
    this.setStatus(STATUS.loaded);
  }

  async drawCanvas() {
    super.drawCanvas();

    // grab the first three or second set of three array elements
    const forecast = parse(this.data.properties.periods).slice(0 + 3 * this.screenIndex, 3 + this.screenIndex * 3);

    const days = forecast.map(Day => {
      const fill = {
        icon: { type: 'img', src: Day.icon },
        condition: Day.text,
        date: Day.dayName,
      };

      const { low, high } = Day;
      if (low !== undefined) {
        fill['value-lo'] = Math.round(low);
      }
      fill['value-hi'] = Math.round(high);

      return this.fillTemplate('day', fill);
    });

    const dayContainer = this.elem.querySelector('.day-container');
    dayContainer.innerHTML = '';
    dayContainer.append(...days);
    this.finishDraw();
  }
}

// the api provides the forecast in 12 hour increments, flatten to day increments with high and low temperatures
const parse = fullForecast => {
  const Days = [0, 1, 2, 3, 4, 5, 6];

  const dates = Days.map(shift => {
    const date = plusDays(startOfDay(new Date()), shift);
    return getShortDayName(date);
  });

  let destIndex = 0;
  const forecast = [];
  fullForecast.forEach(period => {
    if (!forecast[destIndex]) {
      forecast.push({
        dayName: '',
        low: undefined,
        high: undefined,
        text: undefined,
        icon: undefined,
      });
    }
    const fDay = forecast[destIndex];
    // high temperature will always be last in the source array so it will overwrite the low values assigned below
    fDay.icon = getLargeIcon(period.icon);
    fDay.text = shortenExtendedForecastText(period.shortForecast);
    fDay.dayName = dates[destIndex];

    preloadImg(fDay.icon);

    if (period.isDaytime) {
      fDay.high = period.temperature;
      destIndex += 1;
    } else {
      fDay.low = period.temperature;
    }
  });

  return forecast;
};

const regexList = [
  [/ and /gi, ' '],
  [/slight /gi, ''],
  [/chance /gi, ''],
  [/very /gi, ''],
  [/patchy /gi, ''],
  [/Areas Of /gi, ''],
  [/areas /gi, ''],
  [/dense /gi, ''],
  [/Thunderstorm/g, "T'Storm"],
];
const shortenExtendedForecastText = long => {
  const short = regexList.reduce((working, [regex, replace]) => working.replace(regex, replace), long);

  let conditions = short.split(' ');
  if (short.indexOf('then') !== -1) {
    conditions = short.split(' then ');
    conditions = conditions[1].split(' ');
  }

  let short1 = conditions[0].substr(0, 10);
  let short2 = '';
  if (conditions[1]) {
    if (short1.endsWith('.')) {
      short1 = short1.replace(/\./, '');
    } else {
      short2 = conditions[1].substr(0, 10);
    }

    if (short2 === 'Blowing') {
      short2 = '';
    }
  }
  let result = short1;
  if (short2 !== '') {
    result += ` ${short2}`;
  }

  return result;
};

registerDisplay(new ExtendedForecast(8, 'extended-forecast'));
