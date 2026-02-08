import { BigQuery } from '@google-cloud/bigquery';
import { NextResponse } from 'next/server';
import path from 'path';

export const dynamic = 'force-dynamic';

const bigquery = new BigQuery({
  projectId: 'steampulse-data-eng',
  // process.cwd() is the root of your Next.js project (the 'frontend' folder)
  keyFilename: process.env.GCP_CREDENTIALS || path.join(process.cwd(), 'gcp_keys.json'), 
});

export async function GET() {
  try {
    const query = `
      SELECT * FROM \`steampulse-data-eng.dbt_gsinha.mart_trends\`
      ORDER BY total_games DESC
      LIMIT 20
    `;

    const [rows] = await bigquery.query(query);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('BigQuery API Error:', error);
    // Return empty array on error so the chart doesn't crash!
    return NextResponse.json([], { status: 500 }); 
  }
}