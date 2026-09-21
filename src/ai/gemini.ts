import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

export interface ReviewResult {
    verdict: 'pass' | 'issues_found' | 'uncertain';
    confidence: number;
    issues: string[];
    reasoning: string;
    correctedCode: string;
}

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

async function requestGemini(
    model: string,
    code: string
): Promise<ReviewResult> {

    console.log(`AshenAudit: Sending request to ${model}...`);

    for (let attempt = 1; attempt <= 3; attempt++) {

        try {

            const response = await ai.models.generateContent({
                model,
                contents: prompt(code)
            });

            const text = response.text;

            if (!text) {
                throw new Error(`${model} returned an empty response.`);
            }

            const review = JSON.parse(text) as ReviewResult;

            console.log(
                `AshenAudit: ${model} review completed.`
            );

            return review;

        } catch (error) {

            console.error(
                `AshenAudit: ${model} attempt ${attempt} failed:`,
                error
            );

            if (attempt === 3) {
                throw error;
            }

            await new Promise(resolve =>
                setTimeout(resolve, 2000)
            );
        }
    }

    throw new Error(`${model} failed.`);
}

export async function reviewCode(
    code: string
): Promise<ReviewResult> {

    return requestGemini(
        'gemini-3.6-flash',
        code
    );
}

export async function reviewCodeWithGeminiLite(
    code: string
): Promise<ReviewResult> {

    return requestGemini(
        'gemini-3.1-flash-lite',
        code
    );
}