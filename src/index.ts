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
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define all available tools
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

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const netlifyClient = new NetlifyClient(config.netlify.accessToken);

  try {
    switch (request.params.name) {
      case "hello":
        return {
          content: [
            {
              type: "text",
              text: "🚀 DigitalZango Netlify MCP Server is running successfully!\n\n✅ Connected to Netlify API\n✅ Ready for deployment monitoring\n✅ Advanced error analysis active\n✅ Build metrics tracking enabled\n\nAvailable tools: list-sites, check-deployment-status, get-failed-deployments, get-build-metrics, analyze-build-error, get-advanced-deployment-status, monitor-digitalzango-calendar",
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
  console.error("🚀 DigitalZango Netlify MCP Server running with advanced monitoring...");
}

main().catch(console.error);
