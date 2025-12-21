/**
 * Animated Favicon Generator
 * Creates an animated rotating logo favicon using canvas with improved visibility
 */

(function() {
  const logoSvgUrl = '/logos/nretech-circular-icon.svg';
  let animationFrameId = null;
  let rotation = 0;
  const rotationSpeed = 2; // degrees per frame
  let logoImage = null;

  /**
   * Create canvas favicon
   */
  function createAnimatedFavicon() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    return canvas;
  }

  /**
   * Load SVG image once
   */
  function loadLogoImage() {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = function() {
        logoImage = img;
        resolve(img);
      };
      img.onerror = function() {
        console.warn('Failed to load favicon logo');
        resolve(null);
      };
      img.crossOrigin = 'anonymous';
      img.src = logoSvgUrl;
    });
  }

  /**
   * Draw favicon frame with optimized settings
   */
  function drawFaviconFrame(canvas, rotation) {
    if (!logoImage) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw semi-transparent dark background circle for better contrast
    ctx.fillStyle = 'rgba(13, 17, 23, 0.15)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerX - 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw border circle
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerX - 2, 0, Math.PI * 2);
    ctx.stroke();
    
    // Save context state
    ctx.save();
    
    // Apply rotation at center
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
    
    // Enable smooth rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw logo image (larger to fill more of favicon)
    const padding = 8;
    ctx.drawImage(
      logoImage,
      padding,
      padding,
      canvas.width - (padding * 2),
      canvas.height - (padding * 2)
    );
    
    // Restore context state
    ctx.restore();
    
    // Update favicon link
    updateFaviconLink(canvas);
  }

  /**
   * Update the favicon link with canvas data
   */
  function updateFaviconLink(canvas) {
    try {
      const dataUrl = canvas.toDataURL('image/png');
      let faviconLink = document.querySelector('link[rel="icon"]');
      
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        faviconLink.type = 'image/png';
        document.head.appendChild(faviconLink);
      }
      
      faviconLink.href = dataUrl;
    } catch (err) {
      console.warn('Could not update favicon:', err);
    }
  }

  /**
   * Animation loop
   */
  function animate() {
    if (!logoImage) return;
    
    const canvas = createAnimatedFavicon();
    rotation = (rotation + rotationSpeed) % 360;
    drawFaviconFrame(canvas, rotation);
    animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Initialize animation
   */
  function init() {
    loadLogoImage().then(() => {
      animate();
    });
  }

  /**
   * Start animation when DOM is ready
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM is already ready
    init();
  }

  /**
   * Cleanup on page unload
   */
  window.addEventListener('beforeunload', function() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });
})();
