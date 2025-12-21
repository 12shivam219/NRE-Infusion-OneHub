/**
 * Animated Favicon Generator
 * Creates an animated rotating logo favicon using canvas
 */

(function() {
  const logoSvgUrl = '/logos/nretech-circular-icon.svg';
  let animationFrameId = null;
  let rotation = 0;
  const rotationSpeed = 2; // degrees per frame

  /**
   * Create canvas favicon
   */
  function createAnimatedFavicon() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    return canvas;
  }

  /**
   * Load SVG and draw rotated version on canvas
   */
  function drawFaviconFrame(canvas, rotation) {
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw background circle (optional)
    ctx.fillStyle = '#f8f8f8';
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();

    // Create image and draw rotated
    const img = new Image();
    img.onload = function() {
      ctx.save();
      
      // Translate to center, rotate, translate back
      ctx.translate(32, 32);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-32, -32);
      
      // Draw image
      ctx.drawImage(img, 8, 8, 48, 48);
      
      ctx.restore();
      
      // Update favicon
      updateFaviconLink(canvas);
    };
    img.crossOrigin = 'anonymous';
    img.src = logoSvgUrl;
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
        document.head.appendChild(faviconLink);
      }
      
      faviconLink.href = dataUrl;
      faviconLink.type = 'image/png';
    } catch (err) {
      console.warn('Could not update favicon:', err);
    }
  }

  /**
   * Animation loop
   */
  function animate() {
    const canvas = createAnimatedFavicon();
    rotation = (rotation + rotationSpeed) % 360;
    drawFaviconFrame(canvas, rotation);
    animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Start animation when DOM is ready
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      animate();
    });
  } else {
    // DOM is already ready
    animate();
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
