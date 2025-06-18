import { json } from './modules/utils/fetch.mjs';
import noSleep from './modules/utils/nosleep.mjs';
import {
	message as navMessage, isPlaying, resize, resetStatuses, latLonReceived,
} from './modules/navigation.mjs';
import { round2 } from './modules/utils/units.mjs';
import settings from './modules/settings.mjs';
import AutoComplete from './modules/autocomplete.mjs';

document.addEventListener('DOMContentLoaded', () => {
	init();
	getCustomCode();
});

const categories = [
	'Land Features',
	'Bay', 'Channel', 'Cove', 'Dam', 'Delta', 'Gulf', 'Lagoon', 'Lake', 'Ocean', 'Reef', 'Reservoir', 'Sea', 'Sound', 'Strait', 'Waterfall', 'Wharf', // Water Features
	'Amusement Park', 'Historical Monument', 'Landmark', 'Tourist Attraction', 'Zoo', // POI/Arts and Entertainment
	'College', // POI/Education
	'Beach', 'Campground', 'Golf Course', 'Harbor', 'Nature Reserve', 'Other Parks and Outdoors', 'Park', 'Racetrack',
	'Scenic Overlook', 'Ski Resort', 'Sports Center', 'Sports Field', 'Wildlife Reserve', // POI/Parks and Outdoors
	'Airport', 'Ferry', 'Marina', 'Pier', 'Port', 'Resort', // POI/Travel
	'Postal', 'Populated Place',
];
const category = categories.join(',');
const TXT_ADDRESS_SELECTOR = '#txtAddress';
const TOGGLE_FULL_SCREEN_SELECTOR = '#ToggleFullScreen';
const BNT_GET_GPS_SELECTOR = '#btnGetGps';

const init = () => {
	document.querySelector(TXT_ADDRESS_SELECTOR).addEventListener('focus', (e) => {
		e.target.select();
	});

	document.querySelector('#NavigateMenu').addEventListener('click', btnNavigateMenuClick);
	document.querySelector('#NavigateRefresh').addEventListener('click', btnNavigateRefreshClick);
	document.querySelector('#NavigateNext').addEventListener('click', btnNavigateNextClick);
	document.querySelector('#NavigatePrevious').addEventListener('click', btnNavigatePreviousClick);
	document.querySelector('#NavigatePlay').addEventListener('click', btnNavigatePlayClick);
	document.querySelector(TOGGLE_FULL_SCREEN_SELECTOR).addEventListener('click', btnFullScreenClick);
	const btnGetGps = document.querySelector(BNT_GET_GPS_SELECTOR);
	btnGetGps.addEventListener('click', btnGetGpsClick);
	if (!navigator.geolocation) btnGetGps.style.display = 'none';

	document.querySelector('#divTwc').addEventListener('mousemove', () => {
		if (document.fullscreenElement) updateFullScreenNavigate();
	});
	// local change detection when exiting full screen via ESC key (or other non button click methods)
	window.addEventListener('resize', fullScreenResizeCheck);
	fullScreenResizeCheck.wasFull = false;

	document.querySelector('#btnGetLatLng').addEventListener('click', () => autoComplete.directFormSubmit());

	document.addEventListener('keydown', documentKeydown);
	document.addEventListener('touchmove', (e) => { if (document.fullscreenElement) e.preventDefault(); });

	const autoComplete = new AutoComplete(document.querySelector(TXT_ADDRESS_SELECTOR), {
		serviceUrl: 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest',
		deferRequestBy: 300,
		paramName: 'text',
		params: {
			f: 'json',
			countryCode: 'USA',
			category,
			maxSuggestions: 10,
		},
		dataType: 'json',
		transformResult: (response) => ({
			suggestions: response.suggestions.map((i) => ({
				value: i.text,
				data: i.magicKey,
			})),
		}),
		minChars: 3,
		showNoSuggestionNotice: true,
		noSuggestionNotice: 'No results found. Please try a different search string.',
		onSelect(suggestion) { autocompleteOnSelect(suggestion); },
		width: 490,
	});
	window.autoComplete = autoComplete;

	// Load location from localStorage
	const query = localStorage.getItem('latLonQuery');
	const latLon = localStorage.getItem('latLon');
	const fromGPS = localStorage.getItem('latLonFromGPS');
	if (query && latLon && !fromGPS) {
		const txtAddress = document.querySelector(TXT_ADDRESS_SELECTOR);
		txtAddress.value = query;
		loadData(JSON.parse(latLon));
	}
	if (fromGPS) {
		btnGetGpsClick();
	}

	const play = localStorage.getItem('play');
	if (play === null || play === 'true') postMessage('navButton', 'play');

	document.querySelector('#btnClearQuery').addEventListener('click', () => {
		document.querySelector('#spanCity').innerHTML = '';
		document.querySelector('#spanState').innerHTML = '';
		document.querySelector('#spanStationId').innerHTML = '';
		document.querySelector('#spanRadarId').innerHTML = '';
		document.querySelector('#spanZoneId').innerHTML = '';

		localStorage.removeItem('play');
		postMessage('navButton', 'play');

		localStorage.removeItem('latLonQuery');
		localStorage.removeItem('latLon');
		localStorage.removeItem('latLonFromGPS');
		document.querySelector(BNT_GET_GPS_SELECTOR).classList.remove('active');
	});

	// swipe functionality
	document.querySelector('#container').addEventListener('swiped-left', () => swipeCallBack('left'));
	document.querySelector('#container').addEventListener('swiped-right', () => swipeCallBack('right'));
};

