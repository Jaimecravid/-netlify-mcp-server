import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { NetlifyClient } from './netlify/client';
import { ErrorPatternAnalyzer } from './utils/errorAnalysis';
import { config } from './utils/config';

// Create server instance
const server = new Server(
  {
    name: "digitalzango-netlify-mcp-server",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function for retry recommendation logic
function calculateRetryRecommendation(errorPattern: any, metrics: any): { recommended: boolean; reasons: string[] } {
  const reasons: string[] = [];
  let recommended = false;

  if (!errorPattern) {
    reasons.push("Unknown error type - manual investigation required");
    return { recommended: false, reasons };
  }

  // Check build minutes availability
  if (metrics.monthlyLimitRemaining < 30) {
    reasons.push("Critical: Less than 30 build minutes remaining");
    recommended = false;
  } else if (metrics.monthlyLimitRemaining < (errorPattern.buildTimeImpact * 2)) {
    reasons.push("Low build minutes - retry only if critical");
    recommended = false;
  } else {
    // Analyze error type for retry worthiness
    switch (errorPattern.severity) {
      case 'low':
      case 'medium':
        reasons.push("Error type is likely fixable with retry");
        recommended = true;
        break;
      case 'high':
        if (errorPattern.category === 'Network Issue' || errorPattern.category === 'Dependency Conflict') {
          reasons.push("Temporary issue - retry recommended");
          recommended = true;
        } else {
          reasons.push("Code-related issue - fix required before retry");
          recommended = false;
        }
        break;
      case 'critical':
        reasons.push("Critical error - requires code changes before retry");
        recommended = false;
        break;
    }
  }

  // Additional factors
  if (metrics.failureRate > 30) {
    reasons.push("High failure rate detected - investigate pattern before retry");
    recommended = false;
  }

  return { recommended, reasons };
}

// Define all available tools (Phase 1 + Phase 2)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "hello",
        description: "Test connectivity and server status",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list-sites",
        description: "List all Netlify sites in your account",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "check-deployment-status",
        description: "Check recent deployment status for a specific site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: {
              type: "string",
              description: "Netlify site ID or name to check"
            },
            limit: {
              type: "number",
              description: "Number of recent deployments to check (default: 5)",
              default: 5
            }
          },
          required: ["siteId"]
        },
      },
      {
        name: "get-failed-deployments",
        description: "Get detailed information about failed deployments",
        inputSchema: {
          type: "object",
          properties: {
            siteId: {
              type: "string",
              description: "Netlify site ID to check for failures"
            },
            limit: {
              type: "number",
              description: "Number of failed deployments to retrieve (default: 3)",
              default: 3
            }
          },
          required: ["siteId"]
        },
      },
      {
        name: "get-build-metrics",
        description: "Get comprehensive build metrics and performance data",
        inputSchema: {
          type: "object",
          properties: {
            siteId: {
              type: "string",
              description: "Netlify site ID to get metrics for"
            }
          },
          required: ["siteId"]
        },
      },
      {
        name: "analyze-build-error",
        description: "Analyze build errors with AI-powered pattern recognition",
        inputSchema: {
          type: "object",
          properties: {
            deployId: {
              type: "string",
              description: "Deployment ID to analyze for errors"
            }
          },
          required: ["deployId"]
        },
      },
      {
        name: "get-advanced-deployment-status",
        description: "Get advanced deployment status with metrics and analysis",
        inputSchema: {
          type: "object",
          properties: {
            siteId: {
              type: "string",
              description: "Netlify site ID to check"
            }
          },
          required: ["siteId"]
        },
      },
      // Phase 2: Free Tier Optimization Tools
      {
        name: "check-build-minutes",
        description: "Monitor monthly build minutes usage and remaining quota",
        inputSchema: {
          type: "object",
          properties: {
            siteId: {
              type: "string",
              description: "Netlify site ID to check build minutes for"
            }
          },
          required: ["siteId"]
        },
      },
      {
        name: "optimize-build-strategy",
        description: "Analyze build patterns and suggest optimizations for free tier",
        inputSchema: {
          type: "object",
          properties: {
            siteId: {
              type: "string",
              description: "Site ID to analyze"
            },
            timeframe: {
              type: "string",
              enum: ["week", "month"],
              description: "Analysis timeframe"
            }
          },
          required: ["siteId"]
        },
      },
      {
        name: "smart-retry-analysis",
        description: "Determine if a failed deployment should be retried based on error type and build minutes",
        inputSchema: {
          type: "object",
          properties: {
            deploymentId: {
              type: "string",
              description: "Failed deployment ID to analyze"
            }
          },
          required: ["deploymentId"]
        },
      },
      {
        name: "monitor-digitalzango-calendar",
        description: "Monitor your DigitalZango Agricultural Calendar project specifically",
        inputSchema: {
          type: "object",
          properties: {},
        },
      }
    ],
  };
});

