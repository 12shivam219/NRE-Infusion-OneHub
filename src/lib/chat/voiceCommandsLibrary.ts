/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Voice Commands Library Module
 * Manages custom voice commands and command templates
 */

export type CommandCategory =
  | 'navigation'
  | 'editing'
  | 'formatting'
  | 'search'
  | 'actions'
  | 'custom';

export interface VoiceCommand {
  id: string;
  userId: string;
  name: string;
  description: string;
  phrases: string[]; // Alternative phrases for same command
  category: CommandCategory;
  action: string; // Action to execute
  parameters?: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  executionCount: number;
  successRate: number; // 0-100
  customization?: Record<string, any>;
}

export interface CommandTemplate {
  id: string;
  name: string;
  description: string;
  category: CommandCategory;
  phrases: string[];
  action: string;
  parameters?: Record<string, any>;
  icon?: string;
  popularity: number;
}

export interface CommandExecutionLog {
  id: string;
  commandId: string;
  userId: string;
  phraseUsed: string;
  confidence: number;
  success: boolean;
  executionTime: number;
  result?: any;
  error?: string;
  timestamp: string;
}

// Built-in command templates
export const COMMAND_TEMPLATES: CommandTemplate[] = [
  {
    id: 'template_nav_home',
    name: 'Navigate Home',
    description: 'Go to home page',
    category: 'navigation',
    phrases: ['go home', 'home', 'back to home', 'navigate home'],
    action: 'navigate',
    parameters: { destination: 'home' },
    popularity: 95,
  },
  {
    id: 'template_edit_undo',
    name: 'Undo',
    description: 'Undo last action',
    category: 'editing',
    phrases: ['undo', 'undo last', 'revert', 'go back'],
    action: 'undo',
    popularity: 90,
  },
  {
    id: 'template_edit_redo',
    name: 'Redo',
    description: 'Redo last undone action',
    category: 'editing',
    phrases: ['redo', 'redo last', 'forward', 'go forward'],
    action: 'redo',
    popularity: 85,
  },
  {
    id: 'template_format_bold',
    name: 'Make Bold',
    description: 'Make selected text bold',
    category: 'formatting',
    phrases: ['bold', 'make bold', 'boldface', 'strong'],
    action: 'format',
    parameters: { format: 'bold' },
    popularity: 80,
  },
  {
    id: 'template_format_italic',
    name: 'Make Italic',
    description: 'Make selected text italic',
    category: 'formatting',
    phrases: ['italic', 'make italic', 'italicize', 'emphasize'],
    action: 'format',
    parameters: { format: 'italic' },
    popularity: 75,
  },
  {
    id: 'template_search_find',
    name: 'Search',
    description: 'Open search dialog',
    category: 'search',
    phrases: ['search', 'find', 'look for', 'search for'],
    action: 'search',
    popularity: 88,
  },
  {
    id: 'template_action_save',
    name: 'Save',
    description: 'Save current work',
    category: 'actions',
    phrases: ['save', 'save all', 'save my work', 'save document'],
    action: 'save',
    popularity: 92,
  },
  {
    id: 'template_action_export',
    name: 'Export',
    description: 'Export current conversation',
    category: 'actions',
    phrases: ['export', 'download', 'export conversation', 'save as'],
    action: 'export',
    popularity: 70,
  },
];

export function createVoiceCommand(
  userId: string,
  name: string,
  description: string,
  phrases: string[],
  category: CommandCategory,
  action: string,
  parameters?: Record<string, any>
): VoiceCommand {
  return {
    id: `cmd_${Date.now()}`,
    userId,
    name,
    description,
    phrases,
    category,
    action,
    parameters,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    executionCount: 0,
    successRate: 0,
  };
}

export function fromTemplate(
  template: CommandTemplate,
  userId: string,
  customization?: Record<string, any>
): VoiceCommand {
  return {
    id: `cmd_${Date.now()}`,
    userId,
    name: template.name,
    description: template.description,
    phrases: template.phrases,
    category: template.category,
    action: template.action,
    parameters: template.parameters,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    executionCount: 0,
    successRate: 0,
    customization,
  };
}

export function updateCommand(
  command: VoiceCommand,
  updates: Partial<VoiceCommand>
): VoiceCommand {
  return {
    ...command,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
}

export function logCommandExecution(
  commandId: string,
  userId: string,
  phraseUsed: string,
  confidence: number,
  success: boolean,
  executionTime: number,
  result?: any,
  error?: string
): CommandExecutionLog {
  return {
    id: `log_${Date.now()}`,
    commandId,
    userId,
    phraseUsed,
    confidence,
    success,
    executionTime,
    result,
    error,
    timestamp: new Date().toISOString(),
  };
}

export function updateCommandStats(
  command: VoiceCommand,
  executionLog: CommandExecutionLog
): VoiceCommand {
  const newExecutionCount = command.executionCount + 1;
  const currentSuccesses = Math.round(
    (command.successRate / 100) * command.executionCount
  );
  const newSuccessRate =
    executionLog.success
      ? ((currentSuccesses + 1) / newExecutionCount) * 100
      : (currentSuccesses / newExecutionCount) * 100;

  return {
    ...command,
    executionCount: newExecutionCount,
    successRate: newSuccessRate,
    updatedAt: new Date().toISOString(),
  };
}

export function findMatchingCommand(
  phrase: string,
  commands: VoiceCommand[]
): VoiceCommand | null {
  const normalized = phrase.toLowerCase().trim();

  for (const command of commands) {
    if (
      command.isActive &&
      command.phrases.some((p) => p.toLowerCase() === normalized)
    ) {
      return command;
    }
  }

  return null;
}

export function getCommandsByCategory(
  commands: VoiceCommand[],
  category: CommandCategory
): VoiceCommand[] {
  return commands.filter(
    (cmd) => cmd.category === category && cmd.isActive
  );
}

export function getTopCommands(
  commands: VoiceCommand[],
  limit: number = 10
): VoiceCommand[] {
  return [...commands]
    .sort((a, b) => b.executionCount - a.executionCount)
    .slice(0, limit);
}

export function validateCommand(command: VoiceCommand): string[] {
  const errors: string[] = [];

  if (!command.name || command.name.trim().length === 0) {
    errors.push('Command name is required');
  }

  if (command.phrases.length === 0) {
    errors.push('At least one phrase is required');
  }

  if (command.phrases.some((p) => p.trim().length === 0)) {
    errors.push('Phrases cannot be empty');
  }

  if (!command.action || command.action.trim().length === 0) {
    errors.push('Action is required');
  }

  if (command.phrases.length > 20) {
    errors.push('Maximum 20 phrases allowed per command');
  }

  return errors;
}

export function getCommandStats(logs: CommandExecutionLog[]): {
  totalExecutions: number;
  successfulExecutions: number;
  averageConfidence: number;
  averageExecutionTime: number;
} {
  if (logs.length === 0) {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      averageConfidence: 0,
      averageExecutionTime: 0,
    };
  }

  const successfulExecutions = logs.filter((log) => log.success).length;
  const averageConfidence =
    logs.reduce((sum, log) => sum + log.confidence, 0) / logs.length;
  const averageExecutionTime =
    logs.reduce((sum, log) => sum + log.executionTime, 0) / logs.length;

  return {
    totalExecutions: logs.length,
    successfulExecutions,
    averageConfidence,
    averageExecutionTime,
  };
}
