import { BigQuery } from '@google-cloud/bigquery';
import path from 'path';

const bq = new BigQuery({
  projectId: 'steampulse-data-eng',
  keyFilename: path.join(process.cwd(), '../gcp_keys.json'),
});

export async function runQuery(query: string, params?: any) {
  const [rows] = await bq.query({ query, params });
  return rows;
}