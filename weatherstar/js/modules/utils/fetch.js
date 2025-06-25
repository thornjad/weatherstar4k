import { rewriteUrl } from './cors.js';

const fetchAsync = async (_url, responseType, _params = {}) => {
  // add user agent header to json request at api.weather.gov
  const headers = {};
  if (_url.toString().match(/api\.weather\.gov/)) {
    headers['user-agent'] =
      'Jmthornton WeatherStar; michael+weatherstar@jmthornton.net';
  }
  const params = {
    method: 'GET',
    mode: 'cors',
    type: 'GET',
    retryCount: 0,
    ..._params,
    headers,
  };

  let corsUrl = _url;
  if (params.cors === true) {
    corsUrl = rewriteUrl(_url);
  }
  const url = new URL(corsUrl, `${window.location.origin}/`);
  // url.protocol = window.location.hostname === 'localhost' ? url.protocol : window.location.protocol;
  if (params.data) {
    Object.keys(params.data).forEach(key => {
      const value = params.data[key];
      url.searchParams.append(key, value);
    });
  }

  const response = await fetchWithRetry(url, params, params.retryCount);

  if (!response.ok) {
    throw new Error(
      `Fetch error ${response.status} ${response.statusText} while fetching ${response.url}`
    );
  }
  switch (responseType) {
    case 'json':
      return response.json();
    case 'text':
      return response.text();
    case 'blob':
      return response.blob();
    default:
      return response;
  }
};

// Simplified fetch with retry logic
const fetchWithRetry = async (url, params, retries = 0) => {
  try {
    const response = await fetch(url, params);

    // Retry on 5xx errors if retries remain
    if (response.status >= 500 && response.status <= 599 && retries > 0) {
      // Call stillWaiting function on first retry
      if (typeof params.stillWaiting === 'function' && retries === params.retryCount) {
        params.stillWaiting();
      }

      await new Promise(resolve => setTimeout(resolve, getRetryDelay(params.retryCount - retries + 1)));
      return fetchWithRetry(url, params, retries - 1);
    }

    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, getRetryDelay(params.retryCount - retries + 1)));
      return fetchWithRetry(url, params, retries - 1);
    }
    throw error;
  }
};

const getRetryDelay = (retryNumber) => {
  switch (retryNumber) {
    case 1:
      return 1000;
    case 2:
      return 2000;
    case 3:
      return 5000;
    case 4:
      return 10_000;
    default:
      return 30_000;
  }
};

export { fetchAsync };
