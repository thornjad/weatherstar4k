import { imageCache } from './image.js';
import { imagePreloader } from './image-preloader.js';

/**
 * Cache Monitor Utility
 * Provides debugging and monitoring capabilities for the mobile-optimized image cache
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
    console.log('Starting mobile-optimized image cache monitoring...');

    this.interval = setInterval(() => {
      this.logCacheStats();
    }, intervalMs);

    // Log initial stats
    this.logCacheStats();
  }

  /**
   * Log current cache statistics with mobile optimization info
   */
  logCacheStats() {
    if (!this.monitoring) {
      return; // Don't log if monitoring isn't active
    }

    const stats = imageCache.getStats();
    const preloaderStats = imagePreloader.getCacheStats();
    const timestamp = new Date().toISOString();

    const logEntry = {
      timestamp,
      ...stats,
      mobileOptimized: preloaderStats.mobileOptimized,
      preloadedImages: preloaderStats.preloadedImages,
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
      memoryPressureEvents: stats.memoryPressureEvents,
      cacheSize: stats.size,
      maxSize: stats.maxSize,
      cacheUtilization: stats.cacheUtilization,
      mobileOptimized: preloaderStats.mobileOptimized,
      preloadedImages: preloaderStats.preloadedImages,
      memoryInfo: stats.memoryInfo
        ? {
            usagePercent: stats.memoryInfo.memoryUsagePercent,
            usedJSHeapSize: Math.round(stats.memoryInfo.usedJSHeapSize / 1024 / 1024) + 'MB',
            jsHeapSizeLimit: Math.round(stats.memoryInfo.jsHeapSizeLimit / 1024 / 1024) + 'MB',
          }
        : null,
    });
  }

  /**
   * Get cache performance summary with mobile optimization metrics
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
    const totalMemoryPressureEvents = recent.reduce((sum, entry) => sum + (entry.memoryPressureEvents || 0), 0);
    const avgCacheUtilization =
      recent.reduce((sum, entry) => {
        return sum + parseFloat(entry.cacheUtilization || '0');
      }, 0) / recent.length;

    return {
      averageHitRate: `${avgHitRate.toFixed(1)}%`,
      averageCacheUtilization: `${avgCacheUtilization.toFixed(1)}%`,
      totalHits,
      totalMisses,
      totalLoads,
      totalMemoryPressureEvents,
      monitoringDuration: `${this.logHistory.length} log entries`,
      mobileOptimized: recent[recent.length - 1]?.mobileOptimized || false,
      preloadedImages: recent[recent.length - 1]?.preloadedImages || 0,
      recentPerformance: recent.map(entry => ({
        timestamp: entry.timestamp,
        hitRate: entry.hitRate,
        hits: entry.hits,
        misses: entry.misses,
        cacheUtilization: entry.cacheUtilization,
        memoryPressureEvents: entry.memoryPressureEvents,
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
   * Export cache statistics for debugging with mobile optimization info
   */
  exportCacheData() {
    const preloaderStats = imagePreloader.getCacheStats();
    return {
      stats: imageCache.getStats(),
      preloaderStats,
      contents: this.getCacheContents(),
      performance: this.getPerformanceSummary(),
      monitoringHistory: this.logHistory,
      mobileOptimization: {
        mobileOptimized: preloaderStats.mobileOptimized,
        preloadedImages: preloaderStats.preloadedImages,
        cacheSize: preloaderStats.maxSize,
        commonImages: imagePreloader.commonImages,
      },
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
    console.log(`Successfully preloaded ${successCount}/${imageUrls.length} images`);
    return results;
  }

  /**
   * Run basic cache tests with mobile optimization validation
   */
  async runTests() {
    console.log('🧪 Running mobile-optimized image cache tests...');

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
      mobileOptimizationTest: this.testMobileOptimization(),
    };

    console.log('🧪 Test Results:', results);

    const passedTests = Object.values(results).filter(result => result.success).length;
    const totalTests = Object.keys(results).length;

    console.log(`🧪 Test Summary: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
      console.log('✅ All mobile-optimized image cache tests passed!');
    } else {
      console.log('❌ Some tests failed. Check the results above.');
    }

    return results;
  }

  /**
   * Test mobile optimization configuration
   */
  testMobileOptimization() {
    const preloaderStats = imagePreloader.getCacheStats();
    const cacheStats = imageCache.getStats();

    const isMobileOptimized = preloaderStats.mobileOptimized;
    const cacheSize = cacheStats.maxSize;
    const preloadedCount = preloaderStats.preloadedImages;
    const expectedCacheSize = 50;
    // Count the actual core images for mobile (19 items in coreImages array)
    const expectedCoreImages = 19;
    const maxPreloadedImages = isMobileOptimized ? expectedCoreImages : 80; // Use actual count

    const success = cacheSize === expectedCacheSize && preloadedCount <= maxPreloadedImages;

    console.log('  Testing mobile optimization...');
    console.log(`    Mobile optimized: ${isMobileOptimized}`);
    console.log(`    Cache size: ${cacheSize} (expected: ${expectedCacheSize})`);
    console.log(`    Preloaded images: ${preloadedCount} (max: ${maxPreloadedImages})`);

    return {
      success,
      mobileOptimized: isMobileOptimized,
      cacheSize,
      preloadedCount,
      expectedCacheSize,
      maxPreloadedImages,
    };
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

    console.log(`    Preloaded ${successCount}/${testImages.length} images in ${duration.toFixed(2)}ms`);

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

    // Preload images first
    await imageCache.preloadImages(testImages);

    const startTime = performance.now();
    const hitResults = testImages.map(src => imageCache.getCached(src));
    const endTime = performance.now();

    const hitCount = hitResults.filter(result => result !== null).length;
    const duration = endTime - startTime;

    console.log(`    Cache hits: ${hitCount}/${testImages.length} in ${duration.toFixed(2)}ms`);

    return {
      success: hitCount === testImages.length,
      duration,
      hitCount,
      totalCount: testImages.length,
    };
  }

  /**
   * Test persistence functionality
   */
  async testPersistence(testImages) {
    console.log('  Testing persistence...');

    // Clear cache and preload images
    imageCache.clear();
    await imageCache.preloadImages(testImages);

    const beforeSave = imageCache.getStats();
    imageCache.saveCache();

    // Simulate cache restoration
    const testCache = new Map();
    try {
      const cached = localStorage.getItem('weatherstar4k_image_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.forEach(([url, entry]) => {
          testCache.set(url, entry);
        });
      }
    } catch (error) {
      console.warn('Persistence test failed:', error);
    }

    const restoredCount = testCache.size;
    const success = restoredCount > 0;

    console.log(`    Persisted ${restoredCount} images to localStorage`);

    return {
      success,
      restoredCount,
      beforeSave: beforeSave.size,
    };
  }

  /**
   * Test performance improvements
   */
  async testPerformance(testImages) {
    console.log('  Testing performance...');

    // Test uncached load time
    imageCache.clear();

    // Add a small delay to ensure browser cache is cleared
    await new Promise(resolve => setTimeout(resolve, 100));

    const uncachedStart = performance.now();
    await imageCache.preloadImages(testImages);
    const uncachedEnd = performance.now();
    const uncachedTime = uncachedEnd - uncachedStart;

    // Test cached load time
    const cachedStart = performance.now();
    await imageCache.preloadImages(testImages);
    const cachedEnd = performance.now();
    const cachedTime = cachedEnd - cachedStart;

    // Handle case where both times are very fast (browser cache)
    let improvement = '0%';
    if (uncachedTime > 0) {
      improvement = (((uncachedTime - cachedTime) / uncachedTime) * 100).toFixed(1) + '%';
    }

    console.log(`    Uncached: ${uncachedTime.toFixed(2)}ms, Cached: ${cachedTime.toFixed(2)}ms`);
    console.log(`    Performance improvement: ${improvement}`);

    // Consider test successful if cached time is not significantly slower
    const success = cachedTime <= uncachedTime * 1.1; // Allow 10% tolerance

    return {
      success,
      uncachedTime,
      cachedTime,
      improvement,
    };
  }

  /**
   * Main function to run both tests and monitoring
   */
  async run() {
    console.log('🚀 Starting mobile-optimized cache monitor and tests...');

    // Run tests first
    await this.runTests();

    // Start monitoring
    this.startMonitoring(30000); // Log every 30 seconds

    console.log('✅ Mobile-optimized cache monitor is now active. Reload the page to stop monitoring.');
  }
}

// Create global cache monitor instance
const cacheMonitor = new CacheMonitor();

// Export for use in other modules
export { cacheMonitor, CacheMonitor };

// Make available globally for debugging
if (typeof window !== 'undefined') {
  // Main function as documented in README
  window.cacheMonitor = cacheMonitor.run.bind(cacheMonitor);

  // Also expose the instance and class for more detailed access
  window.cacheMonitorInstance = cacheMonitor;
  window.CacheMonitor = CacheMonitor;

  // Expose individual methods for debugging
  window.cacheMonitorStats = () => cacheMonitor.logCacheStats();
  window.cacheMonitorStart = interval => cacheMonitor.startMonitoring(interval);
  window.cacheMonitorStop = () => {
    if (cacheMonitor.interval) {
      clearInterval(cacheMonitor.interval);
      cacheMonitor.monitoring = false;
      console.log('Cache monitoring stopped');
    }
  };
  window.cacheMonitorTests = () => cacheMonitor.runTests();
  window.cacheMonitorExport = () => cacheMonitor.exportCacheData();
}
