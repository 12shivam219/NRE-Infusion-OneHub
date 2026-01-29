/**
 * Conversation export utilities
 * Handles JSON, PDF, and Markdown export formats
 */

import type { Message } from '../types';

export interface ExportOptions {
  title: string;
  description?: string;
  includeMetadata?: boolean;
  format: 'json' | 'pdf' | 'markdown';
}

/**
 * Export conversation to JSON format
 */
export function exportToJSON(
  messages: Message[],
  options: Omit<ExportOptions, 'format'>
): string {
  const data = {
    title: options.title,
    description: options.description,
    exportedAt: new Date().toISOString(),
    messageCount: messages.length,
    messages: messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
    })),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Export conversation to Markdown format
 */
export function exportToMarkdown(
  messages: Message[],
  options: Omit<ExportOptions, 'format'>
): string {
  let md = `# ${options.title}\n\n`;

  if (options.description) {
    md += `*${options.description}*\n\n`;
  }

  md += `**Exported:** ${new Date().toLocaleString()}\n`;
  md += `**Messages:** ${messages.length}\n\n`;
  md += '---\n\n';

  for (const msg of messages) {
    const prefix = msg.role === 'user' ? '👤 **You:**' : '🤖 **Assistant:**';
    md += `${prefix}\n\n${msg.content}\n\n`;

    const date = new Date(msg.timestamp);
    md += `*${date.toLocaleString()}*\n\n---\n\n`;
  }

  return md;
}

/**
 * Export conversation to CSV format (compatible with spreadsheets)
 */
export function exportToCSV(messages: Message[]): string {
  const headers = ['Timestamp', 'Role', 'Message'];
  const rows = messages.map(msg => [
    new Date(msg.timestamp).toISOString(),
    msg.role.toUpperCase(),
    `"${msg.content.replace(/"/g, '""')}"`, // Escape quotes
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return csv;
}

/**
 * Generate downloadable blob from exported content
 */
export function generateDownloadBlob(
  content: string,
  format: 'json' | 'pdf' | 'markdown' | 'csv'
): { blob: Blob; filename: string } {
  const timestamp = new Date().toISOString().slice(0, 10);
  const mimeType = {
    json: 'application/json',
    markdown: 'text/markdown',
    csv: 'text/csv',
    pdf: 'application/pdf',
  }[format];

  const filename = `conversation-${timestamp}.${format}`;
  const blob = new Blob([content], { type: mimeType });

  return { blob, filename };
}

/**
 * Trigger browser download
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate shareable link token
 */
export function generateShareToken(): string {
  return `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
