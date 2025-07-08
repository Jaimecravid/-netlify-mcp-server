import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { NetlifyClient } from './netlify/client.js';
import { ErrorAnalyzer } from './utils/errorAnalysis.js';
import { config } from './utils/config.js';

// Create server instance
const server = new Server(
  {
    name: "netlify-mcp-server",
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
        name: "analyze-deployment-error",
        description: "Analyze a specific deployment error with AI-ready formatting",
        inputSchema: {
          type: "object",
          properties: {
            deploymentId: {
              type: "string",
              description: "Specific deployment ID to analyze"
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
              text: "🚀 Netlify MCP Server is running successfully!\n\n✅ Connected to Netlify API\n✅ Ready for deployment monitoring\n✅ DigitalZango automation active\n\nAvailable tools: list-sites, check-deployment-status, get-failed-deployments, analyze-deployment-error, monitor-digitalzango-calendar",
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
          
          // Try to get site by name first, then by ID
          let actualSiteId = siteId;
          if (!siteId.includes('-') || siteId.length < 20) {
            const site = await netlifyClient.getSiteByName(siteId);
            if (site) {
              actualSiteId = site.id;
            }
          }

          const deployments = await netlifyClient.getDeployments(actualSiteId, limit);
          
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
            
            return `${status} **${deploy.state.toUpperCase()}** - ${new Date(deploy.created_at).toLocaleString()}\n   Branch: ${deploy.branch || 'unknown'}\n   Commit: ${deploy.commit_ref?.substring(0, 7) || 'unknown'}\n   Context: ${deploy.context}${deploy.error_message ? `\n   Error: ${deploy.error_message.substring(0, 100)}...` : ''}`;
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
          
          const failedDeployments = await netlifyClient.getFailedDeployments(siteId, limit);
          
          if (failedDeployments.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `✅ No failed deployments found for site: ${siteId}`,
                },
              ],
            };
          }

          const failureReport = failedDeployments.map(deploy => {
            const analysis = ErrorAnalyzer.analyzeDeploymentError(deploy);
            return `❌ **Deployment ${deploy.id.substring(0, 8)}**\n   Time: ${new Date(deploy.created_at).toLocaleString()}\n   Branch: ${deploy.branch || 'unknown'}\n   Error Category: ${analysis.category}\n   Severity: ${analysis.severity}\n   Description: ${analysis.description}\n   Error: ${deploy.error_message?.substring(0, 200) || 'No specific error message'}...`;
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

      case "analyze-deployment-error":
        try {
          const { deploymentId } = request.params.arguments as { deploymentId: string };
          
          const deployment = await netlifyClient.getDeploymentDetails(deploymentId);
          const analysis = ErrorAnalyzer.analyzeDeploymentError(deployment);
          const aiFormattedError = ErrorAnalyzer.formatErrorForAI(deployment, analysis);

          return {
            content: [
              {
                type: "text",
                text: `**Deployment Error Analysis:**\n\n${aiFormattedError}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error analyzing deployment: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }

      case "monitor-digitalzango-calendar":
        try {
          const siteId = config.netlify.siteId || "digitalzango-agricultural-calendar";
          
          // Get recent deployments
          const deployments = await netlifyClient.getDeployments(siteId, 5);
          const failedDeployments = await netlifyClient.getFailedDeployments(siteId, 2);
          
          let report = `**🌾 DigitalZango Agricultural Calendar Monitoring Report**\n\n`;
          
          // Overall status
          const latestDeploy = deployments[0];
          if (latestDeploy) {
            const status = latestDeploy.state === 'ready' ? '✅ LIVE' : 
                          latestDeploy.state === 'error' ? '❌ FAILED' : 
                          latestDeploy.state === 'building' ? '🔄 BUILDING' : '⏳ PENDING';
            
            report += `**Current Status:** ${status}\n`;
            report += `**Last Deploy:** ${new Date(latestDeploy.created_at).toLocaleString()}\n`;
            report += `**Branch:** ${latestDeploy.branch || 'unknown'}\n`;
            report += `**Deploy URL:** ${latestDeploy.deploy_ssl_url || 'Not available'}\n\n`;
          }

          // Recent activity
          report += `**Recent Activity:**\n`;
          deployments.slice(0, 3).forEach(deploy => {
            const status = deploy.state === 'ready' ? '✅' : 
                          deploy.state === 'error' ? '❌' : 
                          deploy.state === 'building' ? '🔄' : '⏳';
            report += `${status} ${deploy.state} - ${new Date(deploy.created_at).toLocaleString()}\n`;
          });

          // Failed deployments analysis
          if (failedDeployments.length > 0) {
            report += `\n**⚠️ Recent Issues:**\n`;
            failedDeployments.forEach(deploy => {
              const analysis = ErrorAnalyzer.analyzeDeploymentError(deploy);
              report += `• ${analysis.category} (${analysis.severity}) - ${new Date(deploy.created_at).toLocaleString()}\n`;
            });
          } else {
            report += `\n**✅ No recent deployment failures detected**\n`;
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
  console.error("🚀 Netlify MCP Server running for DigitalZango automation...");
}

main().catch(console.error);
