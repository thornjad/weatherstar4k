import { imageCache } from './image.js';
import { imagePreloader } from './image-preloader.js';

/**
 * Cache Monitor Utility
 * Provides debugging and monitoring capabilities for the image cache
 */
class CacheMonitor {
  constructor() {
    this.monitoring = false;
    this.interval = null;
    this.logHistory = [];
    this.maxLogEntries = 100;
  }

  /**
   * Start monitoring cache performance
   */
  startMonitoring(intervalMs = 30000) {
    // Default: log every 30 seconds
    if (this.monitoring) {
      console.log('Cache monitoring already active');
      return;
    }

    this.monitoring = true;
    console.log('Starting image cache monitoring...');

    this.interval = setInterval(() => {
      this.logCacheStats();
    }, intervalMs);

    // Log initial stats
    this.logCacheStats();
  }

  /**
   * Log current cache statistics
   */
  logCacheStats() {
    if (!this.monitoring) {
      return; // Don't log if monitoring isn't active
    }

    const stats = imageCache.getStats();
    const timestamp = new Date().toISOString();

    const logEntry = {
      timestamp,
      ...stats,
    };

    this.logHistory.push(logEntry);

    // Keep only the last N entries
    if (this.logHistory.length > this.maxLogEntries) {
      this.logHistory.shift();
    }

    console.log(`[Cache Monitor] ${timestamp}`, {
      hitRate: stats.hitRate,
      hits: stats.hits,
      misses: stats.misses,
      loads: stats.loads,
      evictions: stats.evictions,
      cacheSize: stats.size,
      maxSize: stats.maxSize,
    });
  }

  /**
   * Get cache performance summary
   */
  getPerformanceSummary() {
    if (this.logHistory.length === 0) {
      return { message: 'No cache monitoring data available' };
    }

    const recent = this.logHistory.slice(-10); // Last 10 entries
    const avgHitRate =
      recent.reduce((sum, entry) => {
        return sum + parseFloat(entry.hitRate);
      }, 0) / recent.length;

    const totalHits = recent.reduce((sum, entry) => sum + entry.hits, 0);
    const totalMisses = recent.reduce((sum, entry) => sum + entry.misses, 0);
    const totalLoads = recent.reduce((sum, entry) => sum + entry.loads, 0);

    return {
      averageHitRate: `${avgHitRate.toFixed(1)}%`,
      totalHits,
      totalMisses,
      totalLoads,
      monitoringDuration: `${this.logHistory.length} log entries`,
      recentPerformance: recent.map(entry => ({
        timestamp: entry.timestamp,
        hitRate: entry.hitRate,
        hits: entry.hits,
        misses: entry.misses,
      })),
    };
  }

