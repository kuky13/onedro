/**
 * Carrega uma imagem via URL e retorna como base64 DataURL.
 * Suporta retries e timeout configuráveis.
 */
export const loadImage = (url: string, retries = 3, timeout = 10000): Promise<string> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tryLoad = () => {
      attempts++;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      const timeoutId = setTimeout(() => {
        img.src = '';
        if (attempts < retries) {
          setTimeout(tryLoad, 1000);
        } else {
          reject(new Error(`Timeout ao carregar imagem após ${retries} tentativas`));
        }
      }, timeout);

      img.crossOrigin = 'anonymous';
      img.onload = function () {
        clearTimeout(timeoutId);
        try {
          canvas.width = 72;
          canvas.height = 72;
          ctx?.drawImage(img, 0, 0, 72, 72);
          resolve(canvas.toDataURL('image/jpeg', 1.0));
        } catch (error) {
          console.error('[PDF] Erro ao processar imagem:', error);
          if (attempts < retries) {
            setTimeout(tryLoad, 1000);
          } else {
            reject(error);
          }
        }
      };

      img.onerror = function () {
        clearTimeout(timeoutId);
        if (attempts < retries) {
          setTimeout(tryLoad, 1000);
        } else {
          reject(new Error(`Falha ao carregar imagem após ${retries} tentativas`));
        }
      };

      img.src = url;
    };

    tryLoad();
  });
};
