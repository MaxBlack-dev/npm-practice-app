/**
 * Task System
 * Manages learning tasks and user progress
 */

import { NPM_COMMANDS } from './commands';
import { parseCommand, commandsMatch } from './parser';

export interface Task {
  id: number;
  title: string;
  description: string;
  expectedCommand: string;
  hint?: string;
  commandName: string;
}

export interface UserProgress {
  currentTaskId: number;
  completedTaskIds: number[];
  totalTasks: number;
}

/**
 * Generate all tasks from npm commands
 * Each command gets a base task, plus one task per parameter
 */
export function generateTasks(): Task[] {
  const tasks: Task[] = [];
  let taskId = 1;
  
  for (const cmd of NPM_COMMANDS) {
    // Base task: use command without parameters
    tasks.push({
      id: taskId++,
      title: `Use ${cmd.name} command`,
      description: cmd.description,
      expectedCommand: `npm ${cmd.name}`,
      hint: cmd.aliases ? `Aliases: ${cmd.aliases.join(', ')}` : undefined,
      commandName: cmd.name,
    });
    
    // Parameter tasks: use command with each parameter
    for (const param of cmd.parameters) {
      const exampleValue = param.requiresValue ? 'example' : '';
      
      tasks.push({
        id: taskId++,
        title: `Use ${cmd.name} with ${param.name}`,
        description: `${cmd.description} - ${param.description}`,
        expectedCommand: param.requiresValue
          ? `npm ${cmd.name} ${param.name} ${exampleValue}`
          : `npm ${cmd.name} ${param.name}`,
        hint: param.aliases ? `Parameter aliases: ${param.aliases.join(', ')}` : undefined,
        commandName: cmd.name,
      });
    }
  }
  
  return tasks;
}

/**
 * Get initial user progress
 */
export function getInitialProgress(): UserProgress {
  const tasks = generateTasks();
  return {
    currentTaskId: 1,
    completedTaskIds: [],
    totalTasks: tasks.length,
  };
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
