/**
 * External Services Integration
 * Manages integration with third-party services via webhooks and APIs
 */

export type ServiceType =
  | 'webhook'
  | 'rest-api'
  | 'graphql'
  | 'rpc'
  | 'queue'
  | 'event-stream'
  | 'database';

export type TriggerEvent =
  | 'conversation:start'
  | 'conversation:end'
  | 'message:sent'
  | 'message:received'
  | 'feedback:submitted'
  | 'training:completed'
  | 'model:updated'
  | 'branch:created'
  | 'export:completed';

export interface ServiceConfig {
  id: string;
  name: string;
  description: string;
  serviceType: ServiceType;
  endpoint: string;
  isActive: boolean;
  authentication: {
    type: 'none' | 'api-key' | 'bearer' | 'oauth2' | 'basic';
    credentials?: string; // Encrypted
    headers?: Record<string, string>;
  };
  triggers: TriggerEvent[];
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
    exponentialBackoff: boolean;
  };
  timeout: number; // milliseconds
  rateLimit: {
    requestsPerSecond: number;
    burstSize: number;
  };
  metadata: Record<string, string | number | boolean>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookPayload {
  event: TriggerEvent;
  timestamp: Date;
  conversationId: string;
  data: Record<string, string | number | boolean | object>;
  signature: string; // HMAC for verification
}

export interface ServiceIntegrationResult {
  success: boolean;
  serviceId: string;
  event: TriggerEvent;
  responseStatus?: number;
  responseTime: number;
  error?: string;
  retryCount: number;
}

export interface ServiceRegistry {
  services: ServiceConfig[];
  eventBindings: Map<TriggerEvent, ServiceConfig[]>;
}

/**
 * Create service configuration
 */
