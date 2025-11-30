/**
 * Task System
 * Manages learning tasks and user progress
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NPM_COMMANDS } from './commands';
import { parseCommand, commandsMatch } from './parser';

export interface Task {
  id: number;
  title: string;
  description: string;
  expectedCommand: string;
  hint?: string;
  commandName: string;
  commandExplanation?: string;
}

export interface UserProgress {
  currentTaskId: number;
  completedTaskIds: number[];
  totalTasks: number;
  completionCount: number;
  taskOrder: number[]; // Array of task IDs in current order
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate all tasks from npm commands
 * Each command gets a base task, plus one task per parameter
 */
export function generateTasks(): Task[] {
  const tasks: Task[] = [];
  let taskId = 1;
  
  // Common packages for install examples
  const examplePackages = ['lodash', 'express', 'react', 'axios', 'chalk'];
  let packageIndex = 0;
  
  // Command-specific task descriptions
  const taskDescriptions: Record<string, { title: (pkg?: string) => string; description: (pkg?: string) => string; explanation: string }> = {
    'init': {
      title: () => 'Initialize a new npm project',
      description: () => 'Create a package.json file to start a new Node.js project with default configuration',
      explanation: 'The init command creates a package.json file that contains metadata about your project and its dependencies. Use -y flag to accept all defaults automatically.',
    },
    'install': {
      title: (pkg) => `Install ${pkg} package`,
      description: (pkg) => `Download and install ${pkg} from the npm registry into your project`,
      explanation: 'The install command downloads packages and adds them to node_modules folder and package.json. You can use shortcuts like "i" or "add".',
    },
    'uninstall': {
      title: (pkg) => `Remove ${pkg} package`,
      description: (pkg) => `Delete ${pkg} from your project and remove it from dependencies`,
      explanation: 'The uninstall command removes packages from node_modules and updates package.json. Aliases include "remove", "rm", "r", "un".',
    },
    'update': {
      title: (pkg) => pkg ? `Update ${pkg} package` : 'Update packages to newer versions',
      description: (pkg) => pkg ? `Update ${pkg} to its latest compatible version` : 'Check for and install newer versions of installed packages',
      explanation: 'The update command upgrades packages to their latest compatible versions based on semver ranges in package.json.',
    },
    'list': {
      title: () => 'Show installed packages',
      description: () => 'Display a tree of all installed packages in your project',
      explanation: 'The list command shows all installed packages and their dependencies. Use "ls", "ll", or "la" as shortcuts.',
    },
    'version': {
      title: () => 'Check npm version information',
      description: () => 'Display the current npm, Node.js, and related version numbers',
      explanation: 'The version command shows version information for npm and its dependencies. Use -v as a shortcut.',
    },
    'run': {
      title: () => 'List available scripts',
      description: () => 'Show all available scripts defined in package.json',
      explanation: 'Running "npm run" without a script name shows all available scripts in your project.',
    },
    'test': {
      title: () => 'Run project tests',
      description: () => 'Execute the test script defined in package.json',
      explanation: 'The test command runs your project\'s test suite. It\'s a shortcut for "npm run test".',
    },
    'start': {
      title: () => 'Start your application',
      description: () => 'Run the start script to launch your application',
      explanation: 'The start command runs your application. It\'s a shortcut for "npm run start".',
    },
    'search': {
      title: () => 'Find packages in npm registry',
      description: () => 'Search for packages by name or keywords in the npm registry',
      explanation: 'The search command queries the npm registry to find packages matching your search terms.',
    },
    'view': {
      title: (pkg) => `View ${pkg} package information`,
      description: (pkg) => `Display detailed information about ${pkg} from the registry`,
      explanation: 'The view command shows package metadata including version, description, and dependencies. Aliases: "info", "show".',
    },
  };
  
  // Parameter-specific descriptions that avoid mentioning the parameter name directly
  const parameterTaskDescriptions: Record<string, Record<string, { title: (pkg?: string) => string; description: (pkg?: string) => string }>> = {
    'init': {
      '-y': {
        title: () => 'Initialize project with default settings',
        description: () => 'Create a package.json file automatically without answering any questions, using default values',
      },
      '--scope': {
        title: () => 'Initialize scoped package',
        description: () => 'Create a package.json for a scoped package (packages that belong to an organization or user)',
      },
    },
    'install': {
      '-g': {
        title: (pkg) => `Install ${pkg} globally`,
        description: (pkg) => `Install ${pkg} system-wide so it's available across all projects on your computer`,
      },
      '--save-dev': {
        title: (pkg) => `Install ${pkg} as dev dependency`,
        description: (pkg) => `Add ${pkg} as a development-only package (like testing tools or build tools), not in production`,
      },
      '--save': {
        title: (pkg) => `Install ${pkg} and save to dependencies`,
        description: (pkg) => `Add ${pkg} to your project and record it in package.json as a required dependency`,
      },
      '--save-optional': {
        title: (pkg) => `Install ${pkg} as optional dependency`,
        description: (pkg) => `Add ${pkg} to optionalDependencies - packages that aren't required but provide extra features if available`,
      },
      '--no-save': {
        title: (pkg) => `Install ${pkg} without saving`,
        description: (pkg) => `Install ${pkg} but don't add it to package.json - temporary installation only`,
      },
      '--save-exact': {
        title: (pkg) => `Install ${pkg} with exact version`,
        description: (pkg) => `Install ${pkg} and lock it to the exact version number (no semver ranges)`,
      },
      '--save-bundle': {
        title: (pkg) => `Install ${pkg} as bundled dependency`,
        description: (pkg) => `Add ${pkg} to bundleDependencies - packages that will be bundled when publishing your package`,
      },
    },
    'uninstall': {
      '-g': {
        title: (pkg) => `Remove ${pkg} globally`,
        description: (pkg) => `Uninstall ${pkg} that was installed globally across your system`,
      },
      '--save': {
        title: (pkg) => `Remove ${pkg} from dependencies`,
        description: (pkg) => `Uninstall ${pkg} and remove it from your dependencies list in package.json`,
      },
      '--save-dev': {
        title: (pkg) => `Remove ${pkg} from dev dependencies`,
        description: (pkg) => `Remove ${pkg} from your devDependencies list`,
      },
    },
    'update': {
      '-g': {
        title: (pkg) => pkg ? `Update ${pkg} globally` : 'Update global packages',
        description: (pkg) => pkg ? `Update ${pkg} that was installed globally across your system` : 'Update all globally installed packages',
      },
      '--save': {
        title: (pkg) => pkg ? `Update ${pkg} and save` : 'Update and save packages',
        description: (pkg) => pkg ? `Update ${pkg} to the latest version and save the new version to package.json` : 'Update packages and save new versions to package.json',
      },
    },
    'list': {
      '-g': {
        title: () => 'Show all system-wide packages',
        description: () => 'Display all packages installed globally on your computer',
      },
      '--depth': {
        title: () => 'Limit dependency tree depth',
        description: () => 'Show installed packages but limit how deep the dependency tree is displayed',
      },
      '--json': {
        title: () => 'Show packages in JSON format',
        description: () => 'Display the package list as structured JSON data instead of a tree',
      },
    },
    'outdated': {
      '-g': {
        title: () => 'Check global packages for updates',
        description: () => 'See which globally installed packages have newer versions available',
      },
    },
    'audit': {
      '--fix': {
        title: () => 'Auto-fix security vulnerabilities',
        description: () => 'Automatically update packages to fix known security issues',
      },
    },
    'cache': {
      'clean': {
        title: () => 'Clear npm cache',
        description: () => 'Delete all cached package data to free up space or fix corruption issues',
      },
      'verify': {
        title: () => 'Check cache integrity',
        description: () => 'Verify that the npm cache is not corrupted and report its status',
      },
    },
    'run': {
      'build': {
        title: () => 'Run the build script',
        description: () => 'Execute the build script defined in package.json to compile or bundle your project',
      },
      '--silent': {
        title: () => 'Run build script silently',
        description: () => 'Execute the build script from package.json without showing npm output messages',
      },
    },
  };
  
  for (const cmd of NPM_COMMANDS) {
    // Special handling for commands that require package names
    const requiresPackage = ['install', 'uninstall', 'update', 'view', 'explain'].includes(cmd.name);
    const requiresScriptName = cmd.name === 'run';
    const taskInfo = taskDescriptions[cmd.name];
    
    // Base task: use command without parameters
    if (requiresPackage) {
      const examplePackage = examplePackages[packageIndex % examplePackages.length];
      packageIndex++;
      
      tasks.push({
        id: taskId++,
        title: taskInfo ? taskInfo.title(examplePackage) : `Install ${examplePackage} package`,
        description: taskInfo ? taskInfo.description(examplePackage) : `Use ${cmd.name} to add ${examplePackage} to your project`,
        expectedCommand: `npm ${cmd.name} ${examplePackage}`,
        hint: cmd.aliases ? `You can use aliases: ${cmd.aliases.join(', ')}` : undefined,
        commandName: cmd.name,
        commandExplanation: taskInfo ? taskInfo.explanation : undefined,
      });
    } else {
      tasks.push({
        id: taskId++,
        title: taskInfo ? taskInfo.title() : `Use ${cmd.name} command`,
        description: taskInfo ? taskInfo.description() : cmd.description,
        expectedCommand: `npm ${cmd.name}`,
        hint: cmd.aliases ? `Aliases: ${cmd.aliases.join(', ')}` : undefined,
        commandName: cmd.name,
        commandExplanation: taskInfo ? taskInfo.explanation : undefined,
      });
    }
    
    // Parameter tasks: use command with each parameter
    for (const param of cmd.parameters) {
      // Use specific example values for different parameters
      let exampleValue = 'example';
      if (param.name === '--depth') {
        exampleValue = '0';
      } else if (param.name === '--scope') {
        exampleValue = '@myorg';
      }
      
      const paramDesc = parameterTaskDescriptions[cmd.name]?.[param.name];
      
      if (requiresPackage) {
        const examplePackage = examplePackages[packageIndex % examplePackages.length];
        packageIndex++;
        
        tasks.push({
          id: taskId++,
          title: paramDesc ? paramDesc.title(examplePackage) : `Install ${examplePackage} with special option`,
          description: paramDesc ? paramDesc.description(examplePackage) : param.description,
          expectedCommand: param.requiresValue
            ? `npm ${cmd.name} ${examplePackage} ${param.name} ${exampleValue}`
            : `npm ${cmd.name} ${examplePackage} ${param.name}`,
          hint: param.aliases ? `This option has aliases: ${param.aliases.join(', ')}` : undefined,
          commandName: cmd.name,
          commandExplanation: `Uses ${cmd.name} with ${param.name} parameter. ${param.description}`,
        });
      } else if (requiresScriptName) {
        // For 'run' command with special handling
        if (param.name === 'build') {
          // Task to run 'npm run build'
          tasks.push({
            id: taskId++,
            title: paramDesc ? paramDesc.title() : 'Run the build script',
            description: paramDesc ? paramDesc.description() : param.description,
            expectedCommand: `npm ${cmd.name} ${param.name}`,
            hint: cmd.aliases ? `You can use: ${cmd.aliases.join(', ')}` : undefined,
            commandName: cmd.name,
            commandExplanation: `Executes the build script defined in package.json.`,
          });
        } else if (param.name === '--silent') {
          // Task to run 'npm run build --silent'
          tasks.push({
            id: taskId++,
            title: paramDesc ? paramDesc.title() : 'Run build script silently',
            description: paramDesc ? paramDesc.description() : param.description,
            expectedCommand: `npm ${cmd.name} build ${param.name}`,
            hint: param.aliases ? `This option has aliases: ${param.aliases.join(', ')}` : undefined,
            commandName: cmd.name,
            commandExplanation: `Runs the build script without showing npm output messages.`,
          });
        }
      } else {
        const finalValue = param.requiresValue ? exampleValue : '';
        tasks.push({
          id: taskId++,
          title: paramDesc ? paramDesc.title() : `${cmd.description} with additional option`,
          description: paramDesc ? paramDesc.description() : param.description,
          expectedCommand: param.requiresValue
            ? `npm ${cmd.name} ${param.name} ${finalValue}`
            : `npm ${cmd.name} ${param.name}`,
          hint: param.aliases ? `This option has aliases: ${param.aliases.join(', ')}` : undefined,
          commandName: cmd.name,
          commandExplanation: `Uses ${cmd.name} with ${param.name} parameter. ${param.description}`,
        });
      }
    }
  }
  
  return tasks;
}

