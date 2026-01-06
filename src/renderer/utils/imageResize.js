/**
 * Изменяет размер изображения до указанного размера по длинной стороне
 * @param {string} base64Image - изображение в формате base64
 * @param {number} maxSize - максимальный размер по длинной стороне (по умолчанию 240)
 * @returns {Promise<string>} - Promise с base64 строкой измененного изображения
 */
export function resizeImage(base64Image, maxSize = 240) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // Определяем размеры
      let width = img.width;
      let height = img.height;
      
      // Определяем длинную сторону
      const longSide = Math.max(width, height);
      
      // Если изображение меньше максимального размера, возвращаем как есть
      if (longSide <= maxSize) {
        resolve(base64Image);
        return;
      }
      
      // Вычисляем новые размеры с сохранением пропорций
      const ratio = maxSize / longSide;
      const newWidth = Math.round(width * ratio);
      const newHeight = Math.round(height * ratio);
      
      // Создаем canvas для изменения размера
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      // Конвертируем обратно в base64
      const resizedBase64 = canvas.toDataURL('image/png', 0.9);
      resolve(resizedBase64);
    };
    
    img.onerror = (error) => {
      reject(new Error('Ошибка при загрузке изображения: ' + error));
    };
    
    img.src = base64Image;
  });
}

