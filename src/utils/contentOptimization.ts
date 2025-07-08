import { DeploymentInfo } from '../netlify/client';

export interface ContentMetrics {
  totalPosts: number;
  averagePostSize: number;
  imageOptimizationOpportunities: number;
  buildTimePerPost: number;
  incrementalBuildSupport: boolean;
}

export interface ContentAnalysis {
  metrics: ContentMetrics;
  recommendations: string[];
  optimizationScore: number;
  seasonalTrends: {
    month: string;
    deploymentCount: number;
    averageBuildTime: number;
  }[];
}

export class ContentOptimizer {
  static analyzeContentImpact(deployments: DeploymentInfo[]): ContentMetrics {
    // Analyze deployment patterns to understand content impact on build times
    const contentDeployments = deployments.filter(deploy =>
      deploy.commit_ref && (
        deploy.commit_ref.includes('content') ||
        deploy.commit_ref.includes('post') ||
        deploy.commit_ref.includes('blog') ||
        deploy.commit_ref.includes('calendar')
      )
    );

    return {
      totalPosts: this.estimatePostCount(contentDeployments),
      averagePostSize: this.calculateAveragePostSize(contentDeployments),
      imageOptimizationOpportunities: this.identifyImageOptimizations(contentDeployments),
      buildTimePerPost: this.calculateBuildTimePerPost(contentDeployments),
      incrementalBuildSupport: this.checkIncrementalBuildSupport(contentDeployments)
    };
  }

  static generateContentOptimizationReport(metrics: ContentMetrics): string {
    return `**📝 DigitalZango Content Optimization Report**

**Content Statistics:**
• Total posts analyzed: ${metrics.totalPosts}
• Average post size: ${metrics.averagePostSize}KB
• Build time per post: ${metrics.buildTimePerPost.toFixed(2)} minutes

**Optimization Opportunities:**
• Image optimization potential: ${metrics.imageOptimizationOpportunities} images
• Incremental builds: ${metrics.incrementalBuildSupport ? '✅ Supported' : '❌ Not configured'}

**Recommendations for Agricultural Calendar:**
• Optimize seasonal images before upload
• Use WebP format for better compression
• Consider lazy loading for image galleries
• Implement content caching for static pages
• Batch content updates for seasonal campaigns
• Use responsive images for mobile optimization
• Implement progressive image loading for better UX`.trim();
  }

