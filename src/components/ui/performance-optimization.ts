/**
 * Utilitários para otimização de performance
 */

/**
 * Debounce function - Limita a frequência com que uma função é executada
 * @param func Função a ser executada
 * @param wait Tempo de espera em ms
 * @returns Função com debounce aplicado
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - Garante que uma função não seja executada mais que uma vez em um período específico
 * @param func Função a ser executada
 * @param limit Limite de tempo em ms
 * @returns Função com throttle aplicado
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Memoize function - Armazena em cache os resultados de chamadas de função para entradas específicas
 * @param func Função a ser memoizada
 * @returns Função memoizada
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, ReturnType<T>>();

  return function (...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Lazy loading de imagens
 * @param imageElement Elemento de imagem a ser carregado de forma lazy
 */
export function lazyLoadImage(imageElement: HTMLImageElement): void {
  if ("loading" in HTMLImageElement.prototype) {
    // Navegador suporta lazy loading nativo
    imageElement.loading = "lazy";
  } else {
    // Fallback para navegadores que não suportam lazy loading nativo
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src || "";
          observer.unobserve(img);
        }
      });
    });

    observer.observe(imageElement);
  }
}

/**
 * Otimiza a renderização de listas longas
 * @param items Array de itens
 * @param pageSize Tamanho da página
 * @param currentPage Página atual
 * @returns Itens paginados
 */
export function paginateItems<T>(
  items: T[],
  pageSize: number,
  currentPage: number,
): T[] {
  const startIndex = (currentPage - 1) * pageSize;
  return items.slice(startIndex, startIndex + pageSize);
}
