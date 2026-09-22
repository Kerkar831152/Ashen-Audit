import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

import {
    ReviewResult
} from './types.js';


const currentFile =
    fileURLToPath(import.meta.url);


const currentDirectory =
    path.dirname(currentFile);


const projectRoot =
    path.resolve(
        currentDirectory,
        '../../'
    );


const envPath =
    path.join(
        projectRoot,
        '.env'
    );


dotenv.config({
    path: envPath
});


const apiKey =
    process.env.GROQ_API_KEY;


if (!apiKey) {

    throw new Error(
        `AshenAudit: GROQ_API_KEY was not found. Expected .env at: ${envPath}`
    );

}


const groq =
    new Groq({
        apiKey
    });


const prompt = (code: string) => `
You are an independent code verification system.

Analyze the code carefully.

Determine whether it is correct.

Return ONLY valid JSON with this structure:

{
    "verdict": "pass",
    "confidence": 0.95,
    "issues": [],
    "reasoning": "Brief explanation.",
    "correctedCode": ""
}

Rules:
- verdict must be "pass", "issues_found", or "uncertain".
- confidence must be between 0 and 1.
- Do not invent problems.
- If there is a real problem, explain it in issues.
- If there is a problem, correctedCode must contain the complete corrected code.
- If there is no problem, correctedCode must be empty.
- Keep reasoning concise.
- Return ONLY JSON.
- Do not use Markdown or code fences.

Code:

${code}
`;


export async function reviewCodeWithGroq(
    code: string
): Promise<ReviewResult> {

    console.log(
        'AshenAudit: Sending request to Groq...'
    );


    try {

        const response =
            await groq.chat.completions.create({

                model:
                    'openai/gpt-oss-20b',

                messages: [
                    {
                        role: 'user',
                        content: prompt(code)
                    }
                ],

                response_format: {
                    type: 'json_object'
                }

            });


        const text =
            response.choices[0]?.message?.content;


        if (!text) {

            throw new Error(
                'Groq returned an empty response.'
            );

        }


        const review =
            JSON.parse(text) as ReviewResult;


        console.log(
            'AshenAudit: Groq review completed.'
        );


        return review;

    } catch (error) {

        console.error(
            'AshenAudit: Groq review failed:',
            error
        );

        throw error;

    }

}
