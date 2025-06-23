// navigation handles progress, next/previous and initial load messages from the parent frame
import STATUS from './status.js';
import { fetchAsync } from './utils/fetch.js';
import { getPoint } from './utils/weather.js';
import noSleep from './utils/nosleep.js';
import { wrap } from './utils/calc.js';

document.addEventListener('DOMContentLoaded', () => {
	init();
});

const displays = [];
let playing = false;
let progress;
const weatherParameters = {};

const init = async () => {
	// set up resize handler
	window.addEventListener('resize', resize);
	resize();
};

const message = (data) => {
	// dispatch event
	if (!data.type) return false;
	if (data.type === 'navButton') return handleNavButton(data.message);
	return console.error(`Unknown event ${data.type}`);
};

const getWeather = async (latLon, haveDataCallback) => {
	// get initial weather data
	const point = await getPoint(latLon.lat, latLon.lon);

	if (typeof haveDataCallback === 'function') haveDataCallback(point);

	// get stations
	const stations = await fetchAsync(point.properties.observationStations, "json");

	const StationId = stations.features[0].properties.stationIdentifier;

	let { city } = point.properties.relativeLocation.properties;
	const { state } = point.properties.relativeLocation.properties;

	if (StationId in StationInfo) {
		city = StationInfo[StationId].city;
		[city] = city.split('/');
		city = city.replace(/\s+$/, '');
	}

	// populate the weather parameters
	weatherParameters.latitude = latLon.lat;
	weatherParameters.longitude = latLon.lon;
	weatherParameters.zoneId = point.properties.forecastZone.substr(-6);
	weatherParameters.radarId = point.properties.radarStation.substr(-3);
	weatherParameters.stationId = StationId;
	weatherParameters.weatherOffice = point.properties.cwa;
	weatherParameters.city = city;
	weatherParameters.state = state;
	weatherParameters.timeZone = point.properties.timeZone;
	weatherParameters.forecast = point.properties.forecast;
	weatherParameters.forecastGridData = point.properties.forecastGridData;
	weatherParameters.stations = stations.features;

	// reset the scroll
	postMessage({ type: 'current-weather-scroll', method: 'reload' });

	// draw the progress canvas and hide others
	hideAllCanvases();
	document.querySelector('#loading').style.display = 'none';
	if (progress) {
		await progress.drawCanvas();
		progress.showCanvas();
	}

	// call for new data on each display
	displays.forEach((display) => display.getData(weatherParameters));
};

// receive a status update from a module {id, value}
const updateStatus = (value) => {
	if (value.id < 0) return;
	if (!progress) return;
	progress.drawCanvas(displays, countLoadedDisplays());

	// first display is hazards and it must load before evaluating the first display
	if (displays[0].status === STATUS.loading) return;

	// calculate first enabled display
	const firstDisplayIndex = displays.findIndex((display) => display?.timing?.totalScreens > 0);

	// value.id = 0 is hazards, if they fail to load hot-wire a new value.id to the current display to see if it needs to be loaded
	// typically this plays out as current conditions loads, then hazards fails.
	if (value.id === 0 && (value.status === STATUS.failed || value.status === STATUS.retrying)) {
		value.id = firstDisplayIndex;
		value.status = displays[firstDisplayIndex].status;
	}

	// if hazards data arrives after the firstDisplayIndex loads, then we need to hot wire this to the first display
	if (value.id === 0 && value.status === STATUS.loaded && displays[0].timing.totalScreens === 0) {
		value.id = firstDisplayIndex;
		value.status = displays[firstDisplayIndex].status;
	}

	// if this is the first display and we're playing, load it up so it starts playing
	if (isPlaying() && value.id === firstDisplayIndex && value.status === STATUS.loaded) {
		navTo(msg.command.firstFrame);
	}
};

// note: a display that is "still waiting"/"retrying" is considered loaded intentionally
// the weather.gov api has long load times for some products when you are the first
// requester for the product after the cache expires
const countLoadedDisplays = () => displays.reduce((acc, display) => {
	if (display?.showOnProgress === false) return acc;
	if (display?.status !== STATUS.loading) return acc + 1;
	return acc;
}, 0);

const hideAllCanvases = () => {
	displays.forEach((display) => display?.hideCanvas());
};

// is playing interface
const isPlaying = () => playing;

// navigation message constants
const msg = {
	response: {	// display to navigation
		previous: Symbol('previous'),		// already at first frame, calling function should switch to previous canvas
		inProgress: Symbol('inProgress'),	// have data to display, calling function should do nothing
		next: Symbol('next'),				// end of frames reached, calling function should switch to next canvas
	},
	command: {	// navigation to display
		firstFrame: Symbol('firstFrame'),
		previousFrame: Symbol('previousFrame'),
		nextFrame: Symbol('nextFrame'),
		lastFrame: Symbol('lastFrame'),	// used when navigating backwards from the begining of the next canvas
	},
};

