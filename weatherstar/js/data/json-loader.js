// JSON Data Loader Module
// This module loads JSON data files and exports them as JavaScript constants

// Initialize with empty data
let citiesData = [];
let regionalCitiesData = [];
let travelCitiesData = [];
let stationsData = {};
let isLoaded = false;

// Function to load all data
const loadData = async () => {
  if (isLoaded) {
    return { citiesData, regionalCitiesData, travelCitiesData, stationsData };
  }

  try {
    citiesData = await fetch('./js/data/json/cities.json').then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load cities.json: ${response.status} ${response.statusText}`);
      }
      return response.json();
    });

    regionalCitiesData = citiesData.filter(city => city.type === 'regional' || city.type === 'both');
  } catch (error) {
    console.error('Error loading cities data:', error);
    // Provide fallback empty arrays
    citiesData = [];
    regionalCitiesData = [];
  }

  try {
    travelCitiesData = await fetch('./js/data/json/travelcities.json').then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load travelcities.json: ${response.status} ${response.statusText}`);
      }
      return response.json();
    });
  } catch (error) {
    console.error('Error loading travel cities data:', error);
    // Provide fallback empty array
    travelCitiesData = [];
  }

  try {
    stationsData = await fetch('./js/data/json/stations.json').then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load stations.json: ${response.status} ${response.statusText}`);
      }
      return response.json();
    });
  } catch (error) {
    console.error('Error loading stations data:', error);
    // Provide fallback empty object
    stationsData = {};
  }

  isLoaded = true;
  return { citiesData, regionalCitiesData, travelCitiesData, stationsData };
};

// Start loading immediately
loadData().catch(error => {
  console.error('Failed to load data:', error);
});

// Export getters that ensure data is loaded
export const getRegionalCities = async () => {
  if (!isLoaded) {await loadData();}
  return regionalCitiesData;
};

export const getTravelCities = async () => {
  if (!isLoaded) {await loadData();}
  return travelCitiesData;
};

export const getStationInfo = async () => {
  if (!isLoaded) {await loadData();}
  return stationsData;
};

export const getCities = async () => {
  if (!isLoaded) {await loadData();}
  return citiesData;
};

// For backward compatibility, export the data directly (will be empty initially)
export const RegionalCities = regionalCitiesData;
export const TravelCities = travelCitiesData;
export const StationInfo = stationsData;
export const Cities = citiesData;
