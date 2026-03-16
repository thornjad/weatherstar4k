# WeatherStar

![Screenshot of WeatherStar showing current conditions](./static/ws.png)

This project brings back the weather of the 90's, based on the Weather Channel's WeatherStar 4000 hardware system. It makes use of the [National Weather Service's API](https://www.weather.gov/documentation/services-web-api) to get the forecast for your area. There's also a couple improvements compared to the original TWC system, including some better graphs and time-stamping, and more useful SPC outlooks.

This repository automatically builds live to [weather.jmthornton.net](https://weather.jmthornton.net).

This project is based on the WS4000+ project by Matt Walsh, which you can find [here](https://github.com/netbymatt/ws4kp). My version has diverged drastically, as I find that project to be unbelievably overengineered. The primary difference is that this version doesn't require a complicated build system with random libraries loading in. I've also added some missing icons, and an icon derivation algorithm to compensate for the NOAA API having deprecated its icon response field. Initial loading time is also improved by about 10x versus the original fork, and the timing system has been overhauled to use a central service that can theoretically run indefinitely without leaking memory (my longest test so far was 16 days).

I've also added an in-memory caching system for images, since the ws4kp image preloading doesn't really work when running for hours or days at a time. The cache provides immediate access to frequently used images during app loops and relies on browser caching for persistence. For debugging you can enable monitoring and a basic set of tests with `window.cacheMonitor()`.

## Usage

By default, the application will request your location via the browser's geolocation API. You can also specify a location by adding `lat` and `lon` query parameters to the URL (e.g., `?lat=40.7128&lon=-74.0060`). Note that weather data is only available for locations where the NOAA API is available.

### URL Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `lat` | (none) | Latitude. Latitude/longitude for the forecast location. |
| `lon` | (none) | Longitude. Latitude/longitude for the forecast location. |
| `reload` | `3` in kiosk mode, off otherwise | Hour (1-24) at which to reload the page daily for memory management. Use 24 for midnight. Set to `0` or `false` to disable. |

The `reload` parameter allows the app to run indefinitely by resetting accumulated browser memory once per day. The reload takes about 5-10 seconds and resumes automatically. In kiosk mode, this defaults to 3 AM.

## Running on a Raspberry Pi

This application can run continuously on a Raspberry Pi as a dedicated weather display. It has been tested on a Raspberry Pi 3 (1GB RAM) with Firefox in kiosk mode. Note that Raspberry Pi normally doesn't provide location services to the browser, so you should provide `lat` and `lon` query parameters in the URL.

### Kiosk mode

The recommended way to run on a Pi is Firefox in kiosk mode. This provides a fullscreen display with no browser chrome, and the daily reload (default 3 AM) keeps browser memory in check.

```bash
firefox --kiosk "https://weather.jmthornton.net?lat=YOUR_LAT&lon=YOUR_LON"
```

### Auto-restart wrapper

Firefox on a Pi 3 will occasionally crash due to memory pressure, typically every several hours. The application recovers gracefully on reload, so the recommended approach is a wrapper script that automatically restarts Firefox when it exits.

> **Warning**: Do not blindly copy and run scripts you find on the internet. Read and understand every line before running it on your system. This applies to the scripts below and to any code you find online.

Create a script like `~/weatherstar-kiosk.sh`:

```bash
#!/bin/bash
LOG=~/weatherstar.log
echo "$(date): kiosk script started" >> "$LOG"
xset s off
xset -dpms
xset s noblank
while true; do
  echo "$(date): starting firefox" >> "$LOG"
  firefox --kiosk "https://weather.jmthornton.net?lat=YOUR_LAT&lon=YOUR_LON"
  echo "$(date): firefox exited (code=$?), restarting in 5s" >> "$LOG"
  sleep 5
done
```

To start this automatically on boot, create `~/.config/autostart/weatherstar.desktop`:

```ini
[Desktop Entry]
Type=Application
Name=WeatherStar
Exec=/home/YOUR_USER/weatherstar-kiosk.sh
X-GNOME-Autostart-enabled=true
```

### Increasing swap space

The Pi 3 has only 1GB of RAM, which is marginal for a continuously running browser. Increasing swap space to 4GB helps significantly. Make sure you understand these commands before running them, as they modify your system's storage configuration.

```bash
sudo swapoff -a
sudo dd if=/dev/zero of=/var/swap bs=1M count=4096
sudo chmod 600 /var/swap
sudo mkswap /var/swap
sudo swapon /var/swap
```

To make this persistent across reboots, ensure `/var/swap` is in `/etc/fstab`:

```
/var/swap none swap sw 0 0
```

## Acknowledgments

This project was initially forked from [WS4000+ (ws4kp)](https://github.com/netbymatt/ws4kp) by Matt Walsh. While this version has been significantly restructured and simplified, it relies heavily on the original graphics and visual assets created by Michael Battaglia. This fork primarily simplifies the code, including removing the complex build system and mess of dependencies, adds image caching, and adds some more screens. It also removed most of the configurability of Matt Walsh's version.

## Disclaimer

This application is for entertainment and educational purposes only. It is NOT intended for use in life-threatening weather conditions or emergency situations, or be relied on to inform the public of such situations. Do not rely on this application for critical weather decisions. Always consult official weather services and emergency broadcasts during severe weather. This application may not provide real-time or accurate weather information. Use official weather apps and services for safety-critical decisions. The authors of this code and of [weather.jmthornton.net](https://weather.jmthornton.net) shall not be held liable in the event of injury, death or property damage that occur as a result of disregarding this warning. See the included [license](./LICENSE) for specific language limiting liability (it's the ISC license).
