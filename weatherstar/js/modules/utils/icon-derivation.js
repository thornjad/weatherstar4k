// Icon derivation utility function
// Derives weather icons from observation data when the API doesn't provide them

export const deriveIconFromObservation = obs => {
  // Determine if it's nighttime based on current time
  const now = new Date();
  const hour = now.getHours();
  const isNightTime = hour < 6 || hour >= 18;

  // Get text description and convert to lowercase for easier matching
  const textDesc = (obs.textDescription || '').toLowerCase();
  const presentWeather = obs.presentWeather || [];
  const cloudLayers = obs.cloudLayers || [];
  const visibility = obs.visibility?.value || 10000; // Default to 10km if not available

  // Check for precipitation types in presentWeather
  const hasRain = presentWeather.some(w => w.includes('rain') || w.includes('drizzle'));
  const hasSnow = presentWeather.some(w => w.includes('snow'));
  const hasSleet = presentWeather.some(w => w.includes('sleet') || w.includes('freezing'));
  const hasThunderstorm = presentWeather.some(w => w.includes('thunderstorm') || w.includes('thunder'));

  // Check cloud coverage
  const isOvercast = cloudLayers.some(layer => layer.amount === 'OVC');
  const isBroken = cloudLayers.some(layer => layer.amount === 'BKN');
  const isScattered = cloudLayers.some(layer => layer.amount === 'SCT');
  const isFew = cloudLayers.some(layer => layer.amount === 'FEW');

  // Check for fog conditions
  const isFoggy = visibility < 1000 || textDesc.includes('fog') || textDesc.includes('mist');

  // Determine condition name based on conditions
  let conditionName;

  if (hasThunderstorm) {
    conditionName = isNightTime ? 'tsra-n' : 'tsra';
  } else if (hasSleet) {
    conditionName = isNightTime ? 'sleet-n' : 'sleet';
  } else if (hasSnow) {
    conditionName = isNightTime ? 'snow-n' : 'snow';
  } else if (hasRain) {
    if (textDesc.includes('shower') || textDesc.includes('drizzle')) {
      conditionName = isNightTime ? 'rain_showers-n' : 'rain_showers';
    } else {
      conditionName = isNightTime ? 'rain-n' : 'rain';
    }
  } else if (isFoggy) {
    conditionName = isNightTime ? 'fog-n' : 'fog';
  } else if (isOvercast) {
    conditionName = isNightTime ? 'ovc-n' : 'ovc';
  } else if (isBroken) {
    conditionName = isNightTime ? 'bkn-n' : 'bkn';
  } else if (isScattered || isFew) {
    conditionName = isNightTime ? 'sct-n' : 'sct';
  } else {
    // Default to clear/sunny
    conditionName = isNightTime ? 'skc-n' : 'skc';
  }

  // Return the proper URL format that the icon functions expect
  const timeOfDay = isNightTime ? 'night' : 'day';
  return `https://api.weather.gov/icons/land/${timeOfDay}/${conditionName},80?size=large`;
};
