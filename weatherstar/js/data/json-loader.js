// JSON Data Loader Module
// This module loads JSON data files and exports them as JavaScript constants

// Load cities data
const citiesData = await fetch('./js/data/json/cities.json').then(response => response.json());
const regionalCitiesData = citiesData.filter(city => city.type === 'regional' || city.type === 'both');
const travelCitiesData = citiesData.filter(city => city.type === 'travel' || city.type === 'both');

// Load stations data
const stationsData = await fetch('./js/data/json/stations.json').then(response => response.json());

// Export the data as constants
export const RegionalCities = regionalCitiesData;
export const TravelCities = travelCitiesData;
export const StationInfo = stationsData;

// Also export the consolidated cities data
export const Cities = citiesData;
