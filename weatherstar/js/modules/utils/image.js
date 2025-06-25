/**
 * Optimized Image Cache System
 * In-memory caching for immediate access during app loops
 * Removes localStorage persistence for better performance
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
    };
    this.loadingPromises = new Map();
  }

  /**
   * Get cache statistics
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

    // Count background images
    let backgroundCount = 0;
    let expiredBackgroundCount = 0;
    for (const entry of this.cache.values()) {
      if (entry.isBackground) {
        backgroundCount++;
        if (entry.ttl && (Date.now() - entry.timestamp) > entry.ttl) {
          expiredBackgroundCount++;
        }
      }
    }

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxSize,
      backgroundImages: backgroundCount,
      expiredBackgroundImages: expiredBackgroundCount,
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
   * Add image to cache
   */
  addToCache(src, img) {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const isBackground = src.includes('backgrounds/');
    const ttl = isBackground ? 7 * 24 * 60 * 60 * 1000 : null; // 1 week for backgrounds, no TTL for others

    const entry = {
      img,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      isBackground,
      ttl,
    };

    this.cache.set(src, entry);
    this.stats.loads++;
  }

  /**
   * Evict oldest cache entries with improved algorithm
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();
    let expiredBackgroundKey = null;

    for (const [key, entry] of this.cache.entries()) {
      // Check if background image has expired
      if (entry.isBackground && entry.ttl) {
        const age = Date.now() - entry.timestamp;
        if (age > entry.ttl) {
          expiredBackgroundKey = key;
          break; // Evict expired background image immediately
        }
      }
      
      // Skip non-expired background images unless absolutely necessary
      if (entry.isBackground) {
        continue;
      }
      
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    // If we found an expired background image, evict it
    if (expiredBackgroundKey) {
      this.cache.delete(expiredBackgroundKey);
      this.stats.evictions++;
      return;
    }

    // If no non-background images found, then evict background images
    if (!oldestKey) {
      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
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
    };
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
   * Preload multiple images in parallel
   */
  async preloadImages(srcs) {
    const promises = srcs.map(src =>
      this.preloadImage(src).catch(err => {
        console.warn(`Failed to preload image ${src}:`, err);
        return null;
      })
    );

    return Promise.all(promises);
  }

  /**
   * Preload background images with 1-week TTL
   * Background images are static assets that change very rarely
   */
  async preloadBackgroundImages(srcs) {
    // Background images get priority and have a 1-week TTL
    // They should rarely be evicted since they change very infrequently
    
    const promises = srcs.map(src =>
      this.preloadImage(src).catch(err => {
        console.warn(`Failed to preload background image ${src}:`, err);
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

// Create global cache instance
const imageCache = new ImageCache(50);

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
