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

  const url = new URL(_url, `${window.location.origin}/`);
  if (params.data) {
    Object.keys(params.data).forEach(key => {
      const value = params.data[key];
      url.searchParams.append(key, value);
    });
  }

  try {
    const response = await fetchWithRetry(url, params, params.retryCount);

    if (!response.ok) {
      // HTTP error responses (like 503) are not CORS errors - they're valid responses with error status
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
  } catch (error) {
    // Only identify as CORS error if it's a network-level failure (no response received)
    // HTTP errors (4xx, 5xx) are legitimate responses and should not be treated as CORS errors
    if ((error.message.includes('CORS') || error.message.includes('cross-origin') || 
         error.name === 'TypeError' && error.message.includes('Failed to fetch')) &&
        !error.message.includes('Fetch error')) {
      throw new Error(`CORS error: Unable to fetch data from ${new URL(_url).hostname}`);
    }
    throw error;
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
