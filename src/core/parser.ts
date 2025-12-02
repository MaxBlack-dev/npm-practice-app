/**
 * Command Parser
 * Handles parsing npm commands with alias support and flexible parameter ordering
 */

import { NPM_COMMANDS, NpmCommand } from './commands';

export interface ParsedCommand {
  isValid: boolean;
  command?: NpmCommand;
  parameters: string[];
  packageNames: string[];
  errorMessage?: string;
}

/**
 * Normalize command name by resolving aliases
 */
function normalizeCommandName(input: string): string | null {
  const inputLower = input.toLowerCase();
  
  for (const cmd of NPM_COMMANDS) {
    if (cmd.name === inputLower) {
      return cmd.name;
    }
    if (cmd.aliases?.includes(inputLower)) {
      return cmd.name;
    }
  }
  
  return null;
}

/**
 * Normalize parameter by resolving aliases
 */
function normalizeParameter(input: string, command: NpmCommand): string {
  const inputLower = input.toLowerCase();
  
  for (const param of command.parameters) {
    if (param.name === inputLower) {
      return param.name;
    }
    if (param.aliases?.some(alias => alias === inputLower)) {
      return param.name;
    }
  }
  
  return input;
}

/**
 * Parse npm command input
 * Handles: npm <command> [packages...] [parameters...]
 * Example: "npm install lodash express -g" or "npm i -g lodash express"
 */
/**
 * Split command string respecting quoted strings
 */
function smartSplit(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  
  if (current) {
    parts.push(current);
  }
  
  return parts;
}

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  
  // Remove "npm" prefix if present
  const parts = smartSplit(trimmed);
  if (parts.length === 0) {
    return {
      isValid: false,
      parameters: [],
      packageNames: [],
      errorMessage: 'Empty command',
    };
  }
  
  let startIndex = 0;
  if (parts[0].toLowerCase() === 'npm') {
    startIndex = 1;
  }
  
  if (parts.length <= startIndex) {
    return {
      isValid: false,
      parameters: [],
      packageNames: [],
      errorMessage: 'No command specified',
    };
  }
  
  const commandName = parts[startIndex];
  const normalizedCommandName = normalizeCommandName(commandName);
  
  if (!normalizedCommandName) {
    return {
      isValid: false,
      parameters: [],
      packageNames: [],
      errorMessage: `Unknown command: ${commandName}`,
    };
  }
  
  const command = NPM_COMMANDS.find(cmd => cmd.name === normalizedCommandName)!;
  
  // Parse arguments (everything after command name)
  const args = parts.slice(startIndex + 1);
  const parameters: string[] = [];
  const packageNames: string[] = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Check if it's a parameter (starts with - or --)
    if (arg.startsWith('-')) {
      // Handle --param=value format
      if (arg.includes('=')) {
        const [paramPart] = arg.split('=');
        const normalized = normalizeParameter(paramPart, command);
        parameters.push(normalized);
        // Value is included in the parameter, don't need to skip next arg
      } else {
        const normalized = normalizeParameter(arg, command);
        parameters.push(normalized);
        
        // Check if this parameter requires a value
        const paramDef = command.parameters.find(
          p => p.name === normalized || p.aliases?.includes(arg.toLowerCase())
        );
        
        // Skip the next arg if it's a parameter value (not starting with -)
        if (paramDef?.requiresValue && i + 1 < args.length && !args[i + 1].startsWith('-')) {
          i++; // Skip the value in next iteration
        }
      }
    } else {
      // It's a package name or value
      // Only add as package if it's not right after a parameter that needs a value
      const prevArg = i > 0 ? args[i - 1] : null;
      if (prevArg && prevArg.startsWith('-')) {
        const prevNormalized = normalizeParameter(prevArg, command);
        const prevParamDef = command.parameters.find(
          p => p.name === prevNormalized || p.aliases?.includes(prevArg.toLowerCase())
        );
        
        if (!prevParamDef?.requiresValue) {
          packageNames.push(arg);
        }
      } else {
        packageNames.push(arg);
      }
    }
  }
  
  return {
    isValid: true,
    command,
    parameters,
    packageNames,
  };
}

/**
 * Compare two parsed commands for equivalence
 * Used to check if user's input matches the expected command
 */
export function commandsMatch(
  expected: ParsedCommand,
  actual: ParsedCommand
): { matches: boolean; reason?: string } {
  if (!expected.isValid || !actual.isValid) {
    return { matches: false, reason: 'Invalid command' };
  }
  
  // Handle npm shortcuts: test, start, stop, restart can be run with or without 'run'
  const shortcutCommands = ['test', 'start', 'stop', 'restart'];
  
  // Check if expected is a shortcut command and actual uses 'npm run <shortcut>'
  if (shortcutCommands.includes(expected.command?.name || '')) {
    if (actual.command?.name === 'run' && actual.packageNames.includes(expected.command?.name || '')) {
      // User typed 'npm run test' when we expected 'npm test' - this is valid
      return { matches: true };
    }
  }
  
  // Check if expected is 'npm run <shortcut>' and actual uses the shortcut directly
  if (expected.command?.name === 'run' && expected.packageNames.length === 1) {
    const scriptName = expected.packageNames[0];
    if (shortcutCommands.includes(scriptName) && actual.command?.name === scriptName) {
      // User typed 'npm test' when we expected 'npm run test' - this is valid
      return { matches: true };
    }
  }
  
  if (expected.command?.name !== actual.command?.name) {
    return { matches: false, reason: 'Different command' };
  }
  
  // Sort and compare parameters
  const expectedParams = [...expected.parameters].sort();
  const actualParams = [...actual.parameters].sort();
  
  if (expectedParams.length !== actualParams.length) {
    return { matches: false, reason: 'Different number of parameters' };
  }
  
  for (let i = 0; i < expectedParams.length; i++) {
    if (expectedParams[i] !== actualParams[i]) {
      return { matches: false, reason: 'Different parameters' };
    }
  }
  
  // Sort and compare package names
  const expectedPkgs = [...expected.packageNames].sort();
  const actualPkgs = [...actual.packageNames].sort();
  
  if (expectedPkgs.length !== actualPkgs.length) {
    return { matches: false, reason: 'Different number of packages' };
  }
  
  for (let i = 0; i < expectedPkgs.length; i++) {
    if (expectedPkgs[i] !== actualPkgs[i]) {
      return { matches: false, reason: 'Different package names' };
    }
  }
  
  return { matches: true };
}

/**
 * Get mock output for a parsed command
 */
export function getMockOutput(parsed: ParsedCommand): string {
  if (!parsed.isValid || !parsed.command) {
    return 'Error: Invalid command';
  }
  
  return parsed.command.mockOutput;
}
