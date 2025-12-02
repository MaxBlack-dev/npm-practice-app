import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity, Platform, Linking, KeyboardAvoidingView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  generateTasks,
  getInitialProgress,
  validateTaskCompletion,
  updateProgress,
  getProgressStats,
  saveProgress,
  resetProgress,
  completeAllTasks,
  startNewRound,
  hardResetProgress,
  Task,
  UserProgress,
} from './src/core';
import {
  initializeAnalytics,
  logTaskCompleted,
  logCommandEntered,
  logSolutionViewed,
  logProgressReset,
  logRoundCompleted,
  setAnalyticsUserProperties,
} from './src/analytics/firebase';

export default function App() {
  const [tasks] = useState<Task[]>(generateTasks());
  const [progress, setProgress] = useState<UserProgress>({
    currentTaskId: 1,
    completedTaskIds: [],
    totalTasks: generateTasks().length,
    completionCount: 0,
    taskOrder: tasks.map((_, i) => i + 1),
  });
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [output, setOutput] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [previousOutput, setPreviousOutput] = useState('');
  const [previousCommand, setPreviousCommand] = useState('');
  const [previousFeedback, setPreviousFeedback] = useState('');
  const [showSolution, setShowSolution] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [jumpToTask, setJumpToTask] = useState('');
  const [showJumpInput, setShowJumpInput] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const inputRef = React.useRef<TextInput>(null);
  const jumpInputRef = React.useRef<TextInput>(null);

  // Load initial progress from AsyncStorage
  useEffect(() => {
    // Initialize Firebase Analytics (works offline - events queued if no internet)
    initializeAnalytics();
    
    getInitialProgress().then(setProgress);
    return () => {};
  }, []);

  useEffect(() => {
    // Get task based on taskOrder
    const taskIndex = progress.currentTaskId - 1;
    const actualTaskId = progress.taskOrder[taskIndex];
    const task = tasks.find(t => t.id === actualTaskId);
    setCurrentTask(task || null);
    setShowSolution(false); // Reset solution visibility for new task
    setShowHint(false); // Reset hint visibility for new task
    
    // Hidden feature: Alt+T to show jump to task input
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 't') {
        e.preventDefault();
        setShowJumpInput(prev => !prev);
      }
    };
    
    if (Platform.OS === 'web') {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
    return () => {};
  }, [progress.currentTaskId, progress.taskOrder, tasks]);

  // Save progress to AsyncStorage whenever it changes
  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  // Update suggestions based on user input
  useEffect(() => {
    const input = userInput.trim().toLowerCase();
    const parts = input.split(/\s+/);
    
    // Remove 'npm' if present
    const commandParts = parts[0] === 'npm' ? parts.slice(1) : parts;
    
    if (commandParts.length === 0 || input === '') {
      // Show common commands when empty
      setSuggestions(['install', 'init', 'uninstall', 'update', 'run', 'test']);
    } else if (commandParts.length === 1 && !input.endsWith(' ')) {
      // Suggest command completions
      const partial = commandParts[0];
      const commands = ['install', 'init', 'uninstall', 'update', 'run', 'test', 'start', 'build', 'publish'];
      const matches = commands.filter(cmd => cmd.startsWith(partial));
      setSuggestions(matches.length > 0 ? matches : []);
    } else {
      // Suggest based on command type and filter by partial input
      const command = commandParts[0];
      const lastPart = commandParts[commandParts.length - 1];
      const isTyping = !input.endsWith(' ');
      const partial = isTyping ? lastPart : '';
      
      let allSuggestions: string[] = [];
      
      if (['install', 'i', 'add'].includes(command)) {
        allSuggestions = ['lodash', 'express', 'react', 'axios', 'chalk', '@mycompany', '--save-dev', '-D', '--save', '-S', '--save-exact', '-E', '--save-optional', '--save-bundle', '--no-save', '-g', '--global'];
      } else if (['uninstall', 'remove', 'rm', 'r', 'un', 'unlink'].includes(command)) {
        allSuggestions = ['lodash', 'express', 'react', 'axios', 'chalk', '@mycompany', '--save-dev', '-D', '--save', '-S', '-g', '--global'];
      } else if (['run', 'run-script'].includes(command)) {
        allSuggestions = ['build', 'test', 'start', 'dev', '--silent'];
      } else if (['init', 'create'].includes(command)) {
        allSuggestions = ['vite', 'my-app', 'react-app', 'react-app@latest', '@vitejs/app', '@latest', '--', '--template', 'react', 'commonjs', 'module', 'MIT', 'Apache-2.0', 'ISC', 'GPL-3.0', 'BSD-3-Clause', 'Unlicense', '0.1.0', '1.0.0', '1.5.0', '2.0.0', '"John Doe"', '"john@example.org"', '"https://johndoe.dev"', '"Alex Chen"', '"alex@techcorp.com"', '@acmecorp', '@techcorp', '@mycompany', 'packages/frontend', 'packages/api', 'packages/tools', './my-init.js', '-y', '--yes', '-f', '--force', '--scope=', '--init-author-name=', '--init-author-email=', '--init-author-url=', '--init-license=', '--init-version=', '--init-type=', '--init-module=', '--init-private', '-w', '--workspace=', '--workspaces', '--include-workspace-root'];
      } else if (['publish'].includes(command)) {
        allSuggestions = ['--access', '--tag', '--dry-run'];
      } else if (['config', 'c'].includes(command)) {
        allSuggestions = ['set', 'get', 'delete', 'list', '-g', '--global'];
      } else if (['audit'].includes(command)) {
        allSuggestions = ['--fix', '--json', '--audit-level'];
      } else if (['outdated'].includes(command)) {
        allSuggestions = ['-g', '--global', '--json'];
      } else if (['list', 'ls', 'll', 'la'].includes(command)) {
        allSuggestions = ['-g', '--global', '--depth', '0', '--json'];
      } else if (['cache'].includes(command)) {
        allSuggestions = ['clean', 'verify', '--force', '-f'];
      } else if (['search', 's', 'se', 'find'].includes(command)) {
        allSuggestions = ['--long', '--json'];
      } else if (['view', 'info', 'show'].includes(command)) {
        allSuggestions = ['lodash', 'express', 'react', 'axios', 'chalk', '--json'];
      }
      
      // Filter suggestions by partial match
      if (partial) {
        const filtered = allSuggestions.filter(s => s.toLowerCase().startsWith(partial));
        setSuggestions(filtered.length > 0 ? filtered : allSuggestions);
      } else {
        setSuggestions(allSuggestions);
      }
    }
  }, [userInput]);

  useEffect(() => {
    // Focus jump input when shown
    if (showJumpInput) {
      setTimeout(() => {
        jumpInputRef.current?.focus();
      }, 100);
    }
  }, [showJumpInput]);

  const handleSubmit = async () => {
    if (!currentTask || !userInput.trim()) {
      return;
    }

    // Hidden command: show solution
    if (userInput.trim() === 'show') {
      setShowSolution(true);
      setUserInput('');
      
      // Log solution viewed (analytics - works offline)
      if (currentTask) {
        logSolutionViewed(currentTask.id);
      }
      
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      return;
    }

    // Hidden command: complete all tasks
    if (userInput.trim() === 'complete-all') {
      const newProgress = await completeAllTasks(progress);
      setProgress(newProgress);
      setUserInput('');
      setFeedback('');
      setOutput('');
      setLastCommand('');
      return;
    }

    // Hidden command: hard reset (reset completion counter too)
    if (userInput.trim() === 'hard-reset') {
      const newProgress = await hardResetProgress();
      setProgress(newProgress);
      setUserInput('');
      setFeedback('🔄 Hard reset complete!');
      setPreviousOutput('');
      setPreviousCommand('');
      setPreviousFeedback('');
      setShowSolution(false);
      setShowHint(false);
      return;
    }

    const result = validateTaskCompletion(currentTask, userInput);

    // Log command entered (analytics - works offline)
    logCommandEntered(userInput, result.isCorrect);

    if (result.isCorrect) {
      setFeedback('✅ ' + result.message);
      setOutput(result.output || '');
      setLastCommand(userInput);
      
      // Log task completion (analytics - works offline)
      logTaskCompleted(currentTask.id, currentTask.commandName);
      
      // Update progress and move to next task
      const newProgress = updateProgress(progress, currentTask.id);
      setProgress(newProgress);
      
      // Update user properties (analytics - works offline)
      const newStats = getProgressStats(newProgress);
      setAnalyticsUserProperties({
        completion_count: newProgress.completionCount,
        total_tasks: newStats.total,
      });
      
      // Save current output as previous before clearing
      setPreviousOutput(result.output || '');
      setPreviousCommand(userInput);
      setPreviousFeedback('✅ ' + result.message);
      
      // Clear input but keep output visible
      setUserInput('');
      
      // Refocus input after a short delay
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setFeedback('❌ ' + result.message);
      setOutput('');
      setLastCommand('');
      // Keep focus on input
      inputRef.current?.focus();
    }
  };

  const stats = getProgressStats(progress);

  const insertSuggestion = (suggestion: string) => {
    const input = userInput.trim();
    const parts = input.split(/\s+/);
    
    // Remove 'npm' if present for processing
    const commandParts = parts[0] === 'npm' ? parts.slice(1) : parts;
    const hasNpmPrefix = parts[0] === 'npm';
    
    let newInput = '';
    
    // If empty or completing a command name, replace/append
    if (commandParts.length === 0 || input === '') {
      newInput = suggestion + ' ';
    } else if (commandParts.length === 1 && !input.endsWith(' ')) {
      // Completing command name - replace the partial
      const prefix = hasNpmPrefix ? 'npm ' : '';
      newInput = prefix + suggestion + ' ';
    } else {
      // Completing parameter or package - replace last partial word if not ending with space
      if (input.endsWith(' ')) {
        // Just append
        newInput = input + suggestion + ' ';
      } else {
        // Replace the last partial word
        const lastSpaceIndex = input.lastIndexOf(' ');
        const beforeLast = input.substring(0, lastSpaceIndex + 1);
        newInput = beforeLast + suggestion + ' ';
      }
    }
    
    setUserInput(newInput);
    
    // Refocus input and move cursor to end
    // Use requestAnimationFrame for smoother mobile experience
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Set selection to end for all platforms
          if (Platform.OS === 'web') {
            // Web uses setSelectionRange on the underlying input element
            const webInput = inputRef.current as any;
            if (webInput.setSelectionRange) {
              webInput.setSelectionRange(newInput.length, newInput.length);
            }
          }
        }
      }, Platform.OS === 'web' ? 10 : 50);
    });
  };

  const handleTabKey = () => {
    // If only one suggestion, autocomplete it
    if (suggestions.length === 1) {
      insertSuggestion(suggestions[0]);
    }
  };

  const openBook = () => {
    Linking.openURL('https://www.amazon.com/dp/B0FSX9TZZ1');
  };

  const goToNextTask = () => {
    if (progress.currentTaskId < tasks.length) {
      const newProgress = { ...progress, currentTaskId: progress.currentTaskId + 1 };
      setProgress(newProgress);
      setUserInput('');
      setFeedback('');
      setOutput('');
      setLastCommand('');
    }
  };

  const goToPreviousTask = () => {
    if (progress.currentTaskId > 1) {
      const newProgress = { ...progress, currentTaskId: progress.currentTaskId - 1 };
      setProgress(newProgress);
      setUserInput('');
      setFeedback('');
      setOutput('');
      setLastCommand('');
    }
  };

  const handleJumpToTask = () => {
    const taskNum = parseInt(jumpToTask);
    if (taskNum >= 1 && taskNum <= tasks.length) {
      const newProgress = { ...progress, currentTaskId: taskNum };
      setProgress(newProgress);
      setUserInput('');
      setFeedback('');
      setOutput('');
      setLastCommand('');
      setJumpToTask('');
      setShowJumpInput(false);
    }
  };

  const handleStartNewRound = async () => {
    // Log round completion (analytics - works offline)
    logRoundCompleted(progress.completionCount, progress.completedTaskIds.length);
    
    const newProgress = await startNewRound(progress);
    setProgress(newProgress);
    setUserInput('');
    setFeedback('');
    setOutput('');
    setLastCommand('');
    setPreviousOutput('');
    setPreviousCommand('');
    setPreviousFeedback('');
    setShowSolution(false);
    setShowHint(false);
  };

  const handleResetProgress = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    setShowResetConfirm(false);
    const newProgress = await resetProgress();
    
    // Log progress reset (analytics - works offline)
    logProgressReset(progress.completionCount);
    
    setProgress(newProgress);
    setUserInput('');
    setFeedback('');
    setOutput('');
    setLastCommand('');
    setPreviousOutput('');
    setPreviousCommand('');
    setPreviousFeedback('');
    setShowSolution(false);
    setShowHint(false);
  };

  const cancelReset = () => {
    setShowResetConfirm(false);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.title}>NPM Practice</Text>
        <Text style={styles.progress}>
          Progress: {stats.completed}/{stats.total} ({stats.percentage}%)
        </Text>
        {progress.completionCount > 0 && (
          <Text style={styles.completionCountHeader}>
            🏆 Completed {progress.completionCount} {progress.completionCount === 1 ? 'time' : 'times'}
          </Text>
        )}
        <TouchableOpacity 
          style={styles.resetButton} 
          onPress={handleResetProgress}
          activeOpacity={0.7}
        >
          <Text style={styles.resetButtonText}>🔄 Reset Progress</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            📚 New to npm? Learn the fundamentals first!
          </Text>
          <TouchableOpacity style={styles.bookButton} onPress={openBook}>
            <Text style={styles.bookButtonText}>📖 Read "NPM Node Package Manager: The Complete Tutorial"</Text>
          </TouchableOpacity>
        </View>

        {currentTask ? (
          <>
            <View style={styles.navigationRow}>
              <TouchableOpacity 
                style={[styles.navButton, progress.currentTaskId === 1 && styles.navButtonDisabled]} 
                onPress={goToPreviousTask}
                disabled={progress.currentTaskId === 1}
              >
                <Text style={styles.navButtonText}>← Previous</Text>
              </TouchableOpacity>
              
              <Text style={styles.taskCounter}>{progress.currentTaskId} / {tasks.length}</Text>
              
              <TouchableOpacity 
                style={[styles.navButton, progress.currentTaskId === tasks.length && styles.navButtonDisabled]} 
                onPress={goToNextTask}
                disabled={progress.currentTaskId === tasks.length}
              >
                <Text style={styles.navButtonText}>Next →</Text>
              </TouchableOpacity>
            </View>

            {showJumpInput && (
              <View style={styles.jumpCard}>
                <Text style={styles.jumpLabel}>Jump to task:</Text>
                <View style={styles.jumpRow}>
                  <TextInput
                    ref={jumpInputRef}
                    style={styles.jumpInput}
                    value={jumpToTask}
                    onChangeText={setJumpToTask}
                    placeholder="Task number..."
                    keyboardType="number-pad"
                    onSubmitEditing={handleJumpToTask}
                  />
                  <TouchableOpacity style={styles.jumpButton} onPress={handleJumpToTask}>
                    <Text style={styles.jumpButtonText}>Go</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.jumpCloseButton} 
                    onPress={() => setShowJumpInput(false)}
                  >
                    <Text style={styles.jumpButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.jumpHint}>Tip: Press Alt+T to toggle this</Text>
              </View>
            )}

            <View style={styles.taskCard}>
              <Text style={styles.taskNumber}>Task {currentTask.id}</Text>
              <Text style={styles.taskTitle}>{currentTask.title}</Text>
              <Text style={styles.taskDescription}>{currentTask.description}</Text>
              
              {currentTask.hint && showHint && !showSolution && (
                <View style={styles.hintBox}>
                  <Text style={styles.hint}>💡 {currentTask.hint}</Text>
                </View>
              )}
              
              <View style={styles.buttonRow}>
                {currentTask.hint && !showHint && !showSolution && (
                  <TouchableOpacity 
                    style={styles.hintButton} 
                    onPress={() => setShowHint(true)}
                  >
                    <Text style={styles.hintButtonText}>💡 Show Hint</Text>
                  </TouchableOpacity>
                )}
                
                {showSolution ? (
                  <View style={styles.solutionBox}>
                    <Text style={styles.solutionTitle}>✨ Solution:</Text>
                    <Text style={styles.solutionCommand}>{currentTask.expectedCommand}</Text>
                    {currentTask.commandExplanation && (
                      <Text style={styles.solutionExplanation}>{currentTask.commandExplanation}</Text>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.showSolutionButton} 
                    onPress={() => setShowSolution(true)}
                  >
                    <Text style={styles.showSolutionText}>✨ Show Solution</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.label}>Enter your command:</Text>
              
              {suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suggestionsContent}
                    keyboardShouldPersistTaps="handled"
                  >
                    {suggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionButton}
                        onPress={() => insertSuggestion(suggestion)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={userInput}
                onChangeText={setUserInput}
                placeholder="npm ..."
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={true}
                onSubmitEditing={handleSubmit}
                onKeyPress={(e: any) => {
                  if (Platform.OS === 'web' && e.nativeEvent.key === 'Tab' && suggestions.length === 1) {
                    e.preventDefault();
                    handleTabKey();
                  }
                }}
              />
              <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </View>

            {feedback && (
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackText}>{feedback}</Text>
              </View>
            )}

            {output && (
              <View style={styles.outputCard}>
                <Text style={styles.commandPrompt}>$ {lastCommand}</Text>
                <Text style={styles.outputText}>{output}</Text>
              </View>
            )}

            {previousOutput && previousOutput !== output && (
              <View style={styles.previousOutputCard}>
                <Text style={styles.outputTitle}>Previous Task Output:</Text>
                {previousFeedback && (
                  <Text style={styles.previousFeedback}>{previousFeedback}</Text>
                )}
                <Text style={styles.commandPrompt}>$ {previousCommand}</Text>
                <Text style={styles.outputText}>{previousOutput}</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.completionCard}>
            <Text style={styles.completionTitle}>🎉 Congratulations!</Text>
            <Text style={styles.completionText}>
              You've completed all {stats.total} npm command tasks!
            </Text>
            {progress.completionCount > 0 && (
              <View style={styles.completionCountBadge}>
                <Text style={styles.completionCountText}>
                  Completed {progress.completionCount} {progress.completionCount === 1 ? 'time' : 'times'}! 🏆
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.newRoundButton} onPress={handleStartNewRound}>
              <Text style={styles.newRoundButtonText}>
                🔄 Start New Round {progress.completionCount > 0 ? '(Random Order)' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Progress</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to reset all progress? This cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]} 
                onPress={cancelReset}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]} 
                onPress={confirmReset}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonTextConfirm}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#6366f1',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  progress: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.95,
    marginBottom: 8,
  },
  completionCountHeader: {
    fontSize: 13,
    color: '#fef3c7',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  } as any,
  resetButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(99, 102, 241, 0.1)',
      },
      default: {
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  infoText: {
    fontSize: 15,
    color: '#1e40af',
    marginBottom: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  bookButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  navButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#d1d5db',
    opacity: 0.5,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  taskCounter: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  jumpCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  jumpLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  jumpRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  jumpInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
  },
  jumpButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    borderRadius: 6,
    justifyContent: 'center',
  },
  jumpCloseButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    borderRadius: 6,
    justifyContent: 'center',
  },
  jumpButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  jumpHint: {
    fontSize: 11,
    color: '#92400e',
    fontStyle: 'italic',
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  taskNumber: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  taskDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  hintBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  hint: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  buttonRow: {
    marginTop: 15,
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  hintButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  hintButtonText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
  },
  showSolutionButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  showSolutionText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  solutionBox: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
    width: '100%',
  },
  solutionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 8,
  },
  solutionCommand: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#1e293b',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  solutionExplanation: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  inputSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  suggestionsContainer: {
    marginBottom: 12,
    maxHeight: 45,
  },
  suggestionsContent: {
    paddingRight: 10,
    gap: 8,
  },
  suggestionButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'monospace',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  feedbackCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  feedbackText: {
    fontSize: 16,
    color: '#333',
  },
  outputCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 15,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  outputTitle: {
    fontSize: 14,
    color: '#6a9955',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  commandPrompt: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#9ca3af',
    marginBottom: 8,
  },
  outputText: {
    fontSize: 14,
    color: '#d4d4d4',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  completionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  completionTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 15,
  },
  completionText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 20,
  },
  completionCountBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  completionCountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
  },
  newRoundButton: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginTop: 10,
  },
  newRoundButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previousOutputCard: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
    opacity: 0.8,
  },
  previousFeedback: {
    fontSize: 14,
    color: '#4ade80',
    marginBottom: 10,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
      },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#e5e7eb',
  },
  modalButtonConfirm: {
    backgroundColor: '#ef4444',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

