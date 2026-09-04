export const ALLOWED_PAGE_SIZES = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 25;

/**
 * Centraliza el criterio de "page/pageSize inválidos caen a un default
 * seguro" que se repite en cada use-case de listado paginado — `page` debe
 * ser un entero positivo, `pageSize` uno de los tamaños permitidos (evita
 * que alguien pida pageSize=999999 y tumbe la consulta).
 */
export function normalizePagination(
  page: number | undefined,
  pageSize: number | undefined,
): { page: number; pageSize: number } {
  const safePage = Number.isInteger(page) && page! > 0 ? page! : 1;
  const safePageSize = pageSize && ALLOWED_PAGE_SIZES.includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE;
  return { page: safePage, pageSize: safePageSize };
}
