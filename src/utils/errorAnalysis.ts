import { DeploymentInfo } from '../netlify/client.js';

export interface ErrorAnalysis {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  possibleCauses: string[];
  suggestedSolutions: string[];
  aiPrompt: string;
}

export class ErrorAnalyzer {
  static analyzeDeploymentError(deployment: DeploymentInfo): ErrorAnalysis {
    const errorMessage = deployment.error_message || '';
    const state = deployment.state;

    // Build failure analysis
    if (state === 'error' || state === 'failed') {
      return this.categorizeError(errorMessage, deployment);
    }

    // Timeout or stopped deployments
    if (state === 'stopped') {
      return {
        category: 'Build Timeout',
        severity: 'medium',
        description: 'Deployment was stopped, possibly due to timeout or manual cancellation',
        possibleCauses: [
          'Build process exceeded time limit',
          'Manual cancellation',
          'Resource constraints',
          'Infinite loops in build script'
        ],
        suggestedSolutions: [
          'Optimize build process for faster execution',
          'Check for infinite loops in build scripts',
          'Reduce build complexity',
          'Contact support if issue persists'
        ],
        aiPrompt: `Analyze this Netlify deployment that was stopped: ${JSON.stringify(deployment, null, 2)}. Provide specific recommendations for optimizing the build process.`
      };
    }

    return {
      category: 'Unknown Error',
      severity: 'medium',
      description: 'Deployment failed with unknown error',
      possibleCauses: ['Unspecified build failure'],
      suggestedSolutions: ['Check build logs for more details'],
      aiPrompt: `Analyze this Netlify deployment error: ${JSON.stringify(deployment, null, 2)}. What could be causing this issue?`
    };
  }

  private static categorizeError(errorMessage: string, deployment: DeploymentInfo): ErrorAnalysis {
    const lowerError = errorMessage.toLowerCase();

    // Dependency errors
    if (lowerError.includes('npm') || lowerError.includes('yarn') || lowerError.includes('package')) {
      return {
        category: 'Dependency Error',
        severity: 'high',
        description: 'Build failed due to dependency installation or resolution issues',
        possibleCauses: [
          'Missing dependencies in package.json',
          'Version conflicts between packages',
          'npm/yarn cache corruption',
          'Network issues during installation'
        ],
        suggestedSolutions: [
          'Clear npm/yarn cache and reinstall dependencies',
          'Update package.json with correct versions',
          'Use npm audit fix to resolve vulnerabilities',
          'Check for peer dependency conflicts'
        ],
        aiPrompt: `This Netlify build failed with dependency issues: ${errorMessage}. Deployment details: ${JSON.stringify(deployment, null, 2)}. What specific dependency problem is this and how can it be fixed?`
      };
    }

    // Build command errors
    if (lowerError.includes('command not found') || lowerError.includes('script')) {
      return {
        category: 'Build Command Error',
        severity: 'high',
        description: 'Build failed because specified build command was not found or failed',
        possibleCauses: [
          'Incorrect build command in Netlify settings',
          'Missing build script in package.json',
          'Wrong base directory configuration',
          'Build tool not installed'
        ],
        suggestedSolutions: [
          'Verify build command matches package.json scripts',
          'Check base directory settings in Netlify',
          'Ensure build dependencies are installed',
          'Test build command locally first'
        ],
        aiPrompt: `This Netlify build failed with command issues: ${errorMessage}. Deployment: ${JSON.stringify(deployment, null, 2)}. What build command configuration needs to be fixed?`
      };
    }

    // Environment/Node version errors
    if (lowerError.includes('node') || lowerError.includes('version') || lowerError.includes('engine')) {
      return {
        category: 'Environment Error',
        severity: 'medium',
        description: 'Build failed due to Node.js version or environment mismatch',
        possibleCauses: [
          'Node.js version mismatch between local and Netlify',
          'Missing environment variables',
          'Incompatible Node.js version for dependencies',
          'Missing .nvmrc file'
        ],
        suggestedSolutions: [
          'Add .nvmrc file with correct Node version',
          'Set NODE_VERSION environment variable in Netlify',
          'Update dependencies for current Node version',
          'Check environment variables are set correctly'
        ],
        aiPrompt: `This Netlify build failed with environment issues: ${errorMessage}. Deployment: ${JSON.stringify(deployment, null, 2)}. What environment configuration needs to be adjusted?`
      };
    }

    // File/path errors
    if (lowerError.includes('file') || lowerError.includes('path') || lowerError.includes('directory')) {
      return {
        category: 'File System Error',
        severity: 'medium',
        description: 'Build failed due to missing files or incorrect paths',
        possibleCauses: [
          'Case sensitivity issues (local vs Netlify)',
          'Missing files in repository',
          'Incorrect file paths in imports',
          'Gitignore excluding required files'
        ],
        suggestedSolutions: [
          'Check file name casing matches exactly',
          'Verify all required files are committed',
          'Review .gitignore for excluded build files',
          'Test build in case-sensitive environment'
        ],
        aiPrompt: `This Netlify build failed with file system issues: ${errorMessage}. Deployment: ${JSON.stringify(deployment, null, 2)}. What file or path problem needs to be resolved?`
      };
    }

    // Generic error fallback
    return {
      category: 'Build Error',
      severity: 'medium',
      description: 'Build failed with unspecified error',
      possibleCauses: [
        'Code compilation errors',
        'Build script failures',
        'Configuration issues'
      ],
      suggestedSolutions: [
        'Review complete build logs',
        'Test build process locally',
        'Check recent code changes'
      ],
      aiPrompt: `This Netlify build failed: ${errorMessage}. Deployment details: ${JSON.stringify(deployment, null, 2)}. Please analyze this error and provide specific solutions.`
    };
  }

  static formatErrorForAI(deployment: DeploymentInfo, analysis: ErrorAnalysis): string {
    return `
NETLIFY DEPLOYMENT ERROR ANALYSIS

Site: ${deployment.deploy_url || 'Unknown'}
Deployment ID: ${deployment.id}
State: ${deployment.state}
Branch: ${deployment.branch || 'Unknown'}
Commit: ${deployment.commit_ref || 'Unknown'}
Created: ${deployment.created_at}

ERROR CATEGORY: ${analysis.category}
SEVERITY: ${analysis.severity}

DESCRIPTION: ${analysis.description}

ERROR MESSAGE: ${deployment.error_message || 'No specific error message'}

POSSIBLE CAUSES:
${analysis.possibleCauses.map(cause => `• ${cause}`).join('\n')}

SUGGESTED SOLUTIONS:
${analysis.suggestedSolutions.map(solution => `• ${solution}`).join('\n')}

CONTEXT FOR AI ANALYSIS:
${analysis.aiPrompt}
    `.trim();
  }
}