  static analyzeSeasonalTrends(deployments: DeploymentInfo[]): ContentAnalysis['seasonalTrends'] {
    const monthlyData: { [key: string]: { count: number; totalBuildTime: number } } = {};
    
    deployments.forEach(deploy => {
      const month = new Date(deploy.created_at).toLocaleString('default', { month: 'long' });
      if (!monthlyData[month]) {
        monthlyData[month] = { count: 0, totalBuildTime: 0 };
      }
      monthlyData[month].count++;
      monthlyData[month].totalBuildTime += deploy.deploy_time || 0;
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      deploymentCount: data.count,
      averageBuildTime: data.count > 0 ? data.totalBuildTime / data.count / 60 : 0
    }));
  }

  static generateAgriculturalContentRecommendations(metrics: ContentMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.buildTimePerPost > 3) {
      recommendations.push("🚀 Optimize build performance: Consider splitting large agricultural guides into smaller posts");
    }

    if (metrics.imageOptimizationOpportunities > 10) {
      recommendations.push("🖼️ Image optimization: Compress agricultural photos and diagrams before upload");
    }

    if (!metrics.incrementalBuildSupport) {
      recommendations.push("⚡ Enable incremental builds: Configure your SSG for faster content-only updates");
    }

    if (metrics.averagePostSize > 500) {
      recommendations.push("📝 Content optimization: Break down large agricultural articles into series");
    }

    recommendations.push("🌾 Seasonal planning: Schedule agricultural content updates during low-traffic periods");
    recommendations.push("📱 Mobile optimization: Ensure agricultural calendar is mobile-responsive");
    recommendations.push("🔗 SEO optimization: Use agricultural keywords for better search visibility");

    return recommendations;
  }

  // Helper methods for content analysis
  private static estimatePostCount(deployments: DeploymentInfo[]): number {
    // Estimate based on deployment frequency and patterns
    const contentDeployments = deployments.filter(deploy => 
      deploy.commit_ref && (
        deploy.commit_ref.includes('add') ||
        deploy.commit_ref.includes('new') ||
        deploy.commit_ref.includes('post')
      )
    );
    return Math.max(contentDeployments.length, Math.floor(deployments.length * 0.7));
  }

  private static calculateAveragePostSize(deployments: DeploymentInfo[]): number {
    // Estimate average post size based on build time correlation
    const avgBuildTime = deployments.reduce((sum, deploy) => sum + (deploy.deploy_time || 0), 0) / deployments.length;
    // Rough estimation: 1 minute build time ≈ 100KB content
    return Math.round(avgBuildTime / 60 * 100);
  }

  private static identifyImageOptimizations(deployments: DeploymentInfo[]): number {
    // Estimate based on build time patterns and deployment frequency
    const imageHeavyDeployments = deployments.filter(deploy => (deploy.deploy_time || 0) > 180); // >3 minutes
    return Math.floor(imageHeavyDeployments.length * 2.5); // Estimate 2-3 images per heavy deployment
  }

  private static calculateBuildTimePerPost(deployments: DeploymentInfo[]): number {
    if (deployments.length === 0) return 0;
    const totalBuildTime = deployments.reduce((sum, deploy) => sum + (deploy.deploy_time || 0), 0);
    const estimatedPosts = this.estimatePostCount(deployments);
    return estimatedPosts > 0 ? (totalBuildTime / 60) / estimatedPosts : 0;
  }

  private static checkIncrementalBuildSupport(deployments: DeploymentInfo[]): boolean {
    // Check if build times are consistently low for content updates
    const contentUpdates = deployments.filter(deploy => 
      deploy.commit_ref && deploy.commit_ref.includes('content')
    );
    if (contentUpdates.length === 0) return false;
    
    const avgContentBuildTime = contentUpdates.reduce((sum, deploy) => sum + (deploy.deploy_time || 0), 0) / contentUpdates.length;
    return avgContentBuildTime < 120; // Less than 2 minutes suggests incremental builds
  }

  static calculateOptimizationScore(metrics: ContentMetrics): number {
    let score = 100;
    
    // Deduct points for optimization opportunities
    if (metrics.buildTimePerPost > 3) score -= 20;
    if (metrics.imageOptimizationOpportunities > 10) score -= 15;
    if (!metrics.incrementalBuildSupport) score -= 25;
    if (metrics.averagePostSize > 500) score -= 10;
    
    return Math.max(0, score);
  }
}

export class DigitalZangoContentAnalyzer {
  static generateBlogOptimizationReport(deployments: DeploymentInfo[]): string {
    const metrics = ContentOptimizer.analyzeContentImpact(deployments);
    const recommendations = ContentOptimizer.generateAgriculturalContentRecommendations(metrics);
    const optimizationScore = ContentOptimizer.calculateOptimizationScore(metrics);
    const seasonalTrends = ContentOptimizer.analyzeSeasonalTrends(deployments);

    return `**🌾 DigitalZango Blog & Content Analysis**

**Optimization Score: ${optimizationScore}/100**

${ContentOptimizer.generateContentOptimizationReport(metrics)}

**Agricultural Content Recommendations:**
${recommendations.map(rec => `• ${rec}`).join('\n')}

**Seasonal Content Trends:**
${seasonalTrends.map(trend => 
  `• ${trend.month}: ${trend.deploymentCount} posts (${trend.averageBuildTime.toFixed(1)}min avg build)`
).join('\n')}

**Content Creator Workflow Tips:**
• Schedule agricultural content during planting/harvest seasons
• Batch social media content updates for efficiency
• Optimize affiliate marketing product images
• Use content calendar for consistent posting
• Implement lazy loading for image-heavy agricultural guides`;
  }

  static generateSocialMediaOptimizationTips(): string {
    return `**📱 Social Media Integration Optimization**

**YouTube Content:**
• Optimize video thumbnails for faster page loads
• Use progressive image loading for video galleries
• Implement lazy loading for embedded videos

**Instagram Integration:**
• Compress agricultural photos before embedding
• Use WebP format for better mobile performance
• Implement responsive image galleries

**Facebook Page Integration:**
• Optimize shared content previews
• Use efficient image formats for social cards
• Implement proper Open Graph tags

**Cross-Platform Efficiency:**
• Batch social media updates with blog posts
• Use consistent agricultural branding across platforms
• Optimize images once, use across all platforms`;
  }
}
