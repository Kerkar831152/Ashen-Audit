import { getJson } from 'serpapi';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.resolve(__dirname, '../../.env')
});

const apiKey = process.env.SERPAPI_KEY;

if (!apiKey) {
    throw new Error('AshenAudit: SERPAPI_KEY was not found.');
}

export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
}

export interface SerpApiResult {
    query: string;
    results: SearchResult[];
}

export async function searchWithSerpApi(
    query: string
): Promise<SerpApiResult> {

    const response = await getJson({
        engine: 'google',
        q: query,
        api_key: apiKey,
        num: 5
    });

    if (response.error) {
        throw new Error(`SerpApi error: ${response.error}`);
    }

    const organicResults = response.organic_results || [];

    const results: SearchResult[] = organicResults
        .slice(0, 5)
        .map((result: any) => ({
            title: result.title || 'Untitled',
            link: result.link || '',
            snippet: result.snippet || ''
        }));

    return {
        query,
        results
    };
}