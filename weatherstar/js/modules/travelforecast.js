// travel forecast display
import STATUS from './status.js';
import { fetchAsync } from './utils/fetch.js';
import { getSmallIcon } from './icons.js';
import { getDayName, plusDays } from './utils/date-utils.js';
import WeatherDisplay from './weatherdisplay.js';
import { isPlaying, msg, registerDisplay } from './navigation.js';
import { getTravelCities } from '../data/json-loader.js';

class TravelForecast extends WeatherDisplay {
  constructor(navId, elemId) {
    // special height and width for scrolling
    super(navId, elemId, 'Travel Forecast');

    // Travel forecast specific timing properties
    this.scrollStartTime = 0;
    this.scrollDuration = 15000; // 15 seconds total for travel forecast
    this.scrollStep = 30; // 30ms between scroll updates
    this.scrollOffset = 0;
    this.maxScrollOffset = 0;
    this.isScrolling = false;

    // add previous data cache
    this.previousData = [];
  }

  async getData(weatherParameters, refresh) {
    // super checks for enabled
    if (!super.getData(weatherParameters, refresh)) {
      return;
    }

    // Get travel cities data
    const travelCities = await getTravelCities();

    if (!travelCities || travelCities.length === 0) {
      this.setStatus(STATUS.noData);
      return;
    }

    // clear stored data if not refresh
    if (!refresh) {
      this.previousData = [];
    }

    const forecastPromises = travelCities.map(async (city, index) => {
      try {
        // get point then forecast
        if (!city.point) {
          throw new Error('No pre-loaded point');
        }
        let forecast;
        try {
          forecast = await fetchAsync(
            `https://api.weather.gov/gridpoints/${city.point.wfo}/${city.point.x},${city.point.y}/forecast`,
            'json',
            {
              data: {
                units: 'us',
              },
            }
          );
          // store for the next run
          this.previousData[index] = forecast;
        } catch (e) {
          // if there's previous data use it
          if (this.previousData?.[index]) {
            forecast = this.previousData?.[index];
          } else {
            // otherwise re-throw for the standard error handling
            throw e;
          }
        }
        // determine today or tomorrow (shift periods by 1 if tomorrow)
        const todayShift = forecast.properties.periods[0].isDaytime ? 0 : 1;
        // return a pared-down forecast
        return {
          today: todayShift === 0,
          high: forecast.properties.periods[todayShift].temperature,
          low: forecast.properties.periods[todayShift + 1].temperature,
          name: city.Name,
          icon: getSmallIcon(forecast.properties.periods[todayShift].icon),
        };
      } catch (error) {
        console.error(`GetTravelWeather for ${city.Name} failed`);
        console.error(error.status, error.responseJSON);
        return { name: city.Name, error: true };
      }
    });

    // wait for all forecasts
    const forecasts = await Promise.all(forecastPromises);
    this.data = forecasts;

    // test for some data available in at least one forecast
    const hasData = this.data.some(forecast => forecast.high);
    if (!hasData) {
      this.setStatus(STATUS.noData);
      return;
    }

    this.setStatus(STATUS.loaded);
    this.drawLongCanvas();
  }

  async drawLongCanvas() {
    // get the element and populate
    const list = this.elem.querySelector('.travel-lines');
    list.innerHTML = '';

    // set up variables
    const cities = this.data;

    const lines = cities
      .map(city => {
        if (city.error) {
          return false;
        }
        const fillValues = {
          city,
        };

        // check for forecast data
        if (city.icon) {
          fillValues.city = city.name;
          // get temperatures and convert if necessary
          const { low, high } = city;

          // convert to strings with no decimal
          const lowString = Math.round(low).toString();
          const highString = Math.round(high).toString();

          fillValues.low = lowString;
          fillValues.high = highString;
          const { icon } = city;

          fillValues.icon = { type: 'img', src: icon };
        } else {
          fillValues.error = 'NO TRAVEL DATA AVAILABLE';
        }
        return this.fillTemplate('travel-row', fillValues);
      })
      .filter(d => d);
    list.append(...lines);

    // Calculate timing based on content height
    this.calculateTravelTiming();
  }

  calculateTravelTiming() {
    this.timing.baseDelay = 30;
    const pagesFloat = this.data.length / 4;
    const pages = Math.floor(pagesFloat) - 2;
    const extra = pagesFloat % 1;
    const timingStep = 75 * 4;
    this.timing.delay = [150 + timingStep];
    for (let i = 0; i < pages; i += 1) {
      this.timing.delay.push(timingStep);
    }
    if (extra !== 0) {
      this.timing.delay.push(Math.round(extra * 75));
    }
    this.timing.delay.push(150);
    this.timing.totalScreens = 1;
  }

  // Override the checkNavigation method for travel forecast scrolling
  checkNavigation(timestamp) {
    if (!this.isActive || !isPlaying()) {
      return;
    }

    const elapsed = timestamp - this.startTime;
    const baseDelay = this.timing.baseDelay || 30;
    const currentCount = Math.floor(elapsed / baseDelay);

    this.updateScrollPosition(currentCount);

    if (currentCount >= this.timing.delay.reduce((sum, delay) => sum + delay, 0)) {
      this.sendNavDisplayMessage(msg.response.next);
    }
  }

  updateScrollPosition(count) {
    let offsetY = Math.min(this.elem.querySelector('.travel-lines').offsetHeight - 289, count - 150);

    if (offsetY < 0) {
      offsetY = 0;
    }

    const mainElement = this.elem.querySelector('.main');
    if (mainElement) {
      mainElement.scrollTo(0, offsetY);
    }
  }

  async drawCanvas() {
    // there are technically 2 canvases: the standard canvas and the extra-long canvas that contains the complete
    // list of cities. The second canvas is copied into the standard canvas to create the scroll
    super.drawCanvas();

    // set up variables
    const cities = this.data;

    this.elem.querySelector('.header .title.dual .bottom').innerHTML = `For ${getTravelCitiesDayName(cities)}`;

    this.finishDraw();
  }

  async showCanvas() {
    // Reset scroll state when showing canvas
    this.isScrolling = false;
    this.scrollOffset = 0;

    // special to travel forecast to draw the remainder of the canvas
    await this.drawCanvas();
    super.showCanvas();
  }

  hideCanvas() {
    // Clean up scroll callback when hiding
    this.isScrolling = false;
    super.hideCanvas();
  }

  // necessary to get the lastest long canvas when scrolling
  getLongCanvas() {
    return this.longCanvas;
  }
}

// effectively returns early on the first found date
const getTravelCitiesDayName = cities =>
  cities.reduce((dayName, city) => {
    if (city && dayName === '') {
      // today or tomorrow
      const day = plusDays(new Date(), city.today ? 0 : 1);
      // return the day
      return getDayName(day);
    }
    return dayName;
  }, '');

// register display, not active by default
registerDisplay(new TravelForecast(5, 'travel'));
