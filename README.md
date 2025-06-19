# WeatherStar

This project brings back the weather of the 90's, based on the Weather Channel's WeatherStar 4000 hardware system. It makes use of the [National Weather Service's API](https://www.weather.gov/documentation/services-web-api) to get the forecast for your area. There's also a few improvements compared to the original TWC system, including some better graphs and timestamping, and more useful SPC outlooks.

This project is based on the WS4000+ project by Matt Walsh, which you can find [here](https://github.com/netbymatt/ws4kp). My version has diverged significantly, as I find that project to be unbelievably overengineered. The primary difference is that this version doesn't require a complicated build system with random libraries loading in.

I've also added an improved LRU caching system, since the ws4kp image preloading doesn't really work. The cache is automatic, but for debugging you can enable monitoring and a basic set of tests with `window.cacheMonitor()`.
