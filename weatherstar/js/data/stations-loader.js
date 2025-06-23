// Station Info Data Loader
// Loads data from JSON file and exports as const StationInfo

const StationInfo = await fetch('./js/data/json/stations.json')
  .then(response => response.json())
  .catch(error => {
    console.error('Failed to load StationInfo data:', error);
    return {};
  });

// Make it globally available
window.StationInfo = StationInfo;
