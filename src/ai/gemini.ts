import { GoogleGenAI } from '@google/genai';
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
    process.env.GEMINI_API_KEY;


if (!apiKey) {

    throw new Error(
        `AshenAudit: GEMINI_API_KEY was not found. Expected .env at: ${envPath}`
    );
}


const ai =
    new GoogleGenAI({
        apiKey
    });


function buildPrompt(
    code: string,
    instruction: string
): string {

    return `
You are an independent code verification system.

${instruction}

Analyze the supplied code carefully.

Return ONLY valid JSON.

Required structure:

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
- Only report issues supported by the supplied code.
- If there is a real problem, explain it in issues.
- If there is a problem, correctedCode must contain the complete corrected code.
- If there is no problem, correctedCode must be empty.
- Keep reasoning concise.
- Do not put Markdown inside the JSON.
- Return ONLY JSON.

Code:

${code}
`;
}


export async function reviewWithGemini(
    code: string,
    instruction: string,
    model: string
): Promise<ReviewResult> {

    console.log(
        `AshenAudit: Sending ${model} request to Gemini...`
    );


    for (
        let attempt = 1;
        attempt <= 3;
        attempt++
    ) {

        try {

            const response =
                await ai.models.generateContent({
                    model,
                    contents:
                        buildPrompt(
                            code,
                            instruction
                        )
                });


            const text =
                response.text;


            if (!text) {

                throw new Error(
                    `${model} returned an empty response.`
                );
            }


            const review =
                JSON.parse(
                    text
                ) as ReviewResult;


            validateReview(
                review,
                model
            );


            console.log(
                `AshenAudit: ${model} review completed.`
            );


            return review;


        } catch (error) {

            const errorObject =
                error as {
                    status?: number;
                    message?: string;
                };


            const message =
                error instanceof Error
                    ? error.message
                    : String(error);


            /*
             * Do not waste retries on quota errors.
             *
             * This allows reviewer/final-review fallback
             * providers to run immediately.
             */

            const isQuotaError =
                errorObject.status === 429 ||
                message.includes('429') ||
                message.includes(
                    'RESOURCE_EXHAUSTED'
                ) ||
                message.includes(
                    'quota'
                );


            console.error(
                `AshenAudit: ${model} attempt ${attempt} failed:`,
                message
            );


            if (
                isQuotaError ||
                attempt === 3
            ) {

                throw error;
            }


            /*
             * Retry transient server errors.
             */

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        2000
                    )
            );
        }
    }


    throw new Error(
        `${model} failed.`
    );
}


function validateReview(
    review: ReviewResult,
    model: string
): void {

    if (
        !review ||
        typeof review !== 'object'
    ) {

        throw new Error(
            `${model} returned an invalid review object.`
        );
    }


    if (
        review.verdict !== 'pass' &&
        review.verdict !== 'issues_found' &&
        review.verdict !== 'uncertain'
    ) {

        throw new Error(
            `${model} returned an invalid verdict.`
        );
    }


    if (
        typeof review.confidence !== 'number' ||
        !Number.isFinite(
            review.confidence
        )
    ) {

        throw new Error(
            `${model} returned invalid confidence.`
        );
    }


    if (
        !Array.isArray(
            review.issues
        )
    ) {

        throw new Error(
            `${model} returned invalid issues.`
        );
    }


    if (
        typeof review.reasoning !==
        'string'
    ) {

        throw new Error(
            `${model} returned invalid reasoning.`
        );
    }


    if (
        typeof review.correctedCode !==
        'string'
    ) {

        throw new Error(
            `${model} returned invalid correctedCode.`
        );
    }
}