export type Verdict =
    'pass' |
    'issues_found' |
    'uncertain';

export type ReviewerRole =
    'triage' |
    'architecture' |
    'logic' |
    'security';

export interface ReviewResult {
    verdict: Verdict;
    confidence: number;
    issues: string[];
    reasoning: string;
    correctedCode: string;
}

export interface SpecializedReviewResult
    extends ReviewResult {
    role: ReviewerRole;
    provider: string;
    model: string;
}

export interface ReviewerDisplay {
    name: string;
    role?: ReviewerRole;
    provider?: string;
    model?: string;
    status: 'success' | 'failed';
    review?: SpecializedReviewResult;
    error?: string;
}