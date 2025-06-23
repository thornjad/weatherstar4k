// location info display
import STATUS from './status.js';
import WeatherDisplay from './weatherdisplay.js';
import { registerDisplay } from './navigation.js';

class LocationInfo extends WeatherDisplay {
  constructor(navId, elemId) {
    super(navId, elemId, 'Location Info');

    this.okToDrawCurrentConditions = false;
    this.okToDrawCurrentDateTime = true;

    // set timing - this screen should display for a shorter time
    this.timing.baseDelay = 525;
    this.timing.delay = [
      { time: 8, si: 0 }, // 8 * 525ms = 4.2 seconds
    ];
  }

  async getData(weatherParameters, refresh) {
    if (!super.getData(weatherParameters, refresh)) {
      return;
    }

    // Format the location name (same as what gets logged to console)
    const locationName = `${this.weatherParameters.city}, ${this.weatherParameters.state}`;

    // Update the display elements
    this.elem.querySelector('.location-name').textContent = locationName;
    this.elem.querySelector('.station-id').textContent = this.weatherParameters.stationId;
    this.elem.querySelector('.radar-id').textContent = this.weatherParameters.radarId;
    this.elem.querySelector('.zone-id').textContent = this.weatherParameters.zoneId;
    this.elem.querySelector('.weather-office').textContent = this.weatherParameters.weatherOffice;
    this.elem.querySelector('.time-zone').textContent = this.weatherParameters.timeZone;

    // Set status to loaded
    this.setStatus(STATUS.loaded);
  }

  async drawCanvas() {
    super.drawCanvas();
    this.finishDraw();
  }
}

// register our display
const locationInfo = new LocationInfo(12, 'location-info');
registerDisplay(locationInfo);

export default locationInfo;
