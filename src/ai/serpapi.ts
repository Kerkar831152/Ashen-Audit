import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);


dotenv.config({
    path: path.resolve(
        __dirname,
        '../../.env'
    )
});


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

    const apiKey =
        process.env.SERPAPI_KEY;


    if (!apiKey) {
        throw new Error(
            'AshenAudit: SERPAPI_KEY was not found.'
        );
    }


    console.log(
        'AshenAudit: Searching SerpApi...'
    );


    const params =
        new URLSearchParams({
            engine: 'google',
            q: query,
            api_key: apiKey,
            num: '5'
        });


    const url =
        `https://serpapi.com/search.json?${params.toString()}`;


    const response =
        await fetch(url);


    if (!response.ok) {

        throw new Error(
            `SerpApi HTTP error: ${response.status} ${response.statusText}`
        );
    }


    const data =
        await response.json() as {
            error?: string;

            organic_results?: Array<{
                title?: string;
                link?: string;
                snippet?: string;
            }>;
        };


    if (data.error) {

        throw new Error(
            `SerpApi error: ${data.error}`
        );
    }


    const organicResults =
        data.organic_results || [];


    const results:
        SearchResult[] =
        organicResults
            .slice(0, 5)
            .map(result => ({
                title:
                    result.title ||
                    'Untitled',

                link:
                    result.link ||
                    '',

                snippet:
                    result.snippet ||
                    ''
            }));


    console.log(
        `AshenAudit: SerpApi returned ${results.length} results.`
    );


    return {
        query,
        results
    };
}