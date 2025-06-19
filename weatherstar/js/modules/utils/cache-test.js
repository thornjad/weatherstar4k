import { imageCache } from './image.js';
import { imagePreloader } from './image-preloader.js';

/**
 * Simple test utility for the image caching system
 */
class CacheTest {
	constructor() {
		this.testImages = [
			'images/icons/moon-phases/Full-Moon.gif',
			'images/icons/moon-phases/Last-Quarter.gif',
			'images/icons/moon-phases/New-Moon.gif',
			'images/icons/moon-phases/First-Quarter.gif'
		];
	}

	/**
	 * Run basic cache functionality tests
	 */
	async runTests() {
		console.log('🧪 Starting image cache tests...');
		
		const results = {
			preloadTest: await this.testPreloading(),
			cacheHitTest: await this.testCacheHits(),
			persistenceTest: await this.testPersistence(),
			performanceTest: await this.testPerformance()
		};

		console.log('🧪 Test Results:', results);
		return results;
	}

	/**
	 * Test image preloading functionality
	 */
	async testPreloading() {
		console.log('  Testing preloading...');
		
		const startTime = performance.now();
		const results = await imageCache.preloadImages(this.testImages);
		const endTime = performance.now();
		
		const successCount = results.filter(result => result !== null).length;
		const duration = endTime - startTime;
		
		console.log(`    Preloaded ${successCount}/${this.testImages.length} images in ${duration.toFixed(2)}ms`);
		
		return {
			success: successCount === this.testImages.length,
			duration,
			successCount,
			totalCount: this.testImages.length
		};
	}

	/**
	 * Test cache hit functionality
	 */
	async testCacheHits() {
		console.log('  Testing cache hits...');
		
		// First load should be misses
		const firstLoadStats = imageCache.getStats();
		
		// Second load should be hits
		await imageCache.preloadImages(this.testImages);
		const secondLoadStats = imageCache.getStats();
		
		const newHits = secondLoadStats.hits - firstLoadStats.hits;
		const expectedHits = this.testImages.length;
		
		console.log(`    Cache hits: ${newHits}/${expectedHits}`);
		
		return {
			success: newHits === expectedHits,
			hits: newHits,
			expected: expectedHits
		};
	}

	/**
	 * Test cache persistence (simulated)
	 */
	async testPersistence() {
		console.log('  Testing persistence...');
		
		const originalSize = imageCache.cache.size;
		
		// Simulate cache persistence by checking if images are still cached
		const cachedCount = this.testImages.filter(img => imageCache.isCached(img)).length;
		
		console.log(`    Persistence check: ${cachedCount}/${this.testImages.length} images still cached`);
		
		return {
			success: cachedCount === this.testImages.length,
			cachedCount,
			totalCount: this.testImages.length
		};
	}

	/**
	 * Test performance improvements
	 */
	async testPerformance() {
		console.log('  Testing performance...');
		
		// Test uncached load time
		imageCache.clear();
		const uncachedStart = performance.now();
		await imageCache.preloadImages(this.testImages);
		const uncachedEnd = performance.now();
		const uncachedTime = uncachedEnd - uncachedStart;
		
		// Test cached load time
		const cachedStart = performance.now();
		await imageCache.preloadImages(this.testImages);
		const cachedEnd = performance.now();
		const cachedTime = cachedEnd - cachedStart;
		
		const improvement = ((uncachedTime - cachedTime) / uncachedTime * 100).toFixed(1);
		
		console.log(`    Uncached: ${uncachedTime.toFixed(2)}ms, Cached: ${cachedTime.toFixed(2)}ms`);
		console.log(`    Performance improvement: ${improvement}%`);
		
		return {
			success: cachedTime < uncachedTime,
			uncachedTime,
			cachedTime,
			improvement: `${improvement}%`
		};
	}

	/**
	 * Test preloader functionality
	 */
	async testPreloader() {
		console.log('  Testing preloader...');
		
		const startTime = performance.now();
		await imagePreloader.preloadCategory('moon');
		const endTime = performance.now();
		
		const duration = endTime - startTime;
		const stats = imagePreloader.getCacheStats();
		
		console.log(`    Preloader completed in ${duration.toFixed(2)}ms`);
		console.log(`    Cache stats: ${stats.hits} hits, ${stats.misses} misses`);
		
		return {
			success: stats.hits > 0,
			duration,
			stats
		};
	}

	/**
	 * Run all tests and provide summary
	 */
	async runAllTests() {
		const results = await this.runTests();
		const preloaderResults = await this.testPreloader();
		
		const allResults = { ...results, preloaderTest: preloaderResults };
		
		const passedTests = Object.values(allResults).filter(result => result.success).length;
		const totalTests = Object.keys(allResults).length;
		
		console.log(`🧪 Test Summary: ${passedTests}/${totalTests} tests passed`);
		
		if (passedTests === totalTests) {
			console.log('✅ All image cache tests passed!');
		} else {
			console.log('❌ Some tests failed. Check the results above.');
		}
		
		return allResults;
	}
}

// Create global test instance
const cacheTest = new CacheTest();

// Expose to window for manual testing
if (typeof window !== 'undefined') {
	window.cacheTest = cacheTest;
}

export {
	cacheTest,
	CacheTest
};