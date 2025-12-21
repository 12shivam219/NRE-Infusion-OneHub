import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Users, CheckCircle } from 'lucide-react';
import { BrandCard, BrandCardHeader, BrandCardBody, BrandBadge } from './index';

/**
 * Example Dashboard Widgets using NRETech Brand System
 * 
 * Demonstrates how to apply brand styling to dashboard components:
 * - Consistent card styling with gold accents
 * - Premium typography using Poppins/Inter
 * - Dark theme with gradient backgrounds
 * - Interactive hover states with glow effects
 * - Proper spacing and padding
 */

// ============================================================================
// METRICS CARD WIDGET
// ============================================================================

interface MetricsCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  badge?: string;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  trend,
  icon,
  badge,
}) => {
  return (
    <BrandCard variant="default" padding="md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm text-text-secondary font-body letter-spacing-wide">
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl font-bold font-heading text-text">
              {value}
            </h3>
            {trend && (
              <div
                className={`flex items-center gap-1 text-xs font-semibold ${
                  trend.isPositive ? 'text-green-400' : 'text-red-400'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                {trend.isPositive ? '+' : '-'}
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>
        </div>
        {icon && (
          <div className="flex-shrink-0 p-3 rounded-lg bg-gold bg-opacity-10">
            <div className="text-gold">{icon}</div>
          </div>
        )}
      </div>
      {badge && <BrandBadge variant="gold">{badge}</BrandBadge>}
    </BrandCard>
  );
};

// ============================================================================
// ACTIVITY CARD WIDGET
// ============================================================================

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  status: 'success' | 'warning' | 'error' | 'info';
  timestamp: Date;
}

interface ActivityCardProps {
  title: string;
  activities: ActivityItem[];
  onViewAll?: () => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  title,
  activities,
  onViewAll,
}) => {
  const statusConfig = {
    success: { color: 'text-green-400', bg: 'bg-green-500 bg-opacity-20' },
    warning: { color: 'text-yellow-400', bg: 'bg-yellow-500 bg-opacity-20' },
    error: { color: 'text-red-400', bg: 'bg-red-500 bg-opacity-20' },
    info: { color: 'text-blue-400', bg: 'bg-blue-500 bg-opacity-20' },
  };

  return (
    <BrandCard variant="default">
      <BrandCardHeader
        title={title}
        action={
          onViewAll && (
            <button
              onClick={onViewAll}
              className="text-gold hover:text-gold-light transition-colors text-xs font-semibold"
            >
              View All →
            </button>
          )
        }
      />
      <BrandCardBody>
        <div className="space-y-3">
          {activities.map((activity) => {
            const config = statusConfig[activity.status];
            return (
              <div
                key={activity.id}
                className="flex gap-3 p-3 rounded-lg bg-gold bg-opacity-5 hover:bg-opacity-10 transition-colors duration-200"
              >
                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${config.bg}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text line-clamp-1">
                    {activity.title}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                    {activity.description}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {activity.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </BrandCardBody>
    </BrandCard>
  );
};

// ============================================================================
// SUMMARY CARD WIDGET
// ============================================================================

interface SummaryItem {
  label: string;
  value: string | number;
  badge?: string;
}

interface SummaryCardProps {
  title: string;
  items: SummaryItem[];
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  items,
  action,
}) => {
  return (
    <BrandCard variant="elevated">
      <BrandCardHeader
        title={title}
        action={
          action && (
            <button
              onClick={action.onClick}
              className="text-gold hover:text-gold-light transition-colors text-xs font-semibold"
            >
              {action.label}
            </button>
          )
        }
      />
      <BrandCardBody>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg border border-gold border-opacity-10 hover:border-opacity-20 transition-all duration-200"
            >
              <span className="text-sm text-text-secondary">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-heading text-gold">
                  {item.value}
                </span>
                {item.badge && (
                  <BrandBadge size="sm" variant="gold">
                    {item.badge}
                  </BrandBadge>
                )}
              </div>
            </div>
          ))}
        </div>
      </BrandCardBody>
    </BrandCard>
  );
};

// ============================================================================
// DASHBOARD GRID LAYOUT
// ============================================================================

export const DashboardWidgets: React.FC = () => {
  const metrics = [
    {
      title: 'Total Requirements',
      value: '24',
      trend: { value: 12, isPositive: true },
      icon: <BarChart3 className="w-6 h-6" />,
      badge: 'Active',
    },
    {
      title: 'Interviews Scheduled',
      value: '8',
      trend: { value: 5, isPositive: true },
      icon: <Users className="w-6 h-6" />,
    },
    {
      title: 'Candidates Placed',
      value: '3',
      trend: { value: 100, isPositive: true },
      icon: <CheckCircle className="w-6 h-6" />,
      badge: 'This Month',
    },
  ];

  const activities: ActivityItem[] = useMemo(() => {
    const now = new Date();
    return [
      {
        id: '1',
        title: 'New Requirement Created',
        description: 'Senior Software Engineer - Remote',
        status: 'info',
        timestamp: new Date(now.getTime() - 5 * 60000),
      },
      {
        id: '2',
        title: 'Interview Scheduled',
        description: 'John Doe - Senior Developer',
        status: 'success',
        timestamp: new Date(now.getTime() - 15 * 60000),
      },
      {
        id: '3',
        title: 'Application Received',
        description: '5 new applications for DevOps role',
        status: 'warning',
        timestamp: new Date(now.getTime() - 30 * 60000),
      },
    ];
  }, []);

  const summary = [
    { label: 'Open Requirements', value: 12, badge: 'Urgent' },
    { label: 'Pending Interviews', value: 8 },
    { label: 'In Review', value: 5, badge: 'Hot' },
    { label: 'Placed this Month', value: 3 },
  ];

  return (
    <div className="min-h-screen bg-darkbg p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold font-heading text-text letter-spacing-tight">
          Dashboard
        </h1>
        <p className="text-text-secondary mt-2">
          Welcome back! Here's your recruitment overview.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {metrics.map((metric, index) => (
          <MetricsCard key={index} {...metric} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2">
          <ActivityCard
            title="Recent Activity"
            activities={activities}
            onViewAll={() => console.log('View all activities')}
          />
        </div>

        {/* Summary Sidebar */}
        <div>
          <SummaryCard
            title="Quick Summary"
            items={summary}
            action={{
              label: 'View Details',
              onClick: () => console.log('View details'),
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardWidgets;
