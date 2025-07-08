import fetch from 'node-fetch';

// Existing interfaces
export interface NetlifySite {
  id: string;
  name: string;
  url: string;
  admin_url: string;
  deploy_url: string;
  state: string;
  created_at: string;
  updated_at: string;
}

export interface NetlifyDeployment {
  id: string;
  url: string;
  deploy_url: string;
  admin_url: string;
  state: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  error_message?: string;
  deploy_time?: number;
  branch?: string;
  commit_ref?: string;
  commit_url?: string;
  review_id?: number;
  review_url?: string;
  screenshot_url?: string;
  site_id: string;
}

// Missing DeploymentInfo interface (now added)
export interface DeploymentInfo {
  id: string;
  state: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  error_message?: string;
  deploy_time?: number;
  branch?: string;
  commit_ref?: string;
  site_id: string;
  url?: string;
  deploy_url?: string;
  admin_url?: string;
  commit_url?: string;
  review_id?: number;
  review_url?: string;
  screenshot_url?: string;
}

// New interfaces for Phase 1 enhancements
export interface BuildMetrics {
  duration: number;
  buildMinutesUsed: number;
  monthlyLimitRemaining: number;
  averageBuildTime: number;
  failureRate: number;
}

export interface DeploymentLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  source: string;
}

export class NetlifyClient {
  private apiToken: string;
  private baseUrl = 'https://api.netlify.com/api/v1';

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private async makeRequest(endpoint: string, options: any = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Existing methods
  async getSites(): Promise<NetlifySite[]> {
    try {
      return await this.makeRequest('/sites');
    } catch (error) {
      throw new Error(`Failed to fetch sites: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDeployments(siteId: string, limit: number = 10): Promise<NetlifyDeployment[]> {
    try {
      return await this.makeRequest(`/sites/${siteId}/deploys?per_page=${limit}`);
    } catch (error) {
      throw new Error(`Failed to fetch deployments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFailedDeployments(siteId: string): Promise<NetlifyDeployment[]> {
    try {
      const deployments = await this.getDeployments(siteId, 50);
      return deployments.filter(deploy => deploy.state === 'error');
    } catch (error) {
      throw new Error(`Failed to fetch failed deployments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Method that returns DeploymentInfo interface
  async getDeploymentInfo(deployId: string): Promise<DeploymentInfo> {
    try {
      const deployment = await this.makeRequest(`/deploys/${deployId}`);
      return {
        id: deployment.id,
        state: deployment.state,
        created_at: deployment.created_at,
        updated_at: deployment.updated_at,
        published_at: deployment.published_at,
        error_message: deployment.error_message,
        deploy_time: deployment.deploy_time,
        branch: deployment.branch,
        commit_ref: deployment.commit_ref,
        site_id: deployment.site_id,
        url: deployment.url,
        deploy_url: deployment.deploy_url,
        admin_url: deployment.admin_url,
        commit_url: deployment.commit_url,
        review_id: deployment.review_id,
        review_url: deployment.review_url,
        screenshot_url: deployment.screenshot_url
      };
    } catch (error) {
      throw new Error(`Failed to fetch deployment info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // New enhanced methods for Phase 1
  async getBuildLogs(deployId: string): Promise<DeploymentLog[]> {
    try {
      const logs = await this.makeRequest(`/deploys/${deployId}/logs`);
      return logs.map((log: any) => ({
        timestamp: log.created_at || '',
        level: log.level || 'info',
        message: log.message || '',
        source: log.source || 'build'
      }));
    } catch (error) {
      throw new Error(`Failed to fetch build logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getBuildMetrics(siteId: string): Promise<BuildMetrics> {
    try {
      const deployments = await this.getDeployments(siteId, 30);
      const currentMonth = new Date().getMonth();
      const monthlyDeployments = deployments.filter(deploy => 
        new Date(deploy.created_at).getMonth() === currentMonth
      );

      return {
        duration: this.calculateAverageDuration(monthlyDeployments),
        buildMinutesUsed: this.calculateBuildMinutesUsed(monthlyDeployments),
        monthlyLimitRemaining: 300 - this.calculateBuildMinutesUsed(monthlyDeployments),
        averageBuildTime: this.calculateAverageDuration(monthlyDeployments),
        failureRate: this.calculateFailureRate(monthlyDeployments)
      };
    } catch (error) {
      throw new Error(`Failed to fetch build metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper methods for calculations
  private calculateAverageDuration(deployments: NetlifyDeployment[]): number {
    if (deployments.length === 0) return 0;
    const totalDuration = deployments.reduce((sum, deploy) => {
      const start = new Date(deploy.created_at).getTime();
      const end = new Date(deploy.published_at || deploy.created_at).getTime();
      return sum + (end - start) / 1000 / 60; // Convert to minutes
    }, 0);
    return Math.round(totalDuration / deployments.length);
  }

  private calculateBuildMinutesUsed(deployments: NetlifyDeployment[]): number {
    return deployments.reduce((sum, deploy) => {
      const duration = deploy.deploy_time || 0;
      return sum + Math.ceil(duration / 60); // Convert seconds to minutes
    }, 0);
  }

  private calculateFailureRate(deployments: NetlifyDeployment[]): number {
    if (deployments.length === 0) return 0;
    const failedDeployments = deployments.filter(deploy => deploy.state === 'error').length;
    return Math.round((failedDeployments / deployments.length) * 100);
  }

  // Additional utility method for DigitalZango specific monitoring
  async getDigitalZangoCalendarStatus(): Promise<{
    site: NetlifySite | null;
    latestDeployment: NetlifyDeployment | null;
    metrics: BuildMetrics | null;
  }> {
    try {
      const sites = await this.getSites();
      const calendarSite = sites.find(site => 
        site.name.toLowerCase().includes('calendar') || 
        site.name.toLowerCase().includes('digitalzango')
      );

      if (!calendarSite) {
        return { site: null, latestDeployment: null, metrics: null };
      }

      const [deployments, metrics] = await Promise.all([
        this.getDeployments(calendarSite.id, 1),
        this.getBuildMetrics(calendarSite.id)
      ]);

      return {
        site: calendarSite,
        latestDeployment: deployments[0] || null,
        metrics: metrics
      };
    } catch (error) {
      throw new Error(`Failed to get DigitalZango calendar status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
