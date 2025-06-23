import { fetchAsync } from './fetch.js';

const getPoint = async (lat, lon) => {
	try {
		return await fetchAsync(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, "json");
	} catch (error) {
		console.log(`Unable to get point ${lat}, ${lon}`);
		console.error(error);
		return false;
	}
};

export {
	getPoint,
};
