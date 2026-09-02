import { BigQuery } from '@google-cloud/bigquery';
import fs from 'fs';
import path from 'path';
import { MAX_BYTES_BILLED, PROJECT_ID } from './config';

/** Thrown when the warehouse cannot answer. Callers turn this into a 5xx. */
export class QueryError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'QueryError';
    this.cause = cause;
  }
}

type Credentials = {
  private_key?: string;
  client_email?: string;
  [key: string]: unknown;
};

const getOptions = () => {
  if (process.env.GCP_CREDENTIALS) {
    try {
      const credentials = JSON.parse(process.env.GCP_CREDENTIALS) as Credentials;
      if (typeof credentials.private_key === 'string') {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      }
      return { projectId: PROJECT_ID, credentials };
    } catch (error) {
      // Must not fall through to a keyfile that will not exist in production.
      throw new QueryError('GCP_CREDENTIALS is set but is not valid JSON', error);
    }
  }

  // Local development only; production should use GCP_CREDENTIALS.
  const candidates = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.join(process.cwd(), 'gcp_keys.json'),
    path.join(process.cwd(), '..', 'gcp_keys.json'),
  ].filter((p): p is string => Boolean(p));

  const keyFilename = candidates.find((p) => fs.existsSync(p));
  if (!keyFilename) {
    throw new QueryError(
      'No GCP credentials found. Set GCP_CREDENTIALS (JSON string) or place ' +
        'gcp_keys.json in the frontend/ directory. See .env.example.',
    );
  }

  return { projectId: PROJECT_ID, keyFilename };
};

let client: BigQuery | null = null;
const getClient = () => (client ??= new BigQuery(getOptions()));

export type QueryParams = Record<string, string | number | boolean | null>;

/**
 * Run a parameterised query. Errors propagate: swallowing them makes an auth
 * failure indistinguishable from a genuinely empty result.
 */
export async function runQuery<T>(
  query: string,
  params?: QueryParams,
): Promise<T[]> {
  try {
    const [rows] = await getClient().query({
      query,
      ...(params ? { params } : {}),
      maximumBytesBilled: String(MAX_BYTES_BILLED),
    });
    return rows as T[];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[bigquery] query failed:', message);
    throw new QueryError(`BigQuery query failed: ${message}`, error);
  }
}

/** Convenience for aggregates that must return exactly one row. */
export async function runQuerySingle<T>(
  query: string,
  params?: QueryParams,
): Promise<T | null> {
  const rows = await runQuery<T>(query, params);
  return rows[0] ?? null;
}
