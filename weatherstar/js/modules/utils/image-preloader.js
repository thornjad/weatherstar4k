import { imageCache } from './image.js';

/**
 * Image Preloader Utility
 * Preloads commonly used images to prevent refetching during app loops
 */
class ImagePreloader {
	constructor() {
		this.commonImages = this.getCommonImageList();
		this.preloaded = false;
	}

	/**
	 * Get list of commonly used images that should be preloaded
	 */
	getCommonImageList() {
		return [
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
			
			// Common weather condition icons
			'images/icons/current-conditions/Sunny.gif',
			'images/icons/current-conditions/Clear.gif',
			'images/icons/current-conditions/Partly-Cloudy.gif',
			'images/icons/current-conditions/Mostly-Clear.gif',
			'images/icons/current-conditions/Cloudy.gif',
			'images/icons/current-conditions/Fog.gif',
			'images/icons/current-conditions/Rain.gif',
			'images/icons/current-conditions/Light-Snow.gif',
			'images/icons/current-conditions/Thunderstorm.gif',
			'images/icons/current-conditions/Windy.gif',
			
			// Regional map icons
			'images/icons/regional-maps/Sunny.gif',
			'images/icons/regional-maps/Clear-1992.gif',
			'images/icons/regional-maps/Partly-Cloudy.gif',
			'images/icons/regional-maps/Mostly-Cloudy-1994.gif',
			'images/icons/regional-maps/Partly-Clear-1994.gif',
			'images/icons/regional-maps/Cloudy.gif',
			'images/icons/regional-maps/Thunderstorm.gif',
			'images/icons/regional-maps/Scattered-Tstorms-1994.gif',
			
			// Map backgrounds
			'images/maps/basemap.webp',
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
			'images/maps/radar/overlay-2-6.webp'
		];
	}

	/**
	 * Preload all common images
	 */
	async preloadCommonImages() {
		if (this.preloaded) {
			return;
		}

		try {
			await imageCache.preloadImages(this.commonImages);
			this.preloaded = true;
		} catch (error) {
			console.warn('Failed to preload some common images:', error);
		}
	}

	/**
	 * Preload specific category of images
	 */
	async preloadCategory(category) {
		const categories = {
			moon: [
				'images/icons/moon-phases/Full-Moon.gif',
				'images/icons/moon-phases/Last-Quarter.gif',
				'images/icons/moon-phases/New-Moon.gif',
				'images/icons/moon-phases/First-Quarter.gif'
			],
			weather: [
				'images/icons/current-conditions/Sunny.gif',
				'images/icons/current-conditions/Clear.gif',
				'images/icons/current-conditions/Partly-Cloudy.gif',
				'images/icons/current-conditions/Mostly-Clear.gif',
				'images/icons/current-conditions/Cloudy.gif',
				'images/icons/current-conditions/Fog.gif',
				'images/icons/current-conditions/Rain.gif',
				'images/icons/current-conditions/Light-Snow.gif',
				'images/icons/current-conditions/Thunderstorm.gif',
				'images/icons/current-conditions/Windy.gif'
			],
			regional: [
				'images/icons/regional-maps/Sunny.gif',
				'images/icons/regional-maps/Clear-1992.gif',
				'images/icons/regional-maps/Partly-Cloudy.gif',
				'images/icons/regional-maps/Mostly-Cloudy-1994.gif',
				'images/icons/regional-maps/Partly-Clear-1994.gif',
				'images/icons/regional-maps/Cloudy.gif',
				'images/icons/regional-maps/Thunderstorm.gif',
				'images/icons/regional-maps/Scattered-Tstorms-1994.gif'
			],
			maps: [
				'images/maps/basemap.webp',
				'images/maps/radar-hawaii.png',
				'images/maps/radar-alaska.png'
			],
			radar: [
				'images/maps/radar/map-1-5.webp',
				'images/maps/radar/map-1-6.webp',
				'images/maps/radar/map-2-5.webp',
				'images/maps/radar/map-2-6.webp',
				'images/maps/radar/overlay-1-5.webp',
				'images/maps/radar/overlay-1-6.webp',
				'images/maps/radar/overlay-2-5.webp',
				'images/maps/radar/overlay-2-6.webp'
			]
		};

		const images = categories[category];
		if (!images) {
			console.warn(`Unknown image category: ${category}`);
			return;
		}

		await imageCache.preloadImages(images);
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats() {
		return imageCache.getStats();
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
}

// Create global preloader instance
const imagePreloader = new ImagePreloader();

export {
	imagePreloader,
	ImagePreloader
}; 