  /**
   * Get detailed cache contents
   */
  getCacheContents() {
    const contents = [];
    for (const [url, entry] of imageCache.cache.entries()) {
      contents.push({
        url,
        timestamp: new Date(entry.timestamp).toISOString(),
        lastAccessed: new Date(entry.lastAccessed).toISOString(),
        age: Date.now() - entry.timestamp,
      });
    }

    return contents.sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  /**
   * Clear cache and reset monitoring
   */
  clearCacheAndReset() {
    imageCache.clear();
    this.logHistory = [];
    console.log('Cache cleared and monitoring reset');
  }

  /**
   * Export cache statistics for debugging
   */
  exportCacheData() {
    return {
      stats: imageCache.getStats(),
      contents: this.getCacheContents(),
      performance: this.getPerformanceSummary(),
      monitoringHistory: this.logHistory,
    };
  }

  /**
   * Check if specific images are cached
   */
  checkImageCacheStatus(imageUrls) {
    const status = {};
    imageUrls.forEach(url => {
      status[url] = {
        cached: imageCache.isCached(url),
        loading: imageCache.loadingPromises.has(url),
      };
    });
    return status;
  }

  /**
   * Force preload specific images
   */
  async forcePreloadImages(imageUrls) {
    console.log(`Force preloading ${imageUrls.length} images...`);
    const results = await imageCache.preloadImages(imageUrls);
    const successCount = results.filter(result => result !== null).length;
    console.log(
      `Successfully preloaded ${successCount}/${imageUrls.length} images`
    );
    return results;
  }

  /**
   * Run basic cache tests
   */
  async runTests() {
    console.log('🧪 Running image cache tests...');

    const testImages = [
      'images/icons/moon-phases/Full-Moon.gif',
      'images/icons/moon-phases/Last-Quarter.gif',
      'images/icons/moon-phases/New-Moon.gif',
      'images/icons/moon-phases/First-Quarter.gif',
    ];

    const results = {
      preloadTest: await this.testPreloading(testImages),
      cacheHitTest: await this.testCacheHits(testImages),
      persistenceTest: await this.testPersistence(testImages),
      performanceTest: await this.testPerformance(testImages),
    };

    console.log('🧪 Test Results:', results);

    const passedTests = Object.values(results).filter(
      result => result.success
    ).length;
    const totalTests = Object.keys(results).length;

    console.log(`🧪 Test Summary: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
      console.log('✅ All image cache tests passed!');
    } else {
      console.log('❌ Some tests failed. Check the results above.');
    }

    return results;
  }

  /**
   * Test image preloading functionality
   */
  async testPreloading(testImages) {
    console.log('  Testing preloading...');

    const startTime = performance.now();
    const results = await imageCache.preloadImages(testImages);
    const endTime = performance.now();

    const successCount = results.filter(result => result !== null).length;
    const duration = endTime - startTime;

    console.log(
      `    Preloaded ${successCount}/${testImages.length} images in ${duration.toFixed(2)}ms`
    );

    return {
      success: successCount === testImages.length,
      duration,
      successCount,
      totalCount: testImages.length,
    };
  }

  /**
   * Test cache hit functionality
   */
  async testCacheHits(testImages) {
    console.log('  Testing cache hits...');

    // First load should be misses
    const firstLoadStats = imageCache.getStats();

    // Second load should be hits
    await imageCache.preloadImages(testImages);
    const secondLoadStats = imageCache.getStats();

    const newHits = secondLoadStats.hits - firstLoadStats.hits;
    const expectedHits = testImages.length;

    console.log(`    Cache hits: ${newHits}/${expectedHits}`);

    return {
      success: newHits === expectedHits,
      hits: newHits,
      expected: expectedHits,
    };
  }

  /**
   * Test cache persistence (simulated)
   */
  async testPersistence(testImages) {
    console.log('  Testing persistence...');

    // Simulate cache persistence by checking if images are still cached
    const cachedCount = testImages.filter(img =>
      imageCache.isCached(img)
    ).length;

    console.log(
      `    Persistence check: ${cachedCount}/${testImages.length} images still cached`
    );

    return {
      success: cachedCount === testImages.length,
      cachedCount,
      totalCount: testImages.length,
    };
  }

  /**
   * Test performance improvements
   */
  async testPerformance(testImages) {
    console.log('  Testing performance...');

    // Test uncached load time
    imageCache.clear();
    const uncachedStart = performance.now();
    await imageCache.preloadImages(testImages);
    const uncachedEnd = performance.now();
    const uncachedTime = uncachedEnd - uncachedStart;

    // Test cached load time
    const cachedStart = performance.now();
    await imageCache.preloadImages(testImages);
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
   * Main function to run both tests and monitoring
   */
  async run() {
    console.log('🚀 Starting cache monitor and tests...');

    // Run tests first
    await this.runTests();

    // Start monitoring
    this.startMonitoring(30000); // Log every 30 seconds

    console.log(
      '✅ Cache monitor is now active. Reload the page to stop monitoring.'
    );
  }
}

// Create global monitor instance
const cacheMonitor = new CacheMonitor();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.cacheMonitor = cacheMonitor.run.bind(cacheMonitor);
  window.imageCache = imageCache;
  window.imagePreloader = imagePreloader;
}

export { cacheMonitor, CacheMonitor };
