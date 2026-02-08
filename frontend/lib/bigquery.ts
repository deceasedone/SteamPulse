import { BigQuery } from '@google-cloud/bigquery';
import path from 'path';

const getOptions = () => {
  if (process.env.GCP_CREDENTIALS) {
    try {
      const credentials = JSON.parse(process.env.GCP_CREDENTIALS);
      
      if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      }

      return {
        projectId: 'steampulse-data-eng',
        credentials,
      };
    } catch (error) {
      console.error('Failed to parse GCP_CREDENTIALS env var:', error);
    }
  }

  return {
    projectId: 'steampulse-data-eng',
    keyFilename: path.join(process.cwd(), 'gcp_keys.json'),
  };
};

const bigquery = new BigQuery(getOptions());

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
    return [] as unknown as T[]; 
  }
}

export const queries = {
  getGenres: () => `
    SELECT DISTINCT primary_genre as genre
    FROM \`steampulse-data-eng.dbt_gsinha.stg_games\`
    WHERE primary_genre IS NOT NULL
    ORDER BY primary_genre
  `,
  
  getPublishers: () => `
    SELECT DISTINCT publisher
    FROM \`steampulse-data-eng.dbt_gsinha.stg_games\`
    WHERE publisher IS NOT NULL AND publisher != ''
    ORDER BY publisher
    LIMIT 100
  `,
};