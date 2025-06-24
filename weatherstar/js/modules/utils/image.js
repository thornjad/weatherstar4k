/**
 * Comprehensive Image Cache System
 * Optimized for mobile devices and long-running operation
 * Prevents unnecessary refetching of images during app loops
 */
class ImageCache {
  constructor(maxSize = 50) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.stats = {
      hits: 0,
      misses: 0,
      loads: 0,
      evictions: 0,
      memoryPressureEvents: 0,
    };
    this.loadingPromises = new Map();
    this.saveFrequency = 50; // Save to localStorage every 50 loads instead of 10
    this.initCache();
    this.setupMemoryPressureHandling();
  }

  /**
   * Initialize cache from localStorage if available
   */
  initCache() {
    try {
      const cached = localStorage.getItem('weatherstar4k_image_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Only restore cache entries that are still valid (within 12 hours for mobile)
        const cutoff = Date.now() - 12 * 60 * 60 * 1000;
        parsed.forEach(([url, entry]) => {
          if (entry.timestamp > cutoff && this.cache.size < this.maxSize) {
            this.cache.set(url, entry);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to restore image cache from localStorage:', error);
    }
  }

  /**
   * Save cache to localStorage (reduced frequency for mobile optimization)
   */
  saveCache() {
    try {
      const cacheArray = Array.from(this.cache.entries());
      localStorage.setItem('weatherstar4k_image_cache', JSON.stringify(cacheArray));
    } catch (error) {
      console.warn('Failed to save image cache to localStorage:', error);
    }
  }

  /**
   * Setup memory pressure handling for mobile devices
   */
  setupMemoryPressureHandling() {
    // Check for memory pressure every 30 seconds
    setInterval(() => {
      this.checkMemoryPressure();
    }, 30000);
  }

  /**
   * Check for memory pressure and handle accordingly
   */
  checkMemoryPressure() {
    // Check if we're approaching memory limits
    if (this.cache.size > this.maxSize * 0.8) {
      this.handleMemoryPressure();
    }

    // Check browser memory if available
    if ('memory' in performance) {
      const memoryInfo = performance.memory;
      const memoryUsage = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;

      if (memoryUsage > 0.7) {
        // 70% memory usage threshold
        this.handleMemoryPressure();
      }
    }
  }

  /**
   * Handle memory pressure by clearing cache
   */
  handleMemoryPressure() {
    const previousSize = this.cache.size;
    this.clear();
    this.stats.memoryPressureEvents++;

    console.log(`Memory pressure detected - cleared ${previousSize} cached images`);
  }

  /**
   * Get cache statistics with memory information
   */
  getStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1)
        : 0;

    const memoryInfo =
      'memory' in performance
        ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
            memoryUsagePercent: (
              (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) *
              100
            ).toFixed(1),
          }
        : null;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryInfo,
      cacheUtilization: `${((this.cache.size / this.maxSize) * 100).toFixed(1)}%`,
    };
  }

  /**
   * Check if image is already cached
   */
  isCached(src) {
    return this.cache.has(src);
  }

  /**
   * Get cached image element
   */
  getCached(src) {
    const entry = this.cache.get(src);
    if (entry) {
      this.stats.hits++;
      // Update access time for LRU
      entry.lastAccessed = Date.now();
      return entry.img;
    }
    this.stats.misses++;
    return null;
  }

  /**
   * Add image to cache with optimized storage frequency
   */
  addToCache(src, img) {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const entry = {
      img,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
    };

    this.cache.set(src, entry);
    this.stats.loads++;

    // Save cache less frequently for mobile optimization (every 50 loads instead of 10)
    if (this.stats.loads % this.saveFrequency === 0) {
      this.saveCache();
    }
  }

  /**
   * Evict oldest cache entries with improved algorithm
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    this.loadingPromises.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      loads: 0,
      evictions: 0,
      memoryPressureEvents: this.stats.memoryPressureEvents,
    };
    localStorage.removeItem('weatherstar4k_image_cache');
  }

  /**
   * Preload image with comprehensive caching
   */
  async preloadImage(src) {
    // Check if already cached
    const cached = this.getCached(src);
    if (cached) {
      return cached;
    }

    // Check if already loading
    if (this.loadingPromises.has(src)) {
      return this.loadingPromises.get(src);
    }

    // Start loading
    const loadPromise = this.loadImage(src);
    this.loadingPromises.set(src, loadPromise);

    try {
      const img = await loadPromise;
      this.addToCache(src, img);
      return img;
    } finally {
      this.loadingPromises.delete(src);
    }
  }

  /**
   * Load image with error handling
   */
  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn(`Failed to load image: ${src}`);
        reject(new Error(`Failed to load image: ${src}`));
      };

      // Set crossOrigin for external images
      if (src.startsWith('http')) {
        img.crossOrigin = 'anonymous';
      }

      img.src = src;
    });
  }

  /**
   * Preload multiple images in parallel with memory pressure awareness
   */
  async preloadImages(srcs) {
    // Check memory pressure before bulk loading
    this.checkMemoryPressure();

    const promises = srcs.map(src =>
      this.preloadImage(src).catch(err => {
        console.warn(`Failed to preload image ${src}:`, err);
        return null;
      })
    );

    return Promise.all(promises);
  }

  /**
   * Get or create image element for immediate use
   */
  getImageElement(src) {
    const cached = this.getCached(src);
    if (cached) {
      // Clone the cached image to avoid DOM conflicts
      const clone = new Image();
      clone.src = src;
      clone.crossOrigin = cached.crossOrigin;
      return clone;
    }

    // Create new image and start preloading
    const img = new Image();
    if (src.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    img.src = src;

    // Start preloading in background
    this.preloadImage(src).catch(err => {
      console.warn(`Background preload failed for ${src}:`, err);
    });

    return img;
  }
}

// Create global cache instance with mobile-optimized size
const imageCache = new ImageCache(50); // Reduced from 150 to 50 for mobile optimization

// Legacy compatibility function
const preloadImg = src => {
  if (!src) {
    return false;
  }

  // Start preloading in background
  imageCache.preloadImage(src).catch(err => {
    console.warn(`Preload failed for ${src}:`, err);
  });

  return true;
};

// Export new cache functions
export { preloadImg, imageCache, ImageCache };
