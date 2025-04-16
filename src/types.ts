import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface MyQuery extends DataQuery {
  service: string;
  operation: string;
  tags: string[];
  extractTags: string[];
  maxDuration: string;
  minDuration: string;
  limit: number;
}

export const DEFAULT_QUERY: Partial<MyQuery> = {
  service: "",
  limit: 100,
  operation: "ALL"
};

export interface DataPoint {
  Time: number;
  Value: number;
}

export interface DataSourceResponse {
  datapoints: DataPoint[];
}

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  path?: string;
  maxParallel?: number;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  apiKey?: string;
}
