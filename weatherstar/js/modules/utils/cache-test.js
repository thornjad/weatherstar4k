import { imageCache } from './image.js';
import { imagePreloader } from './image-preloader.js';

/**
 * Cache Test Utility
 * Provides testing capabilities for the optimized image cache
 */
class CacheTest {
  constructor() {
    this.testImages = [
      'images/icons/moon-phases/Full-Moon.gif',
      'images/icons/moon-phases/Last-Quarter.gif',
      'images/icons/moon-phases/New-Moon.gif',
      'images/icons/moon-phases/First-Quarter.gif',
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
      performanceTest: await this.testPerformance(),
      backgroundImageTest: await this.testBackgroundImages(),
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

    const duration = endTime - startTime;
    const successCount = results.filter(result => result !== null).length;

    console.log(
      `    Preloaded ${successCount}/${this.testImages.length} images in ${duration.toFixed(2)}ms`
    );

    return {
      success: successCount === this.testImages.length,
      duration,
      successCount,
      totalCount: this.testImages.length,
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
      expected: expectedHits,
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

    const improvement = (
      ((uncachedTime - cachedTime) / uncachedTime) *
      100
    ).toFixed(1);

    console.log(
      `    Uncached: ${uncachedTime.toFixed(2)}ms, Cached: ${cachedTime.toFixed(2)}ms`
    );
    console.log(`    Performance improvement: ${improvement}%`);

    return {
      success: cachedTime < uncachedTime,
      uncachedTime,
      cachedTime,
      improvement: `${improvement}%`,
    };
  }

  /**
   * Test background image caching and prioritization
   */
  async testBackgroundImages() {
    console.log('  Testing background image caching...');

    const backgroundImages = [
      'images/backgrounds/1.png',
      'images/backgrounds/2.png',
      'images/backgrounds/3.png',
    ];

    // Clear cache and preload background images
    imageCache.clear();
    await imageCache.preloadBackgroundImages(backgroundImages);

    // Check that background images are marked correctly
    const stats = imageCache.getStats();
    const backgroundCount = stats.backgroundImages;

    console.log(`    Background images cached: ${backgroundCount}/${backgroundImages.length}`);

    // Test that background images are prioritized during eviction
    // Fill cache with non-background images to trigger eviction
    const nonBackgroundImages = [
      'images/icons/moon-phases/Full-Moon.gif',
      'images/icons/moon-phases/Last-Quarter.gif',
      'images/icons/moon-phases/New-Moon.gif',
      'images/icons/moon-phases/First-Quarter.gif',
    ];

    // Preload additional images to fill cache
    await imageCache.preloadImages(nonBackgroundImages);

    const finalStats = imageCache.getStats();
    const finalBackgroundCount = finalStats.backgroundImages;
    const expiredBackgroundCount = finalStats.expiredBackgroundImages;

    console.log(`    Background images after cache fill: ${finalBackgroundCount}`);
    console.log(`    Expired background images: ${expiredBackgroundCount}`);

    return {
      success: finalBackgroundCount >= backgroundCount && expiredBackgroundCount === 0,
      initialBackgroundCount: backgroundCount,
      finalBackgroundCount,
      expiredBackgroundCount,
      totalImages: finalStats.size,
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
      stats,
    };
  }

  /**
   * Run all tests including preloader
   */
  async runAllTests() {
    console.log('🧪 Running comprehensive cache tests...');

    const basicResults = await this.runTests();
    const preloaderResults = await this.testPreloader();

    const allResults = {
      ...basicResults,
      preloaderTest: preloaderResults,
    };

    console.log('🧪 All Test Results:', allResults);

    const passedTests = Object.values(allResults).filter(result => result.success).length;
    const totalTests = Object.keys(allResults).length;

    console.log(`🧪 Test Summary: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
      console.log('✅ All cache tests passed!');
    } else {
      console.log('❌ Some tests failed. Check the results above.');
    }

    return allResults;
  }
}

// Create global test instance
const cacheTest = new CacheTest();

// Export for use in other modules
export { cacheTest, CacheTest };

// Expose to window for debugging
window.cacheTest = cacheTest.runAllTests.bind(cacheTest);
window.cacheTestInstance = cacheTest;
window.CacheTest = CacheTest;
