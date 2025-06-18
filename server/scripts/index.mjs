import { json } from './modules/utils/fetch.mjs';
import noSleep from './modules/utils/nosleep.mjs';
import {
	message as navMessage, isPlaying, resize, resetStatuses, latLonReceived,
} from './modules/navigation.mjs';
import { round2 } from './modules/utils/units.mjs';

document.addEventListener('DOMContentLoaded', () => {
	init();
});

const init = () => {
	document.querySelector('#NavigateMenu').addEventListener('click', btnNavigateMenuClick);
	document.querySelector('#NavigateRefresh').addEventListener('click', btnNavigateRefreshClick);
	document.querySelector('#NavigateNext').addEventListener('click', btnNavigateNextClick);
	document.querySelector('#NavigatePrevious').addEventListener('click', btnNavigatePreviousClick);
	document.querySelector('#NavigatePlay').addEventListener('click', btnNavigatePlayClick);
	document.querySelector('#ToggleFullScreen').addEventListener('click', btnFullScreenClick);

	document.querySelector('#divTwc').addEventListener('mousemove', () => {
		if (document.fullscreenElement) updateFullScreenNavigate();
	});
	// local change detection when exiting full screen via ESC key (or other non button click methods)
	window.addEventListener('resize', fullScreenResizeCheck);
	fullScreenResizeCheck.wasFull = false;

	document.addEventListener('keydown', documentKeydown);
	document.addEventListener('touchmove', (e) => { if (document.fullscreenElement) e.preventDefault(); });

	// Start with play state enabled by default
	postMessage('navButton', 'play');

	// swipe functionality
	document.querySelector('#container').addEventListener('swiped-left', () => swipeCallBack('left'));
	document.querySelector('#container').addEventListener('swiped-right', () => swipeCallBack('right'));

	// Automatically geolocate user on page load
	autoGeolocate();
};

const autoGeolocate = async () => {
	if (!navigator.geolocation) {
		console.error('Geolocation is not supported by this browser');
		showGeolocationError();
		return;
	}

	try {
		const position = await getPosition();
		const { latitude, longitude } = position.coords;
		getForecastFromLatLon(latitude, longitude, true);
	} catch (error) {
		console.error('Error getting location:', error);
		showGeolocationError();
	}
};

const showGeolocationError = () => {
	const loadingDiv = document.querySelector('#loading');
	if (loadingDiv) {
		const instructionsDiv = loadingDiv.querySelector('.instructions');
		if (instructionsDiv) {
			instructionsDiv.textContent = 'Unable to get your location. Please enable location services and refresh the page.';
		}
	}
};

const doRedirectToGeometry = (geom, haveDataCallback) => {
	const latLon = { lat: round2(geom.y, 4), lon: round2(geom.x, 4) };
	// Load the data
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
	const img = document.querySelector('#ToggleFullScreen');
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
	const img = document.querySelector('#ToggleFullScreen');
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

const getForecastFromLatLon = (latitude, longitude, fromGps = false) => {
	doRedirectToGeometry({ y: latitude, x: longitude }, (point) => {
		const location = point.properties.relativeLocation.properties;
		// Update the display with location name
		console.log(`Location: ${location.city}, ${location.state}`);
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

// expose functions for external use
window.getForecastFromLatLon = getForecastFromLatLon;
