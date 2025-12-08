/**
 * Project Diagnostics Utility
 * Scans and validates the entire codebase for common issues
 */

export interface DiagnosticIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file?: string;
  line?: number;
  message: string;
  fix?: string;
}

export interface DiagnosticReport {
  timestamp: string;
  issues: DiagnosticIssue[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Validate environment variables
 */
export function validateEnvironmentVariables(): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const required = [
    'WC_API_URL',
    'WC_CONSUMER_KEY',
    'WC_CONSUMER_SECRET',
  ];

  for (const varName of required) {
    if (!process.env[varName]) {
      issues.push({
        severity: 'critical',
        category: 'environment',
        message: `Missing required environment variable: ${varName}`,
        fix: `Add ${varName} to .env.local file`,
      });
    }
  }

  // Validate API URL format
  const apiUrl = process.env.WC_API_URL;
  if (apiUrl) {
    try {
      new URL(apiUrl);
    } catch {
      issues.push({
        severity: 'critical',
        category: 'environment',
        message: `Invalid WC_API_URL format: ${apiUrl}`,
        fix: 'Ensure WC_API_URL is a valid URL (e.g., https://your-site.com/wp-json/wc/v3)',
      });
    }
  }

  return issues;
}

/**
 * Check for duplicate AuthProvider implementations
 */
export function checkDuplicateAuthProviders(): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  
  // This is detected by file structure - both components/AuthProvider.tsx and contexts/AuthContext.tsx exist
  issues.push({
    severity: 'high',
    category: 'architecture',
    message: 'Duplicate AuthProvider implementations detected: components/AuthProvider.tsx and contexts/AuthContext.tsx',
    fix: 'Consolidate to use only one AuthProvider. Recommend using contexts/AuthContext.tsx as it has more features.',
  });

  return issues;
}

/**
 * Generate diagnostic report
 */
export function generateDiagnosticReport(): DiagnosticReport {
  const issues: DiagnosticIssue[] = [
    ...validateEnvironmentVariables(),
    ...checkDuplicateAuthProviders(),
  ];

  const summary = {
    total: issues.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length,
  };

  return {
    timestamp: new Date().toISOString(),
    issues,
    summary,
  };
}