// receive navigation messages from displays
const displayNavMessage = (myMessage) => {
	if (myMessage.type === msg.response.previous) loadDisplay(-1);
	if (myMessage.type === msg.response.next) loadDisplay(1);
};

// navigate to next or previous
const navTo = (direction) => {
	// test for a current display
	const current = currentDisplay();
	progress.hideCanvas();
	if (!current) {
		// special case for no active displays (typically on progress screen)
		// find the first ready display
		let firstDisplay;
		let displayCount = 0;
		do {
			if (displays[displayCount]?.status === STATUS.loaded && displays[displayCount]?.timing?.totalScreens > 0) firstDisplay = displays[displayCount];
			displayCount += 1;
		} while (!firstDisplay && displayCount < displays.length);

		if (!firstDisplay) return;

		firstDisplay.navNext(msg.command.firstFrame);
		firstDisplay.showCanvas();
		return;
	}
	if (direction === msg.command.nextFrame) currentDisplay().navNext();
	if (direction === msg.command.previousFrame) currentDisplay().navPrev();
};

// find the next or previous available display
const loadDisplay = (direction) => {
	const totalDisplays = displays.length;
	const curIdx = currentDisplayIndex();
	// If no current display is active, start from index 0
	const startIdx = curIdx >= 0 ? curIdx : 0;
	let idx;
	for (let i = 0; i < totalDisplays; i += 1) {
		// convert form simple 0-10 to start at current display index +/-1 and wrap
		idx = wrap(startIdx + (i + 1) * direction, totalDisplays);
		if (displays[idx]?.status === STATUS.loaded && displays[idx]?.timing?.totalScreens > 0) break;
	}
	const newDisplay = displays[idx];
	// hide all displays
	hideAllCanvases();
	// show the new display and navigate to an appropriate display
	if (direction < 0) newDisplay.showCanvas(msg.command.lastFrame);
	if (direction > 0) newDisplay.showCanvas(msg.command.firstFrame);
};

// get the current display index or value
const currentDisplayIndex = () => displays.findIndex((display) => display?.active);
const currentDisplay = () => {
	const index = currentDisplayIndex();
	return index >= 0 ? displays[index] : null;
};

const setPlaying = (newValue) => {
	playing = newValue;
	const playButton = document.querySelector('#NavigatePlay');

	if (playing) {
		noSleep(true);
		playButton.title = 'Pause';
		playButton.src = 'images/nav/ic_pause_white_24dp_2x.png';
	} else {
		noSleep(false);
		playButton.title = 'Play';
		playButton.src = 'images/nav/ic_play_arrow_white_24dp_2x.png';
	}
	// if we're playing and on the progress screen jump to the next screen
	if (!progress) return;
	if (playing && !currentDisplay()) navTo(msg.command.firstFrame);
};

// handle all navigation buttons
const handleNavButton = (button) => {
	switch (button) {
		case 'play':
			setPlaying(true);
			break;
		case 'playToggle':
			setPlaying(!playing);
			break;
		case 'stop':
			setPlaying(false);
			break;
		case 'next':
			setPlaying(false);
			navTo(msg.command.nextFrame);
			break;
		case 'previous':
			setPlaying(false);
			navTo(msg.command.previousFrame);
			break;
		case 'menu':
			setPlaying(false);
			progress.showCanvas();
			hideAllCanvases();
			break;
		default:
			console.error(`Unknown navButton ${button}`);
	}
};

// return the specificed display
const getDisplay = (index) => displays[index];

// resize the container on a page resize
const resize = () => {
	const targetWidth = 640;
	const widthZoomPercent = (document.querySelector('#divTwcBottom').getBoundingClientRect().width) / targetWidth;
	const heightZoomPercent = (window.innerHeight) / 480;

	const scale = Math.min(widthZoomPercent, heightZoomPercent);
	if (scale < 1.0 || document.fullscreenElement) {
		document.querySelector('#container').style.zoom = scale;
	} else {
		document.querySelector('#container').style.zoom = 'unset';
	}
};

// reset all statuses to loading on all displays, used to keep the progress bar accurate during refresh
const resetStatuses = () => {
	displays.forEach((display) => { if (display) display.status = STATUS.loading; });
};

// allow displays to register themselves
const registerDisplay = (display) => {
	if (displays[display.navId]) console.warn(`Display nav ID ${display.navId} already in use`);
	displays[display.navId] = display;
};

// special registration method for progress display
const registerProgress = (_progress) => {
	progress = _progress;
};

const latLonReceived = (data, haveDataCallback) => {
	getWeather(data, haveDataCallback);
};

const timeZone = () => weatherParameters.timeZone;

export {
	updateStatus,
	displayNavMessage,
	resetStatuses,
	isPlaying,
	resize,
	registerDisplay,
	registerProgress,
	currentDisplay,
	getDisplay,
	msg,
	message,
	latLonReceived,
	timeZone,
};
