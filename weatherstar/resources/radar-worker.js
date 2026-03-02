import { removeDopplerRadarImageNoise } from './radar-utils.js';
import { RADAR_FULL_SIZE, RADAR_FINAL_SIZE } from './radar-constants.js';

// crop canvas dimensions (constants)
const CROP_WIDTH = 240;
const CROP_HEIGHT = 163;

// reusable OffscreenCanvases -- allocated once, reused on every message
const radarCanvas = new OffscreenCanvas(RADAR_FULL_SIZE.width, RADAR_FULL_SIZE.height);
const radarContext = radarCanvas.getContext('2d');
radarContext.imageSmoothingEnabled = false;

const croppedRadarCanvas = new OffscreenCanvas(CROP_WIDTH, CROP_HEIGHT);
const croppedRadarContext = croppedRadarCanvas.getContext('2d');
croppedRadarContext.imageSmoothingEnabled = false;

const stretchCanvas = new OffscreenCanvas(RADAR_FINAL_SIZE.width, RADAR_FINAL_SIZE.height);
const stretchContext = stretchCanvas.getContext('2d');
stretchContext.imageSmoothingEnabled = false;

onmessage = async (e) => {
	const {
		url, RADAR_HOST, OVERRIDES, radarSourceXY,
	} = e.data;

	// get the image
	const modifiedRadarUrl = OVERRIDES.RADAR_HOST ? url.replace(RADAR_HOST, OVERRIDES.RADAR_HOST) : url;
	const radarResponsePromise = fetch(modifiedRadarUrl);

	// calculate offsets and sizes
	const radarSource = {
		width: CROP_WIDTH,
		height: CROP_HEIGHT,
		x: Math.round(radarSourceXY.x / 2),
		y: Math.round(radarSourceXY.y / 2),
	};

	// test response
	const radarResponse = await radarResponsePromise;
	if (!radarResponse.ok) throw new Error(`Unable to fetch radar error ${radarResponse.status} ${radarResponse.statusText} from ${radarResponse.url}`);

	// get the blob
	const radarImgBlob = await radarResponse.blob();

	// assign to an html image element
	const radarImgElement = await createImageBitmap(radarImgBlob);
	// draw the entire image
	radarContext.clearRect(0, 0, RADAR_FULL_SIZE.width, RADAR_FULL_SIZE.height);
	radarContext.drawImage(radarImgElement, 0, 0, RADAR_FULL_SIZE.width, RADAR_FULL_SIZE.height);
	radarImgElement.close();

	// crop the radar image without scaling
	croppedRadarContext.clearRect(0, 0, CROP_WIDTH, CROP_HEIGHT);
	croppedRadarContext.drawImage(radarCanvas, radarSource.x, radarSource.y, croppedRadarCanvas.width, croppedRadarCanvas.height, 0, 0, croppedRadarCanvas.width, croppedRadarCanvas.height);

	// clean the image
	removeDopplerRadarImageNoise(croppedRadarContext);

	// stretch the radar image
	stretchContext.clearRect(0, 0, RADAR_FINAL_SIZE.width, RADAR_FINAL_SIZE.height);
	stretchContext.drawImage(croppedRadarCanvas, 0, 0, radarSource.width, radarSource.height, 0, 0, RADAR_FINAL_SIZE.width, RADAR_FINAL_SIZE.height);

	const stretchedRadar = stretchCanvas.transferToImageBitmap();

	postMessage(stretchedRadar, [stretchedRadar]);
};
