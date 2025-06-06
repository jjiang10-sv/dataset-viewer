export interface DatasetRow {
  id: string | number;
  [key: string]: string | number | boolean;
}

export interface RowRating {
  rowId: string | number;
  rating: number;
  comment: string;
}

export interface GiscusConfig {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: string;
  term?: string;
  reactionsEnabled: string;
  emitMetadata: string;
  inputPosition: string;
  theme: string;
  lang: string;
  loading?: string;
}

export interface ApiConfig {
  baseUrl: string;
  endpoint: string;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST';
  body?: any;
} 