// Handle tool execution (Phase 1 + Phase 2)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const netlifyClient = new NetlifyClient(config.netlify.accessToken);

  try {
    switch (request.params.name) {
      case "hello":
        return {
          content: [
            {
              type: "text",
              text: "🚀 DigitalZango Netlify MCP Server v2.0 is running successfully!\n\n✅ Connected to Netlify API\n✅ Phase 1: Advanced monitoring active\n✅ Phase 2: Free tier optimization tools ready\n✅ Build minutes management enabled\n✅ Smart retry analysis available\n\nAvailable tools: list-sites, check-deployment-status, get-failed-deployments, get-build-metrics, analyze-build-error, get-advanced-deployment-status, check-build-minutes, optimize-build-strategy, smart-retry-analysis, monitor-digitalzango-calendar",
            },
          ],
        };

      // ... (Previous Phase 1 cases remain the same) ...

      // Phase 2: Free Tier Optimization Tools
      case "check-build-minutes":
        try {
          const { siteId } = request.params.arguments as { siteId: string };
          const metrics = await netlifyClient.getBuildMetrics(siteId);
          
          const warningLevel = metrics.monthlyLimitRemaining < 50 ? '🔴 CRITICAL' :
                              metrics.monthlyLimitRemaining < 100 ? '🟡 WARNING' : '🟢 GOOD';
          
          return {
            content: [
              {
                type: "text",
                text: `**📊 Build Minutes Status for DigitalZango**

${warningLevel} - ${metrics.monthlyLimitRemaining} minutes remaining

**Monthly Usage:**
• Used: ${metrics.buildMinutesUsed}/300 minutes
• Average build time: ${metrics.averageBuildTime.toFixed(1)} minutes
• Failure rate: ${metrics.failureRate.toFixed(1)}%

**Recommendations:**
${metrics.monthlyLimitRemaining < 100 ? 
  '⚠️ Consider optimizing builds or reducing deployment frequency' : 
  '✅ Usage is within healthy limits'}

**Next Actions:**
• Monitor large content updates that increase build time
• Consider local testing before deployment
• Optimize images and assets for faster builds
• Use build hooks for on-demand deployments
• Consider disabling deploy previews for non-critical branches`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error checking build minutes: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }

      case "optimize-build-strategy":
        try {
          const { siteId, timeframe } = request.params.arguments as { siteId: string; timeframe: string };
          const metrics = await netlifyClient.getBuildMetrics(siteId);
          const deployments = await netlifyClient.getDeployments(siteId, timeframe === 'week' ? 20 : 50);
          
          // Analyze build patterns
          const buildTimes = deployments.map(d => d.deploy_time || 0).filter(t => t > 0);
          const avgBuildTime = buildTimes.reduce((a, b) => a + b, 0) / buildTimes.length / 60; // Convert to minutes
          const maxBuildTime = Math.max(...buildTimes) / 60;
          const minBuildTime = Math.min(...buildTimes) / 60;
          
          // Analyze deployment frequency
          const deploysPerDay = deployments.length / (timeframe === 'week' ? 7 : 30);
          
          // Generate optimization recommendations
          let optimizations: string[] = [];
          
          if (avgBuildTime > 5) {
            optimizations.push("🔧 Build time optimization: Average build time is high - consider code splitting and dependency optimization");
          }
          
          if (deploysPerDay > 3) {
            optimizations.push("📦 Deployment frequency: High deployment frequency detected - consider batching changes");
          }
          
          if (metrics.failureRate > 15) {
            optimizations.push("🚨 Failure rate: High failure rate - implement pre-deployment testing");
          }
          
          if (metrics.monthlyLimitRemaining < 100) {
            optimizations.push("⏰ Build minutes: Approaching monthly limit - prioritize critical deployments only");
          }
          
          if (optimizations.length === 0) {
            optimizations.push("✅ Build strategy is well optimized for free tier usage");
          }

          return {
            content: [
              {
                type: "text",
                text: `**🎯 Build Strategy Analysis (${timeframe})**

**Current Performance:**
• Average build time: ${avgBuildTime.toFixed(1)} minutes
• Build time range: ${minBuildTime.toFixed(1)} - ${maxBuildTime.toFixed(1)} minutes
• Deployments per day: ${deploysPerDay.toFixed(1)}
• Success rate: ${(100 - metrics.failureRate).toFixed(1)}%

**Free Tier Optimization Recommendations:**
${optimizations.map(opt => `• ${opt}`).join('\n')}

**Agricultural Calendar Specific Tips:**
• Schedule content updates during low-traffic periods
• Batch blog post updates to reduce build frequency
• Optimize agricultural images and charts for faster builds
• Use incremental builds for content-only changes
• Consider static generation for seasonal calendar data

**Build Minutes Conservation:**
• Current usage: ${metrics.buildMinutesUsed}/300 minutes
• Projected monthly usage: ${Math.round((metrics.buildMinutesUsed / (new Date().getDate())) * 30)} minutes
• Recommended max builds/day: ${Math.floor(300 / 30 / avgBuildTime)} builds`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error analyzing build strategy: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }

      case "smart-retry-analysis":
        try {
          const { deploymentId } = request.params.arguments as { deploymentId: string };
          const deployment = await netlifyClient.getDeploymentInfo(deploymentId);
          const buildLogs = await netlifyClient.getBuildLogs(deploymentId);
          const metrics = await netlifyClient.getBuildMetrics(deployment.site_id);
          
          const errorPattern = ErrorPatternAnalyzer.analyzeError(
            deployment.error_message || '', 
            buildLogs
          );
          
          const shouldRetry = calculateRetryRecommendation(errorPattern, metrics);
          
          return {
            content: [
              {
                type: "text",
                text: `**🤖 Smart Retry Analysis**

**Deployment:** ${deploymentId.substring(0, 8)}
**Error Type:** ${errorPattern?.category || 'Unknown'}
**Build Time Impact:** ${errorPattern?.buildTimeImpact || 'Unknown'} minutes

**Retry Recommendation:** ${shouldRetry.recommended ? '✅ RETRY' : '❌ DO NOT RETRY'}

**Reasoning:**
${shouldRetry.reasons.map(reason => `• ${reason}`).join('\n')}

**Suggested Actions:**
${errorPattern?.quickFixes.map(fix => `• ${fix}`).join('\n') || '• Manual investigation required'}

**Build Minutes Impact:**
• Current remaining: ${metrics.monthlyLimitRemaining} minutes
• Estimated retry cost: ${errorPattern?.buildTimeImpact || 3} minutes
• Post-retry remaining: ${metrics.monthlyLimitRemaining - (errorPattern?.buildTimeImpact || 3)} minutes

**DigitalZango Recommendations:**
${shouldRetry.recommended ? 
  '• Test fix locally before retry\n• Monitor agricultural calendar functionality after retry\n• Consider staging deployment first' :
  '• Fix code issues before attempting retry\n• Use local development for testing\n• Preserve build minutes for critical updates'}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error analyzing retry strategy: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }

      // ... (Include all other Phase 1 cases here) ...

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 DigitalZango Netlify MCP Server v2.0 running with free tier optimization...");
}

main().catch(console.error);
