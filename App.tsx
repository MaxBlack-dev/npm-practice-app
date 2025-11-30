import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  generateTasks,
  getInitialProgress,
  validateTaskCompletion,
  updateProgress,
  getProgressStats,
  Task,
  UserProgress,
} from './src/core';

export default function App() {
  const [tasks] = useState<Task[]>(generateTasks());
  const [progress, setProgress] = useState<UserProgress>(getInitialProgress());
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [output, setOutput] = useState('');

  useEffect(() => {
    // Set initial task
    const task = tasks.find(t => t.id === progress.currentTaskId);
    setCurrentTask(task || null);
  }, [progress.currentTaskId, tasks]);

  const handleSubmit = () => {
    if (!currentTask || !userInput.trim()) {
      return;
    }

    const result = validateTaskCompletion(currentTask, userInput);

    if (result.isCorrect) {
      setFeedback('✅ ' + result.message);
      setOutput(result.output || '');
      
      // Update progress and move to next task
      const newProgress = updateProgress(progress, currentTask.id);
      setProgress(newProgress);
      
      // Clear input for next task
      setTimeout(() => {
        setUserInput('');
        setFeedback('');
        setOutput('');
      }, 2000);
    } else {
      setFeedback('❌ ' + result.message);
      setOutput('');
    }
  };

  const stats = getProgressStats(progress);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.title}>NPM Practice</Text>
        <Text style={styles.progress}>
          Progress: {stats.completed}/{stats.total} ({stats.percentage}%)
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {currentTask ? (
          <>
            <View style={styles.taskCard}>
              <Text style={styles.taskNumber}>Task {currentTask.id}</Text>
              <Text style={styles.taskTitle}>{currentTask.title}</Text>
              <Text style={styles.taskDescription}>{currentTask.description}</Text>
              {currentTask.hint && (
                <Text style={styles.hint}>💡 Hint: {currentTask.hint}</Text>
              )}
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.label}>Enter your command:</Text>
              <TextInput
                style={styles.input}
                value={userInput}
                onChangeText={setUserInput}
                placeholder="npm ..."
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleSubmit}
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
                <Text style={styles.outputTitle}>Output:</Text>
                <Text style={styles.outputText}>{output}</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.completionCard}>
            <Text style={styles.completionTitle}>🎉 Congratulations!</Text>
            <Text style={styles.completionText}>
              You've completed all {stats.total} npm command tasks!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#cb3837',
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
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskNumber: {
    fontSize: 12,
    color: '#cb3837',
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
  hint: {
    fontSize: 14,
    color: '#cb3837',
    marginTop: 10,
    fontStyle: 'italic',
  },
  inputSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
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
    backgroundColor: '#cb3837',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feedbackText: {
    fontSize: 16,
    color: '#333',
  },
  outputCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  outputTitle: {
    fontSize: 14,
    color: '#6a9955',
    marginBottom: 10,
    fontWeight: 'bold',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completionTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#cb3837',
    marginBottom: 15,
  },
  completionText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 28,
  },
});

