export interface ReviewResult {
    verdict: 'pass' | 'issues_found' | 'uncertain';
    confidence: number;
    issues: string[];
    reasoning: string;
    correctedCode: string;
}