/**
 * Get initial user progress
 */
export async function getInitialProgress(): Promise<UserProgress> {
  const tasks = generateTasks();
  
  try {
    const saved = await AsyncStorage.getItem('npm-practice-progress');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate the saved progress
      if (parsed.totalTasks === tasks.length) {
        return parsed;
      }
    }
  } catch (e) {
    // Ignore errors and return default
  }
  
  // Default progress with sequential task order
  const taskOrder = tasks.map((_, index) => index + 1);
  return {
    currentTaskId: 1,
    completedTaskIds: [],
    totalTasks: tasks.length,
    completionCount: 0,
    taskOrder,
  };
}

/**
 * Save progress to AsyncStorage
 */
export async function saveProgress(progress: UserProgress): Promise<void> {
  try {
    await AsyncStorage.setItem('npm-practice-progress', JSON.stringify(progress));
  } catch (e) {
    // Ignore errors
  }
}

/**
 * Reset progress to initial state (keeps completion count)
 */
export async function resetProgress(): Promise<UserProgress> {
  const tasks = generateTasks();
  
  // Load current progress to preserve completion count
  let completionCount = 0;
  try {
    const saved = await AsyncStorage.getItem('npm-practice-progress');
    if (saved) {
      const parsed = JSON.parse(saved);
      completionCount = parsed.completionCount || 0;
    }
  } catch (e) {
    // Ignore errors
  }
  
  // Generate task order (random if completion count > 0, sequential otherwise)
  const baseOrder = tasks.map((_, index) => index + 1);
  const taskOrder = completionCount > 0 ? shuffleArray(baseOrder) : baseOrder;
  
  const newProgress = {
    currentTaskId: 1,
    completedTaskIds: [],
    totalTasks: tasks.length,
    completionCount,
    taskOrder,
  };
  
  try {
    await AsyncStorage.setItem('npm-practice-progress', JSON.stringify(newProgress));
  } catch (e) {
    // Ignore errors
  }
  
  return newProgress;
}

