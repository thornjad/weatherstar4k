// Regional Cities Data Loader
// Loads data from JSON file and exports as const RegionalCities

const RegionalCities = await fetch('./js/data/json/regionalcities.json')
  .then(response => response.json())
  .catch(error => {
    console.error('Failed to load RegionalCities data:', error);
    return [];
  });

// Make it globally available
window.RegionalCities = RegionalCities;
