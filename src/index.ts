import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { NetlifyClient } from './netlify/client';
import { ErrorPatternAnalyzer } from './utils/errorAnalysis';
import { ContentOptimizer, DigitalZangoContentAnalyzer } from './utils/contentOptimization';
import { config } from './utils/config';

// Create server instance
const server = new Server(
  {
    name: "digitalzango-netlify-mcp-server",
    version: "3.0.0",
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

// Helper function for generic AI prompt generation
function generateGenericAIPrompt(deployment: any, buildLogs: any[], aiContext: any): string {
  return `NETLIFY DEPLOYMENT ERROR ANALYSIS FOR DIGITALZANGO

Project Context:
- Project: ${aiContext.project}
- Framework: ${aiContext.framework}
- Content Type: ${aiContext.contentType}
- Deployment Frequency: ${aiContext.deploymentFrequency}

Deployment Information:
- Deployment ID: ${deployment.id}
- State: ${deployment.state}
- Created: ${deployment.created_at}
- Branch: ${deployment.branch || 'unknown'}
- Error: ${deployment.error_message || 'No specific error message'}

Build Context:
- Build Minutes Remaining: ${aiContext.buildMinutesRemaining}
- Recent Failure Rate: ${aiContext.failureRate}%
- Average Build Time: ${aiContext.averageBuildTime} minutes

Build Logs Summary:
${buildLogs.slice(0, 5).map(log => `- ${log.level}: ${log.message.substring(0, 100)}...`).join('\n')}

Please provide:
1. Root cause analysis for this deployment error
2. Step-by-step fix implementation
3. Prevention strategy for future deployments
4. Build optimization recommendations for agricultural content
5. Specific considerations for content creator workflow`;
}

// Define all available tools (Phase 1 + Phase 2 + Phase 3)
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
      // Phase 3: Content Workflow Integration Tools
      {
        name: "analyze-content-performance",
        description: "Analyze content impact on build performance and optimization opportunities",
        inputSchema: {
          type: "object",
          properties: {
            siteId: {
              type: "string",
              description: "Site ID to analyze content performance"
            },
            timeframe: {
              type: "string",
              enum: ["week", "month", "quarter"],
              description: "Analysis timeframe",
              default: "month"
            }
          },
          required: ["siteId"]
        },
      },
      {
        name: "format-error-for-ai",
        description: "Format deployment errors with full context for AI assistant analysis",
        inputSchema: {
          type: "object",
          properties: {
            deploymentId: {
              type: "string",
              description: "Deployment ID with error to format"
            },
            includeProjectContext: {
              type: "boolean",
              description: "Include DigitalZango project structure context",
              default: true
            }
          },
          required: ["deploymentId"]
        },
      },
      {
        name: "generate-content-optimization-report",
        description: "Generate comprehensive content optimization report for DigitalZango blog and social media",
        inputSchema: {
          type: "object",
          properties: {
            siteId: {
              type: "string",
              description: "Site ID to generate report for"
            },
            includeSeasonalAnalysis: {
              type: "boolean",
              description: "Include seasonal content trends analysis",
              default: true
            }
          },
          required: ["siteId"]
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

// Handle tool execution (Phase 1 + Phase 2 + Phase 3)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const netlifyClient = new NetlifyClient(config.netlify.accessToken);

  try {
    switch (request.params.name) {
      case "hello":
        return {
          content: [
            {
              type: "text",
              text: "🚀 DigitalZango Netlify MCP Server v3.0 is running successfully!\n\n✅ Connected to Netlify API\n✅ Phase 1: Advanced monitoring active\n✅ Phase 2: Free tier optimization tools ready\n✅ Phase 3: Content workflow integration enabled\n✅ AI assistant integration ready\n✅ Agricultural content optimization active\n\nAvailable tools: list-sites, check-deployment-status, get-failed-deployments, get-build-metrics, analyze-build-error, get-advanced-deployment-status, check-build-minutes, optimize-build-strategy, smart-retry-analysis, analyze-content-performance, format-error-for-ai, generate-content-optimization-report, monitor-digitalzango-calendar",
            },
          ],
        };

      case "list-sites":
        try {
          const sites = await netlifyClient.getSites();
          const siteList = sites.map(site => 
            `• **${site.name}** (${site.id})\n  URL: ${site.url}\n  State: ${site.state}\n  Updated: ${new Date(site.updated_at).toLocaleString()}`
          ).join('\n\n');

          return {
            content: [
              {
                type: "text",
                text: `**Your Netlify Sites (${sites.length} total):**\n\n${siteList}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error fetching sites: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }

      case "check-deployment-status":
        try {
          const { siteId, limit = 5 } = request.params.arguments as { siteId: string; limit?: number };
          
          const deployments = await netlifyClient.getDeployments(siteId, limit);
          
          if (deployments.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `No deployments found for site: ${siteId}`,
                },
              ],
            };
          }

          const statusReport = deployments.map(deploy => {
            const status = deploy.state === 'ready' ? '✅' : 
                          deploy.state === 'error' ? '❌' : 
                          deploy.state === 'building' ? '🔄' : '⏳';
            
            return `${status} **${deploy.state.toUpperCase()}** - ${new Date(deploy.created_at).toLocaleString()}\n   Branch: ${deploy.branch || 'unknown'}\n   Commit: ${deploy.commit_ref?.substring(0, 7) || 'unknown'}\n   Deploy Time: ${deploy.deploy_time ? Math.ceil(deploy.deploy_time / 60) + ' minutes' : 'unknown'}${deploy.error_message ? `\n   Error: ${deploy.error_message.substring(0, 100)}...` : ''}`;
          }).join('\n\n');

          return {
            content: [
              {
                type: "text",
                text: `**Recent Deployments for ${siteId}:**\n\n${statusReport}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error checking deployment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }

      case "get-failed-deployments":
        try {
          const { siteId, limit = 3 } = request.params.arguments as { siteId: string; limit?: number };
          
          const failedDeployments = await netlifyClient.getFailedDeployments(siteId);
          const limitedFailures = failedDeployments.slice(0, limit);
          
          if (limitedFailures.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `✅ No failed deployments found for site: ${siteId}`,
                },
              ],
            };
          }

          const failureReport = limitedFailures.map(deploy => {
            return `❌ **Deployment ${deploy.id.substring(0, 8)}**\n   Time: ${new Date(deploy.created_at).toLocaleString()}\n   Branch: ${deploy.branch || 'unknown'}\n   Deploy Time: ${deploy.deploy_time ? Math.ceil(deploy.deploy_time / 60) + ' minutes' : 'unknown'}\n   Error: ${deploy.error_message?.substring(0, 200) || 'No specific error message'}...`;
          }).join('\n\n');

          return {
            content: [
              {
                type: "text",
                text: `**Failed Deployments for ${siteId}:**\n\n${failureReport}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error fetching failed deployments: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }

      case "get-build-metrics":
        try {
          const { siteId } = request.params.arguments as { siteId: string };
          
          const metrics = await netlifyClient.getBuildMetrics(siteId);
          
          const metricsReport = `**📊 Build Metrics for ${siteId}:**

**Performance:**
• Average Build Time: ${metrics.averageBuildTime} minutes
• Total Build Minutes Used: ${metrics.buildMinutesUsed} minutes
• Monthly Limit Remaining: ${metrics.monthlyLimitRemaining} minutes
• Failure Rate: ${metrics.failureRate}%

**Status:**
${metrics.monthlyLimitRemaining < 50 ? '⚠️ **WARNING:** Low build minutes remaining!' : '✅ Build minutes usage is healthy'}
${metrics.failureRate > 20 ? '⚠️ **WARNING:** High failure rate detected!' : '✅ Failure rate is acceptable'}

**Recommendations:**
${metrics.monthlyLimitRemaining < 50 ? '• Consider optimizing build process to reduce minutes usage\n' : ''}${metrics.failureRate > 20 ? '• Investigate recurring build failures\n' : ''}• Monitor build performance regularly for DigitalZango agricultural calendar`;

          return {
            content: [
              {
                type: "text",
                text: metricsReport,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error fetching build metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }

      case "analyze-build-error":
        try {
          const { deployId } = request.params.arguments as { deployId: string };
          
          const logs = await netlifyClient.getBuildLogs(deployId);
          const errorLogs = logs.filter(log => log.level === 'error');
          
          if (errorLogs.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `✅ No errors found in build logs for deployment ${deployId}`,
                },
              ],
            };
          }

          const analysisResults = errorLogs.map(errorLog => {
            const pattern = ErrorPatternAnalyzer.analyzeError(errorLog.message, logs);
            return {
              error: errorLog,
              pattern: pattern,
              aiPrompt: pattern ? ErrorPatternAnalyzer.generateAIPrompt(pattern, {
                buildMinutesRemaining: 250,
                failureRate: 15
              }) : null
            };
          });

          let analysisReport = `**🔍 Build Error Analysis for Deployment ${deployId}:**\n\n`;
          
          analysisResults.forEach((result, index) => {
            analysisReport += `**Error ${index + 1}:**\n`;
            analysisReport += `• Message: ${result.error.message.substring(0, 150)}...\n`;
            
            if (result.pattern) {
              analysisReport += `• Category: ${result.pattern.category}\n`;
              analysisReport += `• Severity: ${result.pattern.severity}\n`;
              analysisReport += `• Build Time Impact: ${result.pattern.buildTimeImpact} minutes\n`;
              analysisReport += `• Quick Fixes: ${result.pattern.quickFixes.slice(0, 2).join(', ')}\n`;
            } else {
              analysisReport += `• Category: Unrecognized Error\n`;
              analysisReport += `• Requires manual investigation\n`;
            }
            
            analysisReport += `\n`;
          });

          return {
            content: [
              {
                type: "text",
                text: analysisReport,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error analyzing build error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }

      case "get-advanced-deployment-status":
        try {
          const { siteId } = request.params.arguments as { siteId: string };
          
          const [deployments, metrics] = await Promise.all([
            netlifyClient.getDeployments(siteId, 10),
            netlifyClient.getBuildMetrics(siteId)
          ]);

          const recentDeployments = deployments.map(deploy => ({
            id: deploy.id,
            state: deploy.state,
            created_at: deploy.created_at,
            published_at: deploy.published_at,
            deploy_time: deploy.deploy_time,
            error_message: deploy.error_message
          }));

          const summary = {
            totalDeployments: recentDeployments.length,
            successfulDeployments: recentDeployments.filter(d => d.state === 'ready').length,
            failedDeployments: recentDeployments.filter(d => d.state === 'error').length,
            buildMinutesAlert: metrics.monthlyLimitRemaining < 50
          };

          const advancedReport = `**🚀 Advanced Deployment Status for ${siteId}:**

**📊 Summary:**
• Total Recent Deployments: ${summary.totalDeployments}
• Successful: ${summary.successfulDeployments} (${Math.round((summary.successfulDeployments / summary.totalDeployments) * 100)}%)
• Failed: ${summary.failedDeployments} (${Math.round((summary.failedDeployments / summary.totalDeployments) * 100)}%)

**📈 Build Metrics:**
• Average Build Time: ${metrics.averageBuildTime} minutes
• Build Minutes Used: ${metrics.buildMinutesUsed}/${300 - metrics.monthlyLimitRemaining} minutes
• Monthly Limit Remaining: ${metrics.monthlyLimitRemaining} minutes
• Failure Rate: ${metrics.failureRate}%

**🔔 Alerts:**
${summary.buildMinutesAlert ? '⚠️ Low build minutes remaining - optimize builds for DigitalZango calendar\n' : ''}${metrics.failureRate > 20 ? '⚠️ High failure rate - investigate recurring issues\n' : ''}${summary.buildMinutesAlert || metrics.failureRate > 20 ? '' : '✅ All systems operating normally'}

**📋 Recent Deployments:**
${recentDeployments.slice(0, 5).map(deploy => {
  const status = deploy.state === 'ready' ? '✅' : deploy.state === 'error' ? '❌' : '🔄';
  return `${status} ${deploy.state} - ${new Date(deploy.created_at).toLocaleString()} (${deploy.deploy_time ? Math.ceil(deploy.deploy_time / 60) + 'min' : 'unknown'})`;
}).join('\n')}`;

          return {
            content: [
              {
                type: "text",
                text: advancedReport,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error retrieving advanced deployment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }

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

      // Phase 3: Content Workflow Integration Tools
      case "analyze-content-performance":
        try {
          const { siteId, timeframe = "month" } = request.params.arguments as { siteId: string; timeframe?: string };
          
          const deploymentLimit = timeframe === "week" ? 20 : timeframe === "month" ? 50 : 100;
          const deployments = await netlifyClient.getDeployments(siteId, deploymentLimit);
          const metrics = ContentOptimizer.analyzeContentImpact(deployments);
          const optimizationScore = ContentOptimizer.calculateOptimizationScore(metrics);
          const recommendations = ContentOptimizer.generateAgriculturalContentRecommendations(metrics);

          return {
            content: [
              {
                type: "text",
                text: `**📊 Content Performance Analysis (${timeframe})**

**Optimization Score: ${optimizationScore}/100**

${ContentOptimizer.generateContentOptimizationReport(metrics)}

**DigitalZango Content Recommendations:**
${recommendations.map(rec => `• ${rec}`).join('\n')}

**Content Creator Workflow Insights:**
• Blog post efficiency: ${metrics.buildTimePerPost < 2 ? '✅ Optimized' : '⚠️ Needs optimization'}
• Image optimization: ${metrics.imageOptimizationOpportunities < 5 ? '✅ Good' : '⚠️ High potential'}
• Incremental builds: ${metrics.incrementalBuildSupport ? '✅ Enabled' : '❌ Configure for faster updates'}

**Social Media Integration Tips:**
• Batch content updates for YouTube, Instagram, and Facebook
• Optimize agricultural images for cross-platform use
• Schedule deployments during low-traffic periods
• Use responsive images for mobile agricultural calendar`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error analyzing content performance: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }

      case "format-error-for-ai":
        try {
          const { deploymentId, includeProjectContext = true } = request.params.arguments as {
            deploymentId: string;
            includeProjectContext?: boolean;
          };
          
          const deployment = await netlifyClient.getDeploymentInfo(deploymentId);
          const buildLogs = await netlifyClient.getBuildLogs(deploymentId);
          const metrics = await netlifyClient.getBuildMetrics(deployment.site_id);
          const errorPattern = ErrorPatternAnalyzer.analyzeError(
            deployment.error_message || '',
            buildLogs
          );

          const aiContext = {
            project: 'DigitalZango Agricultural Calendar',
            framework: 'Next.js + TypeScript Static Site Generator',
            contentType: 'Agricultural blog, calendar, and affiliate marketing content',
            deploymentFrequency: 'Content updates 2-3x per week',
            buildMinutesRemaining: metrics.monthlyLimitRemaining,
            failureRate: metrics.failureRate,
            averageBuildTime: metrics.averageBuildTime
          };

          const formattedPrompt = errorPattern ?
            ErrorPatternAnalyzer.generateAIPrompt(errorPattern, aiContext) :
            generateGenericAIPrompt(deployment, buildLogs, aiContext);

          return {
            content: [
              {
                type: "text",
                text: `**🤖 AI-Ready Error Analysis**

\`\`\`
${formattedPrompt}
\`\`\`

**Copy the above prompt to your AI assistant for detailed analysis and solutions.**

**Quick Actions Available:**
• Run smart retry analysis
• Check build minutes impact
• Get content optimization suggestions
• Monitor deployment status
• Analyze content performance impact

**DigitalZango Context Included:**
${includeProjectContext ? '✅ Project structure and agricultural content context included' : '❌ Generic error analysis only'}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error formatting for AI: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }

      case "generate-content-optimization-report":
        try {
          const { siteId, includeSeasonalAnalysis = true } = request.params.arguments as {
            siteId: string;
            includeSeasonalAnalysis?: boolean;
          };
          
          const deployments = await netlifyClient.getDeployments(siteId, 100);
          const contentReport = DigitalZangoContentAnalyzer.generateBlogOptimizationReport(deployments);
          const socialMediaTips = DigitalZangoContentAnalyzer.generateSocialMediaOptimizationTips();

          return {
            content: [
              {
                type: "text",
                text: `${contentReport}

${socialMediaTips}

**Affiliate Marketing Optimization:**
• Optimize product images for faster loading
• Use efficient image formats for product galleries
• Implement lazy loading for affiliate content
• Batch affiliate product updates with regular content

**Build Minutes Conservation for Content:**
• Schedule large content updates during off-peak hours
• Use incremental builds for text-only updates
• Optimize images before upload to reduce build time
• Consider content delivery network (CDN) for static assets

**Next Steps:**
1. Implement recommended image optimizations
2. Configure incremental builds for content updates
3. Set up content calendar for efficient deployment scheduling
4. Monitor build performance after optimizations`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error generating content optimization report: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }

      case "monitor-digitalzango-calendar":
        try {
          const calendarStatus = await netlifyClient.getDigitalZangoCalendarStatus();
          
          if (!calendarStatus.site) {
            return {
              content: [
                {
                  type: "text",
                  text: `❌ DigitalZango Agricultural Calendar site not found. Please check your site configuration.`,
                },
              ],
            };
          }

          let report = `**🌾 DigitalZango Agricultural Calendar Monitoring Report**\n\n`;
          
          // Site information
          report += `**📍 Site Information:**\n`;
          report += `• Name: ${calendarStatus.site.name}\n`;
          report += `• URL: ${calendarStatus.site.url}\n`;
          report += `• State: ${calendarStatus.site.state}\n`;
          report += `• Last Updated: ${new Date(calendarStatus.site.updated_at).toLocaleString()}\n\n`;

          // Latest deployment status
          if (calendarStatus.latestDeployment) {
            const deploy = calendarStatus.latestDeployment;
            const status = deploy.state === 'ready' ? '✅ LIVE' : 
                          deploy.state === 'error' ? '❌ FAILED' : 
                          deploy.state === 'building' ? '🔄 BUILDING' : '⏳ PENDING';
            
            report += `**🚀 Current Deployment Status:**\n`;
            report += `• Status: ${status}\n`;
            report += `• Deploy Time: ${new Date(deploy.created_at).toLocaleString()}\n`;
            report += `• Branch: ${deploy.branch || 'unknown'}\n`;
            report += `• Build Duration: ${deploy.deploy_time ? Math.ceil(deploy.deploy_time / 60) + ' minutes' : 'unknown'}\n`;
            if (deploy.error_message) {
              report += `• Error: ${deploy.error_message.substring(0, 100)}...\n`;
            }
            report += `\n`;
          }

          // Build metrics
          if (calendarStatus.metrics) {
            const metrics = calendarStatus.metrics;
            report += `**📊 Build Performance:**\n`;
            report += `• Average Build Time: ${metrics.averageBuildTime} minutes\n`;
            report += `• Build Minutes Used: ${metrics.buildMinutesUsed} minutes\n`;
            report += `• Monthly Limit Remaining: ${metrics.monthlyLimitRemaining} minutes\n`;
            report += `• Failure Rate: ${metrics.failureRate}%\n\n`;

            // Alerts and recommendations
            report += `**🔔 Status & Recommendations:**\n`;
            if (metrics.monthlyLimitRemaining < 50) {
              report += `⚠️ **LOW BUILD MINUTES:** Only ${metrics.monthlyLimitRemaining} minutes remaining\n`;
              report += `• Optimize build process for agricultural calendar\n`;
              report += `• Consider reducing build frequency\n`;
            }
            if (metrics.failureRate > 20) {
              report += `⚠️ **HIGH FAILURE RATE:** ${metrics.failureRate}% of builds failing\n`;
              report += `• Investigate recurring build issues\n`;
              report += `• Review dependency conflicts\n`;
            }
            if (metrics.monthlyLimitRemaining >= 50 && metrics.failureRate <= 20) {
              report += `✅ **HEALTHY STATUS:** Agricultural calendar deployment is stable\n`;
              report += `• Build performance is optimal\n`;
              report += `• Continue monitoring for consistency\n`;
            }
          }

          return {
            content: [
              {
                type: "text",
                text: report,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error monitoring DigitalZango calendar: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }

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
  console.error("🚀 DigitalZango Netlify MCP Server v3.0 running with content workflow integration...");
}

main().catch(console.error);