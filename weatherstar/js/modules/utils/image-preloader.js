import { imageCache } from './image.js';

/**
 * Image Preloader Utility
 * Mobile-optimized preloading of commonly used images to prevent refetching during app loops
 */
class ImagePreloader {
  constructor() {
    this.commonImages = this.getCommonImageList();
    this.preloaded = false;
    this.mobileOptimized = this.detectMobileDevice();
  }

  /**
   * Detect if running on a mobile device
   */
  detectMobileDevice() {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Get list of commonly used images that should be preloaded (mobile-optimized)
   */
  getCommonImageList() {
    // Core images that are absolutely essential
    const coreImages = [
      // Moon phases (frequently reused)
      'images/icons/moon-phases/Full-Moon.gif',
      'images/icons/moon-phases/Last-Quarter.gif',
      'images/icons/moon-phases/New-Moon.gif',
      'images/icons/moon-phases/First-Quarter.gif',

      // Navigation icons
      'images/nav/ic_pause_white_24dp_2x.png',
      'images/nav/ic_fullscreen_white_24dp_2x.png',
      'images/nav/ic_fullscreen_exit_white_24dp_2x.png',

      // Logos
      'images/logos/logo-corner.png',
      'images/logos/noaa.gif',

      // Most common weather condition icons
      'images/icons/current-conditions/Sunny.gif',
      'images/icons/current-conditions/Clear.gif',
      'images/icons/current-conditions/Partly-Cloudy.gif',
      'images/icons/current-conditions/Mostly-Clear.gif',
      'images/icons/current-conditions/Cloudy.gif',
      'images/icons/current-conditions/Rain.gif',
      'images/icons/current-conditions/Thunderstorm.gif',
      'images/icons/current-conditions/Mostly-Cloudy.gif',

      // Map backgrounds
      'images/maps/basemap.webp',
    ];

    // Additional images for non-mobile devices
    const additionalImages = [
      // Additional weather condition icons
      'images/icons/current-conditions/Fog.gif',
      'images/icons/current-conditions/Light-Snow.gif',
      'images/icons/current-conditions/Windy.gif',
      'images/icons/current-conditions/Freezing-Rain-Sleet.gif',
      'images/icons/current-conditions/Partly-Clear.gif',
      'images/icons/current-conditions/Thunder.gif',
      'images/icons/current-conditions/ThunderSnow.gif',
      'images/icons/current-conditions/Wintry-Mix.gif',

      // Regional map icons
      'images/icons/regional-maps/Sunny.gif',
      'images/icons/regional-maps/Clear-1992.gif',
      'images/icons/regional-maps/Partly-Cloudy.gif',
      'images/icons/regional-maps/Mostly-Cloudy-1994.gif',
      'images/icons/regional-maps/Partly-Clear-1994.gif',
      'images/icons/regional-maps/Cloudy.gif',
      'images/icons/regional-maps/Thunderstorm.gif',
      'images/icons/regional-maps/Scattered-Tstorms-1994.gif',
      'images/icons/regional-maps/AM-Snow-1994.gif',
      'images/icons/regional-maps/Freezing-Rain-Sleet-1992.gif',
      'images/icons/regional-maps/Freezing-Rain-Snow-1992.gif',
      'images/icons/regional-maps/Heavy-Snow-1992.gif',
      'images/icons/regional-maps/Mostly-Cloudy-1992.gif',
      'images/icons/regional-maps/Mostly-Cloudy-Night-1992.gif',
      'images/icons/regional-maps/Rain-Wind-1994.gif',
      'images/icons/regional-maps/Scattered-Showers-1992.gif',
      'images/icons/regional-maps/Scattered-Snow-Showers-1992.gif',
      'images/icons/regional-maps/Scattered-Tstorms-1992-Early.gif',
      'images/icons/regional-maps/Scattered-Tstorms-1992.gif',
      'images/icons/regional-maps/Shower.gif',
      'images/icons/regional-maps/Snow-Wind.gif',
      'images/icons/regional-maps/Thunder.gif',
      'images/icons/regional-maps/Wintry-Mix-1992.gif',

      // Additional map backgrounds
      'images/maps/radar-hawaii.png',
      'images/maps/radar-alaska.png',

      // Radar tiles (commonly used)
      'images/maps/radar/map-1-5.webp',
      'images/maps/radar/map-1-6.webp',
      'images/maps/radar/map-2-5.webp',
      'images/maps/radar/map-2-6.webp',
      'images/maps/radar/overlay-1-5.webp',
      'images/maps/radar/overlay-1-6.webp',
      'images/maps/radar/overlay-2-5.webp',
      'images/maps/radar/overlay-2-6.webp',
    ];

    // Return core images for mobile, full list for desktop
    return this.mobileOptimized ? coreImages : [...coreImages, ...additionalImages];
  }

  /**
   * Preload all common images with mobile optimization
   */
  async preloadCommonImages() {
    if (this.preloaded) {
      return;
    }

    try {
      console.log(`Preloading ${this.commonImages.length} images (mobile optimized: ${this.mobileOptimized})`);
      await imageCache.preloadImages(this.commonImages);
      this.preloaded = true;
      console.log('Common images preloaded successfully');
    } catch (error) {
      console.warn('Failed to preload some common images:', error);
    }
  }

  /**
   * Preload specific category of images with mobile awareness
   */
  async preloadCategory(category) {
    const categories = {
      moon: [
        'images/icons/moon-phases/Full-Moon.gif',
        'images/icons/moon-phases/Last-Quarter.gif',
        'images/icons/moon-phases/New-Moon.gif',
        'images/icons/moon-phases/First-Quarter.gif',
      ],
      weather: [
        'images/icons/current-conditions/Sunny.gif',
        'images/icons/current-conditions/Clear.gif',
        'images/icons/current-conditions/Partly-Cloudy.gif',
        'images/icons/current-conditions/Mostly-Clear.gif',
        'images/icons/current-conditions/Cloudy.gif',
        'images/icons/current-conditions/Rain.gif',
        'images/icons/current-conditions/Thunderstorm.gif',
        'images/icons/current-conditions/Mostly-Cloudy.gif',
        // Additional weather icons for non-mobile
        ...(this.mobileOptimized
          ? []
          : [
              'images/icons/current-conditions/Fog.gif',
              'images/icons/current-conditions/Light-Snow.gif',
              'images/icons/current-conditions/Windy.gif',
              'images/icons/current-conditions/Freezing-Rain-Sleet.gif',
              'images/icons/current-conditions/Partly-Clear.gif',
              'images/icons/current-conditions/Thunder.gif',
              'images/icons/current-conditions/ThunderSnow.gif',
              'images/icons/current-conditions/Wintry-Mix.gif',
            ]),
      ],
      regional: this.mobileOptimized
        ? [
            // Core regional icons for mobile
            'images/icons/regional-maps/Sunny.gif',
            'images/icons/regional-maps/Clear-1992.gif',
            'images/icons/regional-maps/Partly-Cloudy.gif',
            'images/icons/regional-maps/Cloudy.gif',
            'images/icons/regional-maps/Thunderstorm.gif',
          ]
        : [
            // Full regional icons for desktop
            'images/icons/regional-maps/Sunny.gif',
            'images/icons/regional-maps/Clear-1992.gif',
            'images/icons/regional-maps/Partly-Cloudy.gif',
            'images/icons/regional-maps/Mostly-Cloudy-1994.gif',
            'images/icons/regional-maps/Partly-Clear-1994.gif',
            'images/icons/regional-maps/Cloudy.gif',
            'images/icons/regional-maps/Thunderstorm.gif',
            'images/icons/regional-maps/Scattered-Tstorms-1994.gif',
            'images/icons/regional-maps/AM-Snow-1994.gif',
            'images/icons/regional-maps/Freezing-Rain-Sleet-1992.gif',
            'images/icons/regional-maps/Freezing-Rain-Snow-1992.gif',
            'images/icons/regional-maps/Heavy-Snow-1992.gif',
            'images/icons/regional-maps/Mostly-Cloudy-1992.gif',
            'images/icons/regional-maps/Mostly-Cloudy-Night-1992.gif',
            'images/icons/regional-maps/Rain-Wind-1994.gif',
            'images/icons/regional-maps/Scattered-Showers-1992.gif',
            'images/icons/regional-maps/Scattered-Snow-Showers-1992.gif',
            'images/icons/regional-maps/Scattered-Tstorms-1992-Early.gif',
            'images/icons/regional-maps/Scattered-Tstorms-1992.gif',
            'images/icons/regional-maps/Shower.gif',
            'images/icons/regional-maps/Snow-Wind.gif',
            'images/icons/regional-maps/Thunder.gif',
            'images/icons/regional-maps/Wintry-Mix-1992.gif',
          ],
      maps: ['images/maps/basemap.webp'],
      radar: this.mobileOptimized
        ? [
            // Core radar tiles for mobile
            'images/maps/radar/map-1-5.webp',
            'images/maps/radar/map-1-6.webp',
          ]
        : [
            // Full radar tiles for desktop
            'images/maps/radar/map-1-5.webp',
            'images/maps/radar/map-1-6.webp',
            'images/maps/radar/map-2-5.webp',
            'images/maps/radar/map-2-6.webp',
            'images/maps/radar/overlay-1-5.webp',
            'images/maps/radar/overlay-1-6.webp',
            'images/maps/radar/overlay-2-5.webp',
            'images/maps/radar/overlay-2-6.webp',
          ],
    };

    const images = categories[category];
    if (!images) {
      console.warn(`Unknown image category: ${category}`);
      return;
    }
    await imageCache.preloadImages(images);
  }

  /**
   * Get cache statistics with mobile optimization info
   */
  getCacheStats() {
    const stats = imageCache.getStats();
    return {
      ...stats,
      mobileOptimized: this.mobileOptimized,
      preloadedImages: this.commonImages.length,
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    imageCache.clear();
    this.preloaded = false;
    console.log('Image cache cleared');
  }

  /**
   * Check if specific image is cached
   */
  isImageCached(src) {
    return imageCache.isCached(src);
  }

  /**
   * Get cached image element
   */
  getCachedImage(src) {
    return imageCache.getCached(src);
  }

  /**
   * Get or create image element for immediate use
   */
  getImageElement(src) {
    return imageCache.getImageElement(src);
  }

  /**
   * Force clear all icon caches (memory, localStorage, and browser cache)
   */
  static async forceClearAllIconCaches() {
    // Clear in-memory and localStorage cache
    imageCache.clear();
    // Also clear preloader state
    if (window.imagePreloader) {
      window.imagePreloader.preloaded = false;
    }
    console.log('Force-cleared all icon caches (memory and localStorage)');
  }
}

// Create global preloader instance
const imagePreloader = new ImagePreloader();

export { imagePreloader, ImagePreloader };

if (typeof window !== 'undefined') {
  window.forceClearAllIconCaches = ImagePreloader.forceClearAllIconCaches;
}
