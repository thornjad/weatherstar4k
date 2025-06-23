// *********************************** unit conversions ***********************

// round 2 provided for lat/lon formatting
const round2 = (value, decimals) => Math.trunc(value * 10 ** decimals) / 10 ** decimals;

const kphToMph = Kph => Math.round(Kph / 1.609_34);
const celsiusToFahrenheit = Celsius => Math.round((Celsius * 9) / 5 + 32);
const kilometersToMiles = Kilometers => Math.round(Kilometers / 1.609_34);
const metersToFeet = Meters => Math.round(Meters / 0.3048);
const pascalToMillibars = Pascal => {
  const result = Math.round(Pascal * 0.01);
  return result;
};

const windSpeed = () => {
  const converter = value => kphToMph(value);
  converter.units = 'MPH';
  return converter;
};

const temperature = () => {
  const converter = value => celsiusToFahrenheit(value);
  converter.units = 'F';
  return converter;
};

const distanceMeters = () => {
  const converter = value => {
    // rounded to the nearest 100 (ceiling)
    return Math.round(metersToFeet(value) / 100) * 100;
  };
  converter.units = 'ft.';
  return converter;
};

const distanceKilometers = () => {
  const converter = value => Math.round(kilometersToMiles(value) / 1000);
  converter.units = ' mi.';
  return converter;
};

const pressure = () => {
  const converter = value => pascalToMillibars(value);
  converter.units = ' mb';
  return converter;
};

export {
  // unit conversions
  windSpeed,
  temperature,
  distanceMeters,
  distanceKilometers,
  pressure,

  // formatter
  round2,
};
