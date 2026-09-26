import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { ReviewResult } from './types.js';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const projectRoot = path.resolve(currentDirectory, '../../');
const envPath = path.join(projectRoot, '.env');

dotenv.config({
    path: envPath
});

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
    throw new Error(
        `AshenAudit: GROQ_API_KEY was not found. Expected .env at: ${envPath}`
    );
}

const groq = new Groq({
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
- Return ONLY JSON.
- Do not use Markdown or code fences.

Code:

${code}
`;
}

export async function reviewWithGroq(
    code: string,
    instruction: string,
    model: string
): Promise<ReviewResult> {
    console.log(
        `AshenAudit: Sending ${model} request to Groq...`
    );

    const response =
        await groq.chat.completions.create({
            model,
            messages: [
                {
                    role: 'user',
                    content: buildPrompt(
                        code,
                        instruction
                    )
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
        `AshenAudit: ${model} review completed.`
    );

    return review;
}