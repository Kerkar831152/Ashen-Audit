import { ReviewResult } from './types.js';

export interface ComparisonResult {
    status: 'agreement' | 'disagreement' | 'insufficient_reviewers';
    verdict: 'pass' | 'issues_found' | 'uncertain';
    confidence: number;
    reviewersUsed: number;
    explanation: string;
    issues: string[];
    correctedCode: string;
}

export function compareReviews(
    reviews: ReviewResult[]
): ComparisonResult {

    if (reviews.length === 0) {

        return {
            status: 'insufficient_reviewers',
            verdict: 'uncertain',
            confidence: 0,
            reviewersUsed: 0,
            explanation:
                'No AI reviewer returned a valid result.',
            issues: [],
            correctedCode: ''
        };
    }

    if (reviews.length === 1) {

        const review = reviews[0];

        return {
            status: 'insufficient_reviewers',
            verdict: review.verdict,
            confidence: review.confidence,
            reviewersUsed: 1,
            explanation:
                'Only one AI reviewer responded. Independent verification is not available.',
            issues: review.issues,
            correctedCode: review.correctedCode
        };
    }

    const verdicts = reviews.map(
        review => review.verdict
    );

    const allAgree =
        verdicts.every(
            verdict => verdict === verdicts[0]
        );

    if (allAgree) {

        const verdict = verdicts[0];

        const averageConfidence =
            reviews.reduce(
                (total, review) =>
                    total + review.confidence,
                0
            ) / reviews.length;

        const issues = mergeIssues(reviews);

        const correctedCode =
            getBestCorrectedCode(reviews);

        return {
            status: 'agreement',
            verdict,
            confidence: averageConfidence,
            reviewersUsed: reviews.length,
            explanation:
                `All ${reviews.length} available AI reviewers reached the same verdict.`,
            issues,
            correctedCode
        };
    }

    return {
        status: 'disagreement',
        verdict: 'uncertain',
        confidence: calculateDisagreementConfidence(
            reviews
        ),
        reviewersUsed: reviews.length,
        explanation:
            'The AI reviewers produced different verdicts. External evidence should be considered before reaching a final conclusion.',
        issues: mergeIssues(reviews),
        correctedCode: ''
    };
}

function mergeIssues(
    reviews: ReviewResult[]
): string[] {

    const issues: string[] = [];

    for (const review of reviews) {

        for (const issue of review.issues) {

            if (!issues.includes(issue)) {
                issues.push(issue);
            }
        }
    }

    return issues;
}

function getBestCorrectedCode(
    reviews: ReviewResult[]
): string {

    for (const review of reviews) {

        if (review.correctedCode.trim()) {
            return review.correctedCode;
        }
    }

    return '';
}

function calculateDisagreementConfidence(
    reviews: ReviewResult[]
): number {

    const average =
        reviews.reduce(
            (total, review) =>
                total + review.confidence,
            0
        ) / reviews.length;

    return Math.min(average, 0.5);
}