export function createServiceConfig(
  name: string,
  description: string,
  serviceType: ServiceType,
  endpoint: string,
  options?: Partial<ServiceConfig>
): ServiceConfig {
  return {
    id: `service-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    serviceType,
    endpoint,
    isActive: true,
    authentication: options?.authentication || {
      type: 'none',
    },
    triggers: options?.triggers || [],
    retryPolicy: options?.retryPolicy || {
      maxRetries: 3,
      backoffMs: 1000,
      exponentialBackoff: true,
    },
    timeout: options?.timeout || 5000,
    rateLimit: options?.rateLimit || {
      requestsPerSecond: 10,
      burstSize: 20,
    },
    metadata: options?.metadata || {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Validate service configuration
 */
export function validateServiceConfig(config: ServiceConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name || config.name.trim().length === 0) {
    errors.push('Service name is required');
  }

  if (!config.endpoint || !isValidURL(config.endpoint)) {
    errors.push('Valid endpoint URL is required');
  }

  if (config.triggers.length === 0) {
    errors.push('At least one trigger event must be specified');
  }

  if (config.retryPolicy.maxRetries < 0) {
    errors.push('Max retries cannot be negative');
  }

  if (config.timeout < 100 || config.timeout > 60000) {
    errors.push('Timeout must be between 100ms and 60000ms');
  }

  if (config.rateLimit.requestsPerSecond <= 0) {
    errors.push('Rate limit must be greater than 0');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if string is valid URL
 */
function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create webhook payload
 */
export function createWebhookPayload(
  event: TriggerEvent,
  conversationId: string,
  data: Record<string, string | number | boolean | object>,
  secret: string
): WebhookPayload {
  const payload = {
    event,
    timestamp: new Date(),
    conversationId,
    data,
  };

  // Generate HMAC signature for verification
  const jsonStr = JSON.stringify(payload);
  const signature = generateHMAC(jsonStr, secret);

  return {
    ...payload,
    signature,
  };
}

/**
 * Generate HMAC signature (simplified - use crypto library in production)
 */
function generateHMAC(data: string, secret: string): string {
  // In production, use crypto.createHmac('sha256', secret).update(data).digest('hex')
  const hash = data.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  return `${secret}-${hash}`;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(payload: WebhookPayload, secret: string): boolean {
  const payloadCopy = { ...payload };
  const expectedSignature = payloadCopy.signature;
  payloadCopy.signature = '';

  const jsonStr = JSON.stringify(payloadCopy);
  const calculatedSignature = generateHMAC(jsonStr, secret);

  return calculatedSignature === expectedSignature;
}

/**
 * Build webhook payload for event
 */
export function buildEventPayload(
  event: TriggerEvent,
  context: {
    conversationId: string;
    userId?: string;
    messageId?: string;
    data?: Record<string, string | number | boolean | object>;
  }
): Record<string, string | number | boolean | object | undefined> {
  const basePayload = {
    conversationId: context.conversationId,
    userId: context.userId,
    timestamp: new Date().toISOString(),
  };

  switch (event) {
    case 'message:sent':
      return {
        ...basePayload,
        event,
        messageId: context.messageId,
        message: context.data?.message,
      };

    case 'feedback:submitted':
      return {
        ...basePayload,
        event,
        feedback: context.data?.feedback,
        messageId: context.messageId,
      };

    case 'training:completed':
      return {
        ...basePayload,
        event,
        datasetId: context.data?.datasetId,
        qualityScore: context.data?.qualityScore,
        accuracy: context.data?.accuracy,
      };

    case 'conversation:start':
      return {
        ...basePayload,
        event,
      };

    case 'conversation:end':
      return {
        ...basePayload,
        event,
        messageCount: context.data?.messageCount,
        duration: context.data?.duration,
      };

    default:
      return {
        ...basePayload,
        event,
        ...context.data,
      };
  }
}

/**
 * Create service registry
 */
export function createServiceRegistry(services: ServiceConfig[] = []): ServiceRegistry {
  const registry: ServiceRegistry = {
    services,
    eventBindings: new Map(),
  };

  // Build event bindings
  services.forEach(service => {
    if (service.isActive) {
      service.triggers.forEach(event => {
        if (!registry.eventBindings.has(event)) {
          registry.eventBindings.set(event, []);
        }
        registry.eventBindings.get(event)!.push(service);
      });
    }
  });

  return registry;
}

/**
 * Get services for a specific event
 */
export function getServicesForEvent(
  registry: ServiceRegistry,
  event: TriggerEvent
): ServiceConfig[] {
  return registry.eventBindings.get(event) || [];
}

/**
 * Add service to registry
 */
export function addServiceToRegistry(registry: ServiceRegistry, service: ServiceConfig): ServiceRegistry {
  return createServiceRegistry([...registry.services, service]);
}

/**
 * Remove service from registry
 */
export function removeServiceFromRegistry(registry: ServiceRegistry, serviceId: string): ServiceRegistry {
  const updatedServices = registry.services.filter(s => s.id !== serviceId);
  return createServiceRegistry(updatedServices);
}

/**
 * Create service integration result
 */
export function createIntegrationResult(
  serviceId: string,
  event: TriggerEvent,
  success: boolean,
  responseTime: number,
  options?: {
    responseStatus?: number;
    error?: string;
    retryCount?: number;
  }
): ServiceIntegrationResult {
  return {
    success,
    serviceId,
    event,
    responseStatus: options?.responseStatus,
    responseTime,
    error: options?.error,
    retryCount: options?.retryCount || 0,
  };
}

/**
 * Format service integration error for logging
 */
export function formatIntegrationError(result: ServiceIntegrationResult): string {
  return `Service ${result.serviceId} failed on event ${result.event}: ${result.error} (${result.responseStatus}) - Retries: ${result.retryCount}`;
}

/**
 * Common service templates
 */
export const SERVICE_TEMPLATES: Record<string, Partial<ServiceConfig>> = {
  slack: {
    name: 'Slack',
    serviceType: 'webhook',
    triggers: ['conversation:end', 'feedback:submitted'],
    description: 'Send notifications to Slack channels',
  },
  discord: {
    name: 'Discord',
    serviceType: 'webhook',
    triggers: ['conversation:end', 'feedback:submitted'],
    description: 'Send notifications to Discord servers',
  },
  github: {
    name: 'GitHub',
    serviceType: 'rest-api',
    triggers: ['training:completed', 'model:updated'],
    description: 'Update GitHub issues and PRs',
  },
  datadog: {
    name: 'Datadog',
    serviceType: 'rest-api',
    triggers: ['message:sent', 'training:completed'],
    description: 'Send metrics and logs to Datadog',
  },
  zapier: {
    name: 'Zapier',
    serviceType: 'webhook',
    triggers: ['conversation:end', 'feedback:submitted', 'training:completed'],
    description: 'Integrate with Zapier automations',
  },
};
