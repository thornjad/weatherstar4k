// Travel Cities Data Loader
// Loads data from JSON file and exports as const TravelCities

const TravelCities = await fetch('./js/data/json/travelcities.json')
  .then(response => response.json())
  .catch(error => {
    console.error('Failed to load TravelCities data:', error);
    return [];
  });

// Make it globally available
window.TravelCities = TravelCities;
