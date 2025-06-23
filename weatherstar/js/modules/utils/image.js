/**
 * Comprehensive Image Cache System
 * Prevents unnecessary refetching of images during app loops
 */
class ImageCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.stats = {
      hits: 0,
      misses: 0,
      loads: 0,
      evictions: 0,
    };
    this.loadingPromises = new Map();
    this.initCache();
  }

  /**
   * Initialize cache from localStorage if available
   */
  initCache() {
    try {
      const cached = localStorage.getItem('weatherstar4k_image_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Only restore cache entries that are still valid (within 24 hours)
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        parsed.forEach(([url, entry]) => {
          if (entry.timestamp > cutoff) {
            this.cache.set(url, entry);
          }
        });
        console.log(
          `Restored ${this.cache.size} cached images from localStorage`
        );
      }
    } catch (error) {
      console.warn('Failed to restore image cache from localStorage:', error);
    }
  }

  /**
   * Save cache to localStorage
   */
  saveCache() {
    try {
      const cacheArray = Array.from(this.cache.entries());
      localStorage.setItem(
        'weatherstar4k_image_cache',
        JSON.stringify(cacheArray)
      );
    } catch (error) {
      console.warn('Failed to save image cache to localStorage:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? (
            (this.stats.hits / (this.stats.hits + this.stats.misses)) *
            100
          ).toFixed(1)
        : 0;
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxSize,
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

    const entry = {
      img,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
    };

    this.cache.set(src, entry);
    this.stats.loads++;

    // Save cache periodically (every 10 loads)
    if (this.stats.loads % 10 === 0) {
      this.saveCache();
    }
  }

  /**
   * Evict oldest cache entries
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
    this.stats = { hits: 0, misses: 0, loads: 0, evictions: 0 };
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
const imageCache = new ImageCache(150); // Cache up to 150 images

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
