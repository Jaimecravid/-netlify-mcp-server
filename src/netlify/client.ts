export interface DeploymentInfo {
  id: string;
  state: string;
  created_at: string;
  updated_at: string;
  commit_ref?: string;
  commit_url?: string;
  branch?: string;
  error_message?: string;
  deploy_url?: string;
  deploy_ssl_url?: string;
  context: string;
  review_id?: number;
  review_url?: string;
}

export interface SiteInfo {
  id: string;
  name: string;
  url: string;
  admin_url: string;
  deploy_url: string;
  state: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  session_id: string;
  ssl_url: string;
  force_ssl: boolean;
  managed_dns: boolean;
  deploy_hook: string;
  password: string;
  notification_email: string;
  build_settings: {
    cmd: string;
    dir: string;
    env: Record<string, string>;
  };
}

export class NetlifyClient {
  private accessToken: string;
  private baseUrl = 'https://api.netlify.com/api/v1';

  constructor(accessToken: string) {
    if (!accessToken) {
      throw new Error('Netlify access token is required');
    }
    this.accessToken = accessToken;
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Netlify API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getSites(): Promise<SiteInfo[]> {
    try {
      const sites = await this.makeRequest('/sites');
      return sites.map((site: any) => ({
        id: site.id || '',
        name: site.name || '',
        url: site.url || '',
        admin_url: site.admin_url || '',
        deploy_url: site.deploy_url || '',
        state: site.state || 'unknown',
        created_at: site.created_at || '',
        updated_at: site.updated_at || '',
        user_id: site.user_id || '',
        session_id: site.session_id || '',
        ssl_url: site.ssl_url || '',
        force_ssl: site.force_ssl || false,
        managed_dns: site.managed_dns || false,
        deploy_hook: site.deploy_hook || '',
        password: site.password || '',
        notification_email: site.notification_email || '',
        build_settings: site.build_settings || { cmd: '', dir: '', env: {} }
      }));
    } catch (error) {
      throw new Error(`Failed to fetch sites: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDeployments(siteId: string, limit: number = 10): Promise<DeploymentInfo[]> {
    try {
      const deployments = await this.makeRequest(`/sites/${siteId}/deploys?per_page=${limit}`);
      
      return deployments.map((deploy: any) => ({
        id: deploy.id || '',
        state: deploy.state || 'unknown',
        created_at: deploy.created_at || '',
        updated_at: deploy.updated_at || '',
        commit_ref: deploy.commit_ref,
        commit_url: deploy.commit_url,
        branch: deploy.branch,
        error_message: deploy.error_message,
        deploy_url: deploy.deploy_url,
        deploy_ssl_url: deploy.deploy_ssl_url,
        context: deploy.context || 'production',
        review_id: deploy.review_id,
        review_url: deploy.review_url
      }));
    } catch (error) {
      throw new Error(`Failed to fetch deployments for site ${siteId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDeploymentDetails(deployId: string): Promise<DeploymentInfo> {
    try {
      const deployment = await this.makeRequest(`/deploys/${deployId}`);
      
      return {
        id: deployment.id || '',
        state: deployment.state || 'unknown',
        created_at: deployment.created_at || '',
        updated_at: deployment.updated_at || '',
        commit_ref: deployment.commit_ref,
        commit_url: deployment.commit_url,
        branch: deployment.branch,
        error_message: deployment.error_message,
        deploy_url: deployment.deploy_url,
        deploy_ssl_url: deployment.deploy_ssl_url,
        context: deployment.context || 'production',
        review_id: deployment.review_id,
        review_url: deployment.review_url
      };
    } catch (error) {
      throw new Error(`Failed to fetch deployment details for ${deployId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSiteByName(siteName: string): Promise<SiteInfo | null> {
    try {
      const sites = await this.getSites();
      return sites.find(site => site.name === siteName) || null;
    } catch (error) {
      throw new Error(`Failed to find site ${siteName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFailedDeployments(siteId: string, limit: number = 5): Promise<DeploymentInfo[]> {
    try {
      const deployments = await this.getDeployments(siteId, limit * 2);
      return deployments.filter(deploy => 
        deploy.state === 'error' || 
        deploy.state === 'failed' || 
        deploy.state === 'stopped'
      ).slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to fetch failed deployments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
