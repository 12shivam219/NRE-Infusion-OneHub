/**
 * Custom voice command utilities
 * Manages user-defined voice commands and triggers
 */

export interface CustomVoiceCommand {
  id: string;
  userId: string;
  triggerPhrase: string;
  actionType: string;
  actionTarget?: string;
  actionParams?: Record<string, unknown>;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommandTemplate {
  name: string;
  description: string;
  trigger: string;
  actionType: string;
  actionTarget?: string;
  actionParams?: Record<string, unknown>;
}

/**
 * Pre-built command templates for quick setup
 */
export const COMMAND_TEMPLATES: CommandTemplate[] = [
  {
    name: 'View Dashboard',
    description: 'Quickly navigate to dashboard',
    trigger: 'show dashboard',
    actionType: 'navigate',
    actionTarget: 'dashboard',
  },
  {
    name: 'List Requirements',
    description: 'View all requirements',
    trigger: 'show requirements',
    actionType: 'navigate',
    actionTarget: 'requirements',
  },
  {
    name: 'View Interviews',
    description: 'View all interviews',
    trigger: 'show interviews',
    actionType: 'navigate',
    actionTarget: 'interviews',
  },
  {
    name: 'Find Consultants',
    description: 'View consultant list',
    trigger: 'show consultants',
    actionType: 'navigate',
    actionTarget: 'consultants',
  },
  {
    name: 'New Requirement',
    description: 'Create a new requirement',
    trigger: 'create requirement',
    actionType: 'create',
    actionTarget: 'requirements',
  },
  {
    name: 'New Interview',
    description: 'Create a new interview',
    trigger: 'create interview',
    actionType: 'create',
    actionTarget: 'interviews',
  },
  {
    name: 'Search Requirements',
    description: 'Search requirements',
    trigger: 'find requirement',
    actionType: 'search',
    actionTarget: 'requirements',
  },
];

/**
 * Validate trigger phrase format
 */
export function validateTriggerPhrase(phrase: string): {
  valid: boolean;
  error?: string;
} {
  // Must be 2-50 characters, alphanumeric + spaces only
  if (!phrase || phrase.trim().length < 2) {
    return { valid: false, error: 'Trigger must be at least 2 characters' };
  }

  if (phrase.length > 50) {
    return { valid: false, error: 'Trigger must be under 50 characters' };
  }

  if (!/^[a-z0-9\s]+$/i.test(phrase)) {
    return { valid: false, error: 'Trigger can only contain letters, numbers, and spaces' };
  }

  return { valid: true };
}

/**
 * Match user voice input against custom commands
 */
export function matchVoiceCommand(
  input: string,
  commands: CustomVoiceCommand[]
): CustomVoiceCommand | null {
  const normalized = input.toLowerCase().trim();

  // Exact match first
  for (const cmd of commands) {
    if (cmd.isActive && normalized === cmd.triggerPhrase.toLowerCase()) {
      return cmd;
    }
  }

  // Fuzzy match (contains)
  for (const cmd of commands) {
    if (cmd.isActive && normalized.includes(cmd.triggerPhrase.toLowerCase())) {
      return cmd;
    }
  }

  return null;
}

/**
 * Get command usage statistics
 */
export function getCommandStats(commands: CustomVoiceCommand[]) {
  return {
    totalCommands: commands.length,
    activeCommands: commands.filter(c => c.isActive).length,
    totalUsage: commands.reduce((sum, c) => sum + (c.usageCount || 0), 0),
    mostUsed: commands.reduce((max, c) => (c.usageCount > max.usageCount ? c : max), commands[0]),
  };
}

/**
 * Sort commands by usage
 */
export function sortCommandsByUsage(commands: CustomVoiceCommand[]): CustomVoiceCommand[] {
  return [...commands].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
}
