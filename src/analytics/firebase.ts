/**
 * Firebase Analytics Configuration
 * Tracks app usage across all platforms (iOS, Android, Web, Windows)
 * Works offline - events are queued and sent when connection returns
 * 
 * Set EXPO_PUBLIC_ENABLE_ANALYTICS=false in .env for local development
 */

import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent, setUserProperties, Analytics } from 'firebase/analytics';
import { Platform } from 'react-native';

// Check if analytics is enabled via environment variable
const ANALYTICS_ENABLED = process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true';

// Firebase configuration
// TODO: Replace with your actual Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCR3amnzAcuLFKgQpN4A6CzBx3d4SD64Ts",
  authDomain: "npm-practice-app.firebaseapp.com",
  projectId: "npm-practice-app",
  storageBucket: "npm-practice-app.firebasestorage.app",
  messagingSenderId: "969747472962",
  appId: "1:969747472962:web:efba08f8030d97f2f403db",
  measurementId: "G-NZE1XE46S9"
};

let analytics: Analytics | null = null;

/**
 * Initialize Firebase Analytics
 * Safe to call multiple times - only initializes once
 */
export function initializeAnalytics() {
  if (!ANALYTICS_ENABLED) {
    console.log('📊 Firebase Analytics: Disabled (EXPO_PUBLIC_ENABLE_ANALYTICS=false)');
    return;
  }

  try {
    // Only initialize on web platform for now
    // For native platforms, we'd use @react-native-firebase/analytics
    if (Platform.OS === 'web') {
      const app = initializeApp(firebaseConfig);
      analytics = getAnalytics(app);
      console.log('📊 Firebase Analytics: Initialized and active');
    }
  } catch (error) {
    console.warn('📊 Firebase Analytics initialization failed:', error);
    console.warn('📊 App continues to work normally - analytics disabled');
    // App continues to work normally even if analytics fails
  }
}

/**
 * Log task completion event
 */
export function logTaskCompleted(taskId: number, commandName: string, attempts: number = 1) {
  if (!analytics) return;
  
  try {
    logEvent(analytics, 'task_completed', {
      task_id: taskId,
      command: commandName,
      attempts: attempts,
    });
  } catch (error) {
    console.warn('Analytics event failed (task_completed):', error);
  }
}

/**
 * Log command input event
 */
export function logCommandEntered(command: string, isCorrect: boolean) {
  if (!analytics) return;
  
  try {
    logEvent(analytics, 'command_entered', {
      command: command,
      correct: isCorrect,
    });
  } catch (error) {
    console.warn('Analytics event failed (command_entered):', error);
  }
}

/**
 * Log user viewing solution
 */
export function logSolutionViewed(taskId: number) {
  if (!analytics) return;
  
  try {
    logEvent(analytics, 'solution_viewed', {
      task_id: taskId,
    });
  } catch (error) {
    console.warn('Analytics event failed (solution_viewed):', error);
  }
}

/**
 * Log progress reset
 */
export function logProgressReset(completionCount: number) {
  if (!analytics) return;
  
  try {
    logEvent(analytics, 'progress_reset', {
      completion_count: completionCount,
    });
  } catch (error) {
    console.warn('Analytics event failed (progress_reset):', error);
  }
}

/**
 * Log round completion
 */
export function logRoundCompleted(completionCount: number, tasksCompleted: number) {
  if (!analytics) return;
  
  try {
    logEvent(analytics, 'round_completed', {
      completion_count: completionCount,
      tasks_completed: tasksCompleted,
    });
  } catch (error) {
    console.warn('Analytics event failed (round_completed):', error);
  }
}

/**
 * Set user properties for analytics
 */
export function setAnalyticsUserProperties(properties: {
  completion_count?: number;
  total_tasks?: number;
  favorite_command?: string;
}) {
  if (!analytics) return;
  
  try {
    setUserProperties(analytics, properties);
  } catch (error) {
    console.warn('Analytics user properties failed:', error);
  }
}
