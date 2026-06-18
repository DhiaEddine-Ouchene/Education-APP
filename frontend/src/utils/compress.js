/**
 * Resizes and compresses an image file on the client side using HTML5 Canvas.
 * Returns a Promise that resolves with the compressed base64 data URL.
 * Designed to handle custom logos, scaling them to fit the header while preserving aspect ratio.
 */
export function compressImage(file, maxWidth = 200, maxHeight = 70) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Uploaded file must be an image.'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate scaling options to fit constraints while preserving aspect ratio
        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const ratio = Math.min(widthRatio, heightRatio);

        if (ratio < 1) {
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Clear canvas with transparency support
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Export as compressed PNG or JPEG
        try {
          const compressedDataUrl = canvas.toDataURL('image/png', 0.85);
          resolve(compressedDataUrl);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