const autocompleteOnSelect = async (suggestion) => {
	const data = await json('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find', {
		data: {
			text: suggestion.value,
			magicKey: suggestion.data,
			f: 'json',
		},
	});

	const loc = data.locations[0];
	if (loc) {
		localStorage.removeItem('latLonFromGPS');
		document.querySelector(BNT_GET_GPS_SELECTOR).classList.remove('active');
		doRedirectToGeometry(loc.feature.geometry);
	} else {
		console.error('An unexpected error occurred. Please try a different search string.');
	}
};

const doRedirectToGeometry = (geom, haveDataCallback) => {
	const latLon = { lat: round2(geom.y, 4), lon: round2(geom.x, 4) };
	// Save the query
	localStorage.setItem('latLonQuery', document.querySelector(TXT_ADDRESS_SELECTOR).value);
	localStorage.setItem('latLon', JSON.stringify(latLon));

	// get the data
	loadData(latLon, haveDataCallback);
};

const btnFullScreenClick = () => {
	if (document.fullscreenElement) {
		exitFullscreen();
	} else {
		enterFullScreen();
	}

	if (isPlaying()) {
		noSleep(true);
	} else {
		noSleep(false);
	}

	updateFullScreenNavigate();

	return false;
};

const enterFullScreen = () => {
	const element = document.querySelector('#divTwc');

	// Supports most browsers and their versions.
	const requestMethod = element.requestFullScreen || element.webkitRequestFullScreen
		|| element.mozRequestFullScreen || element.msRequestFullscreen;

	if (requestMethod) {
		// Native full screen.
		requestMethod.call(element, { navigationUI: 'hide' });
	} else {
		// iOS doesn't support FullScreen API.
		window.scrollTo(0, 0);
	}
	resize();
	updateFullScreenNavigate();

	// change hover text and image
	const img = document.querySelector(TOGGLE_FULL_SCREEN_SELECTOR);
	img.src = 'images/nav/ic_fullscreen_exit_white_24dp_2x.png';
	img.title = 'Exit fullscreen';
};

const exitFullscreen = () => {
	// exit full-screen

	if (document.exitFullscreen) {
		// Chrome 71 broke this if the user pressed F11 to enter full screen mode.
		document.exitFullscreen();
	} else if (document.webkitExitFullscreen) {
		document.webkitExitFullscreen();
	} else if (document.mozCancelFullScreen) {
		document.mozCancelFullScreen();
	} else if (document.msExitFullscreen) {
		document.msExitFullscreen();
	}
	resize();
	exitFullScreenVisibilityChanges();
};

const exitFullScreenVisibilityChanges = () => {
	// change hover text and image
	const img = document.querySelector(TOGGLE_FULL_SCREEN_SELECTOR);
	img.src = 'images/nav/ic_fullscreen_white_24dp_2x.png';
	img.title = 'Enter fullscreen';
	document.querySelector('#divTwc').classList.remove('no-cursor');
	const divTwcBottom = document.querySelector('#divTwcBottom');
	divTwcBottom.classList.remove('hidden');
	divTwcBottom.classList.add('visible');
};

const btnNavigateMenuClick = () => {
	postMessage('navButton', 'menu');
	return false;
};

const loadData = (_latLon, haveDataCallback) => {
	// if latlon is provided store it locally
	if (_latLon) loadData.latLon = _latLon;
	// get the data
	const { latLon } = loadData;
	// if there's no data stop
	if (!latLon) return;

	document.querySelector(TXT_ADDRESS_SELECTOR).blur();
	latLonReceived(latLon, haveDataCallback);
};

const swipeCallBack = (direction) => {
	switch (direction) {
		case 'left':
			btnNavigateNextClick();
			break;

		case 'right':
		default:
			btnNavigatePreviousClick();
			break;
	}
};