/**
 * Check if user's command completes the current task
 */
export function validateTaskCompletion(
  task: Task,
  userInput: string
): { isCorrect: boolean; message: string; output?: string } {
  const expectedParsed = parseCommand(task.expectedCommand);
  const userParsed = parseCommand(userInput);
  
  if (!userParsed.isValid) {
    return {
      isCorrect: false,
      message: userParsed.errorMessage || 'Invalid command',
    };
  }
  
  const matchResult = commandsMatch(expectedParsed, userParsed);
  
  if (matchResult.matches) {
    return {
      isCorrect: true,
      message: 'Correct! Task completed.',
      output: userParsed.command?.mockOutput,
    };
  } else {
    return {
      isCorrect: false,
      message: `Not quite right. ${matchResult.reason || 'Try again!'}`,
    };
  }
}

/**
 * Mark all tasks as complete and increment completion counter
 * Hidden feature for testing
 */
export async function completeAllTasks(progress: UserProgress): Promise<UserProgress> {
  const tasks = generateTasks();
  const allTaskIds = tasks.map((_, index) => index + 1);
  const newCompletionCount = progress.completionCount + 1;
  
  // Generate new random task order for next round
  const baseOrder = tasks.map((_, index) => index + 1);
  const taskOrder = shuffleArray(baseOrder);
  
  const newProgress = {
    currentTaskId: tasks.length + 1, // Set beyond total to show completion screen
    completedTaskIds: allTaskIds,
    totalTasks: tasks.length,
    completionCount: newCompletionCount,
    taskOrder,
  };
  
  await saveProgress(newProgress);
  return newProgress;
}

