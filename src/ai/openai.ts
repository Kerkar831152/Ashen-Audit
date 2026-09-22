import OpenAI from 'openai';
import { ReviewResult } from './types.js';
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});


export async function reviewCodeWithOpenAI(
    code: string
): Promise<ReviewResult> {

    console.log('AshenAudit: Sending request to OpenAI...');

    const prompt = `
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

    try {

        const response = await openai.responses.create({
            model: 'gpt-5.6-luna',
            input: prompt
        });

        const text = response.output_text;

        if (!text) {
            throw new Error(
                'OpenAI returned an empty response.'
            );
        }

        const review = JSON.parse(text) as ReviewResult;

        console.log(
            'AshenAudit: OpenAI review completed.'
        );

        return review;

    } catch (error) {

        console.error(
            'AshenAudit: OpenAI review failed:',
            error
        );

        throw error;
    }
}