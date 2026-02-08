import { BigQuery } from '@google-cloud/bigquery';
import path from 'path';

const bigquery = new BigQuery({
  projectId: 'steampulse-data-eng',
  keyFilename: process.env.GCP_CREDENTIALS || path.join(process.cwd(), 'gcp_keys.json'), // Fixed path!
});

export async function runQuery<T = any>(
  query: string, 
  params?: Record<string, any>
): Promise<T[]> {
  try {
    const options = params 
      ? { query, params }
      : { query };
    
    const [rows] = await bigquery.query(options);
    return rows as T[];
  } catch (error) {
    console.error('BigQuery Error:', error);
    throw new Error(`BigQuery query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Type-safe query builder helpers
export const queries = {
  // Get all unique genres for filters
  getGenres: () => `
    SELECT DISTINCT primary_genre as genre
    FROM \`steampulse-data-eng.dbt_gsinha.stg_games\`
    WHERE primary_genre IS NOT NULL
    ORDER BY primary_genre
  `,
  
  // Get all unique publishers for filters
  getPublishers: () => `
    SELECT DISTINCT publisher
    FROM \`steampulse-data-eng.dbt_gsinha.stg_games\`
    WHERE publisher IS NOT NULL AND publisher != ''
    ORDER BY publisher
    LIMIT 100
  `,
};