/**
 * Start a new round after completing all tasks
 */
export async function startNewRound(progress: UserProgress): Promise<UserProgress> {
  const tasks = generateTasks();
  const newCompletionCount = progress.completionCount + 1;
  
  // Generate new random task order
  const baseOrder = tasks.map((_, index) => index + 1);
  const taskOrder = shuffleArray(baseOrder);
  
  const newProgress = {
    currentTaskId: 1,
    completedTaskIds: [],
    totalTasks: tasks.length,
    completionCount: newCompletionCount,
    taskOrder,
  };
  
  await saveProgress(newProgress);
  return newProgress;
}

/**
 * Hard reset - reset everything including completion counter
 * Hidden feature
 */
export async function hardResetProgress(): Promise<UserProgress> {
  const tasks = generateTasks();
  const taskOrder = tasks.map((_, index) => index + 1);
  
  const newProgress = {
    currentTaskId: 1,
    completedTaskIds: [],
    totalTasks: tasks.length,
    completionCount: 0,
    taskOrder,
  };
  
  try {
    await AsyncStorage.setItem('npm-practice-progress', JSON.stringify(newProgress));
  } catch (e) {
    // Ignore errors
  }
  
  return newProgress;
}

/**
 * Get next task after completing current one
 */
export function getNextTask(
  tasks: Task[],
  progress: UserProgress
): Task | null {
  // Find next uncompleted task
  for (const task of tasks) {
    if (!progress.completedTaskIds.includes(task.id)) {
      return task;
    }
  }
  
  return null; // All tasks completed
}

/**
 * Update progress after completing a task
 */
export function updateProgress(
  progress: UserProgress,
  completedTaskId: number
): UserProgress {
  if (progress.completedTaskIds.includes(completedTaskId)) {
    return progress; // Already completed
  }
  
  return {
    ...progress,
    completedTaskIds: [...progress.completedTaskIds, completedTaskId],
    currentTaskId: completedTaskId + 1,
  };
}

/**
 * Get progress statistics
 */
export function getProgressStats(progress: UserProgress): {
  completed: number;
  total: number;
  percentage: number;
} {
  const completed = progress.completedTaskIds.length;
  const total = progress.totalTasks;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return { completed, total, percentage };
}