const btnNavigateRefreshClick = () => {
	resetStatuses();
	loadData();

	return false;
};

const btnNavigateNextClick = () => {
	postMessage('navButton', 'next');

	return false;
};

const btnNavigatePreviousClick = () => {
	postMessage('navButton', 'previous');

	return false;
};

let navigateFadeIntervalId = null;

const updateFullScreenNavigate = () => {
	document.activeElement.blur();
	const divTwcBottom = document.querySelector('#divTwcBottom');
	divTwcBottom.classList.remove('hidden');
	divTwcBottom.classList.add('visible');
	document.querySelector('#divTwc').classList.remove('no-cursor');

	if (navigateFadeIntervalId) {
		clearTimeout(navigateFadeIntervalId);
		navigateFadeIntervalId = null;
	}

	navigateFadeIntervalId = setTimeout(() => {
		if (document.fullscreenElement) {
			divTwcBottom.classList.remove('visible');
			divTwcBottom.classList.add('hidden');
			document.querySelector('#divTwc').classList.add('no-cursor');
		}
	}, 2000);
};

const documentKeydown = (e) => {
	// don't trigger on ctrl/alt/shift modified key
	if (e.altKey || e.ctrlKey || e.shiftKey) return false;
	const { key } = e;

	if (document.fullscreenElement || document.activeElement === document.body) {
		switch (key) {
			case ' ': // Space
				// don't scroll
				e.preventDefault();
				btnNavigatePlayClick();
				return false;

			case 'ArrowRight':
			case 'PageDown':
				// don't scroll
				e.preventDefault();
				btnNavigateNextClick();
				return false;

			case 'ArrowLeft':
			case 'PageUp':
				// don't scroll
				e.preventDefault();
				btnNavigatePreviousClick();
				return false;

			case 'ArrowUp': // Home
				e.preventDefault();
				btnNavigateMenuClick();
				return false;

			case '0': // "O" Restart
				btnNavigateRefreshClick();
				return false;

			case 'F':
			case 'f':
				btnFullScreenClick();
				return false;

			default:
		}
	}
	return false;
};

const btnNavigatePlayClick = () => {
	postMessage('navButton', 'playToggle');

	return false;
};

// post a message to the iframe
const postMessage = (type, myMessage = {}) => {
	navMessage({ type, message: myMessage });
};

const getPosition = async () => new Promise((resolve) => {
	navigator.geolocation.getCurrentPosition(resolve);
});

const btnGetGpsClick = async () => {
	if (!navigator.geolocation) return;
	const btn = document.querySelector(BNT_GET_GPS_SELECTOR);

	// toggle first
	if (btn.classList.contains('active')) {
		btn.classList.remove('active');
		localStorage.removeItem('latLonFromGPS');
		return;
	}

	// set gps active
	btn.classList.add('active');

	// get position
	const position = await getPosition();
	const { latitude, longitude } = position.coords;

	getForecastFromLatLon(latitude, longitude, true);
};

const getForecastFromLatLon = (latitude, longitude, fromGps = false) => {
	const txtAddress = document.querySelector(TXT_ADDRESS_SELECTOR);
	txtAddress.value = `${round2(latitude, 4)}, ${round2(longitude, 4)}`;

	doRedirectToGeometry({ y: latitude, x: longitude }, (point) => {
		const location = point.properties.relativeLocation.properties;
		// Save the query
		const query = `${location.city}, ${location.state}`;
		localStorage.setItem('latLon', JSON.stringify({ lat: latitude, lon: longitude }));
		localStorage.setItem('latLonQuery', query);
		localStorage.setItem('latLonFromGPS', fromGps);
		txtAddress.value = `${location.city}, ${location.state}`;
	});
};

// check for change in full screen triggered by browser and run local functions
const fullScreenResizeCheck = () => {
	if (fullScreenResizeCheck.wasFull && !document.fullscreenElement) {
		// leaving full screen
		exitFullScreenVisibilityChanges();
	}
	if (!fullScreenResizeCheck.wasFull && document.fullscreenElement) {
		// entering full screen
		// can't do much here because a UI interaction is required to change the full screen div element
	}

	// store state of fullscreen element for next change detection
	fullScreenResizeCheck.wasFull = !!document.fullscreenElement;
};

const getCustomCode = async () => {
	// fetch the custom file and see if it returns a 200 status
	const response = await fetch('scripts/custom.js', { method: 'HEAD' });
	if (response.ok) {
		// add the script element to the page
		const customElem = document.createElement('script');
		customElem.src = 'scripts/custom.js';
		customElem.type = 'text/javascript';
		document.body.append(customElem);
	}
};

// expose functions for external use
window.getForecastFromLatLon = getForecastFromLatLon;
