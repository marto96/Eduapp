import { normalizePagination, DEFAULT_PAGE_SIZE } from './pagination';

describe('normalizePagination', () => {
  it('usa page 1 y el pageSize default sin argumentos', () => {
    expect(normalizePagination(undefined, undefined)).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  });

  it('respeta page y pageSize válidos', () => {
    expect(normalizePagination(3, 50)).toEqual({ page: 3, pageSize: 50 });
  });

  it.each([0, -1, 1.5])('cae a page 1 con un valor inválido (%p)', (page) => {
    expect(normalizePagination(page, 25).page).toBe(1);
  });

  it('cae al pageSize default si no está en la lista permitida', () => {
    expect(normalizePagination(1, 999).pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it.each([10, 25, 50, 100])('acepta el pageSize permitido %p', (pageSize) => {
    expect(normalizePagination(1, pageSize).pageSize).toBe(pageSize);
  });
});
