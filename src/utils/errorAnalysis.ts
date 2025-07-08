export interface ErrorPattern {
  pattern: RegExp;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  buildTimeImpact: number; // minutes
  commonCauses: string[];
  quickFixes: string[];
  preventionTips: string[];
}

export const NETLIFY_ERROR_PATTERNS: ErrorPattern[] = [
  {
    pattern: /npm.*ERR.*peer dep/i,
    category: 'Dependency Conflict',
    severity: 'high',
    buildTimeImpact: 2,
    commonCauses: ['Peer dependency version mismatch', 'Package.json conflicts'],
    quickFixes: ['npm install --legacy-peer-deps', 'Update conflicting packages'],
    preventionTips: ['Regular dependency audits', 'Lock file maintenance']
  },
  {
    pattern: /out of memory|heap.*limit/i,
    category: 'Memory Limit',
    severity: 'critical',
    buildTimeImpact: 5,
    commonCauses: ['Large bundle size', 'Memory-intensive build process'],
    quickFixes: ['Increase Node memory limit', 'Optimize bundle splitting'],
    preventionTips: ['Bundle analysis', 'Code splitting', 'Image optimization']
  },
  {
    pattern: /command not found.*gatsby|hugo|next/i,
    category: 'Build Tool Missing',
    severity: 'high',
    buildTimeImpact: 1,
    commonCauses: ['Missing build dependencies', 'Incorrect build command'],
    quickFixes: ['Update package.json scripts', 'Install missing dependencies'],
    preventionTips: ['Verify build commands locally', 'Document build requirements']
  },
  {
    pattern: /failed to fetch|network error|timeout/i,
    category: 'Network Issue',
    severity: 'medium',
    buildTimeImpact: 3,
    commonCauses: ['External API unavailable', 'DNS resolution issues', 'CDN problems'],
    quickFixes: ['Retry build', 'Check external service status', 'Implement fallbacks'],
    preventionTips: ['Add retry logic', 'Monitor external dependencies', 'Use CDN alternatives']
  },
  {
    pattern: /typescript.*error|ts\(\d+\)/i,
    category: 'TypeScript Error',
    severity: 'high',
    buildTimeImpact: 2,
    commonCauses: ['Type definition issues', 'Strict mode violations', 'Missing type declarations'],
    quickFixes: ['Fix type annotations', 'Update @types packages', 'Add type assertions'],
    preventionTips: ['Enable strict TypeScript checking', 'Regular type audits', 'Use proper typing']
  },
  {
    pattern: /next.*build.*failed|next.*error/i,
    category: 'Next.js Build Error',
    severity: 'high',
    buildTimeImpact: 3,
    commonCauses: ['Invalid Next.js configuration', 'Build optimization issues', 'Static generation errors'],
    quickFixes: ['Check next.config.js', 'Update Next.js version', 'Fix static props'],
    preventionTips: ['Test builds locally', 'Monitor Next.js updates', 'Validate configurations']
  },
  {
    pattern: /eslint.*error|linting.*failed/i,
    category: 'Linting Error',
    severity: 'medium',
    buildTimeImpact: 1,
    commonCauses: ['Code style violations', 'ESLint configuration issues', 'Deprecated rules'],
    quickFixes: ['Fix linting errors', 'Update ESLint config', 'Disable problematic rules'],
    preventionTips: ['Pre-commit hooks', 'IDE linting integration', 'Regular rule updates']
  }
];

export class ErrorPatternAnalyzer {
  static analyzeError(errorMessage: string, buildLogs: any[]): ErrorPattern | null {
    for (const pattern of NETLIFY_ERROR_PATTERNS) {
      if (pattern.pattern.test(errorMessage)) {
        return pattern;
      }
    }
    return null;
  }

  static generateAIPrompt(error: ErrorPattern, context: any): string {
    return `NETLIFY BUILD ERROR ANALYSIS FOR DIGITALZANGO

Error Category: ${error.category}
Severity: ${error.severity}
Build Time Impact: ${error.buildTimeImpact} minutes

Context:
- Site: DigitalZango Agricultural Calendar
- Build Minutes Remaining: ${context.buildMinutesRemaining || 'Unknown'}
- Recent Failure Rate: ${context.failureRate || 'Unknown'}%
- Project Type: Next.js + TypeScript Agricultural Calendar App

Quick Fixes Available:
${error.quickFixes.map(fix => `• ${fix}`).join('\n')}

Common Causes:
${error.commonCauses.map(cause => `• ${cause}`).join('\n')}

Prevention Tips:
${error.preventionTips.map(tip => `• ${tip}`).join('\n')}

Please provide:
1. Root cause analysis for this specific error
2. Step-by-step fix implementation for Next.js/TypeScript project
3. Prevention strategy for future builds
4. Build time optimization recommendations for agricultural calendar app
5. Specific considerations for Angola deployment context
    `.trim();
  }

  static categorizeErrors(buildLogs: any[]): {
    critical: ErrorPattern[];
    high: ErrorPattern[];
    medium: ErrorPattern[];
    low: ErrorPattern[];
    unrecognized: string[];
  } {
    const categorized = {
      critical: [] as ErrorPattern[],
      high: [] as ErrorPattern[],
      medium: [] as ErrorPattern[],
      low: [] as ErrorPattern[],
      unrecognized: [] as string[]
    };

    const errorLogs = buildLogs.filter(log => log.level === 'error');
    
    errorLogs.forEach(log => {
      const pattern = this.analyzeError(log.message, buildLogs);
      if (pattern) {
        categorized[pattern.severity].push(pattern);
      } else {
        categorized.unrecognized.push(log.message);
      }
    });

    return categorized;
  }

  static calculateTotalBuildTimeImpact(errors: ErrorPattern[]): number {
    return errors.reduce((total, error) => total + error.buildTimeImpact, 0);
  }

  static generateSummaryReport(buildLogs: any[], buildMetrics: any): string {
    const categorized = this.categorizeErrors(buildLogs);
    const totalImpact = this.calculateTotalBuildTimeImpact([
      ...categorized.critical,
      ...categorized.high,
      ...categorized.medium,
      ...categorized.low
    ]);

    return `
DIGITALZANGO BUILD ERROR SUMMARY REPORT

Build Metrics:
- Build Minutes Used: ${buildMetrics.buildMinutesUsed || 'Unknown'}
- Monthly Limit Remaining: ${buildMetrics.monthlyLimitRemaining || 'Unknown'}
- Failure Rate: ${buildMetrics.failureRate || 'Unknown'}%

Error Analysis:
- Critical Errors: ${categorized.critical.length}
- High Priority: ${categorized.high.length}
- Medium Priority: ${categorized.medium.length}
- Low Priority: ${categorized.low.length}
- Unrecognized: ${categorized.unrecognized.length}

Estimated Build Time Impact: ${totalImpact} minutes

Priority Actions:
${categorized.critical.length > 0 ? '🚨 CRITICAL: Address memory/system issues immediately' : ''}
${categorized.high.length > 0 ? '⚠️ HIGH: Fix dependency and build tool issues' : ''}
${categorized.medium.length > 0 ? '📋 MEDIUM: Resolve network and configuration issues' : ''}

Next Steps:
1. Address critical errors first to prevent build failures
2. Implement prevention strategies for recurring issues
3. Monitor build minute usage to stay within free tier limits
4. Set up automated error detection for agricultural calendar deployments
    `.trim();
  }
}
