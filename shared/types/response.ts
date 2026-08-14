export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface ResponsePagination<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface APIResponseSuccess<T = any> {
  message: string;
  data?: T;
}

export interface APIResponseError {
  statusCode: number;
  message: string;
  data?: any;
}
