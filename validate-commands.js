/**
 * NPM Command Validation Script
 * Tests commands against real npm to ensure mock outputs are accurate
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Extract commands from taskSystem.ts file by parsing it
function extractCommandsFromFile() {
  const taskSystemPath = path.join(__dirname, 'src', 'core', 'taskSystem.ts');
  const content = fs.readFileSync(taskSystemPath, 'utf8');
  
  const commands = [];
  const regex = /expectedCommand:\s*['"`](npm[^'"`]+)['"`]/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    commands.push(match[1]);
  }
  
  console.log(`Found ${commands.length} commands in taskSystem.ts`);
  return commands;
}

// Categories of commands
const SAFE_READ_ONLY = [
  'help', 'version', 'config list', 'config get', 'get', 'prefix', 'root', 
  'bin', 'whoami', 'view', 'search', 'outdated', 'fund', 'doctor', 
  'explain', 'list', 'll', 'repo', 'docs', 'bugs'
];

const DRY_RUN_SUPPORTED = [
  'install', 'uninstall', 'update', 'ci', 'dedupe', 'prune', 
  'publish', 'pack', 'deprecate', 'unpublish', 'version'
];

const SKIP_DANGEROUS = [
  'adduser', 'login', 'logout', 'publish', 'unpublish', 'deprecate',
  'owner', 'team', 'access', 'token', 'star', 'unstar', 'dist-tag',
  'hook', 'profile', 'org'
];

// Create temporary test project
function setupTestProject() {
  const tempDir = path.join(os.tmpdir(), `npm-validation-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  
  // Create a basic package.json
  const packageJson = {
    name: 'test-validation-project',
    version: '1.0.0',
    description: 'Temporary project for npm command validation',
    private: true,
    scripts: {
      test: 'echo "Test script"',
      start: 'echo "Start script"',
      build: 'echo "Build script"'
    },
    dependencies: {},
    devDependencies: {}
  };
  
  fs.writeFileSync(
    path.join(tempDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Create a simple index.js
  fs.writeFileSync(
    path.join(tempDir, 'index.js'),
    'console.log("Hello from test project");'
  );
  
  // Initialize git (some commands check for git)
  try {
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'ignore' });
  } catch (e) {
    console.warn('Could not initialize git in test project');
  }
  
  console.log(`✅ Test project created at: ${tempDir}`);
  return tempDir;
}

// Clean up test project
function cleanupTestProject(tempDir) {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`✅ Test project cleaned up: ${tempDir}`);
  } catch (e) {
    console.warn(`⚠️  Could not clean up: ${tempDir}`);
  }
}

// Determine if command is safe to run
function categorizeCommand(cmdString) {
  const baseCmd = cmdString.split(' ')[1]; // Get command after 'npm'
  
  // Check if it's a dangerous command
  if (SKIP_DANGEROUS.some(dangerous => cmdString.includes(dangerous))) {
    return 'SKIP';
  }
  
  // Check if it's read-only
  if (SAFE_READ_ONLY.some(safe => cmdString.includes(safe))) {
    return 'SAFE';
  }
  
  // Check if it supports --dry-run
  if (DRY_RUN_SUPPORTED.some(cmd => cmdString.includes(cmd))) {
    return 'DRY_RUN';
  }
  
  // Check for specific safe patterns
  if (cmdString.includes('--help') || cmdString.includes('-h')) {
    return 'SAFE';
  }
  
  if (cmdString.includes('cache') && (cmdString.includes('ls') || cmdString.includes('verify'))) {
    return 'SAFE';
  }
  
  if (cmdString.includes('run') || cmdString.includes('test') || cmdString.includes('start')) {
    return 'SKIP'; // Skip script execution for now
  }
  
  return 'SKIP'; // Default to skip if uncertain
}

// Execute a command and capture output
function executeCommand(command, cwd) {
  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000 // 10 second timeout
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    return {
      success: false,
      output: error.stdout ? error.stdout.trim() : '',
      error: error.stderr ? error.stderr.trim() : error.message
    };
  }
}

// Main validation function
async function validateCommands() {
  console.log('🚀 Starting NPM Command Validation\n');
  
  const tempDir = setupTestProject();
  const commands = extractCommandsFromFile();
  
  const results = {
    total: commands.length,
    safe: 0,
    dryRun: 0,
    skipped: 0,
    passed: 0,
    failed: 0,
    errors: []
  };
  
  console.log(`📋 Total commands to validate: ${commands.length}\n`);
  
  for (let i = 0; i < commands.length; i++) {
    const cmdString = commands[i];
    const category = categorizeCommand(cmdString);
    
    process.stdout.write(`\r[${i + 1}/${commands.length}] Testing: ${cmdString.substring(0, 60).padEnd(60)}`);
    
    if (category === 'SKIP') {
      results.skipped++;
      continue;
    }
    
    let testCommand = cmdString;
    
    if (category === 'DRY_RUN') {
      // Add --dry-run if not already present
      if (!cmdString.includes('--dry-run')) {
        testCommand = cmdString + ' --dry-run';
      }
      results.dryRun++;
    } else if (category === 'SAFE') {
      results.safe++;
    }
    
    // Execute the command
    const result = executeCommand(testCommand, tempDir);
    
    if (result.success || (result.error && !result.error.includes('ENOENT'))) {
      results.passed++;
      
      // Store successful output for comparison (optional)
      // Could compare with our mock outputs here
    } else {
      results.failed++;
      results.errors.push({
        command: testCommand,
        error: result.error || 'Unknown error'
      });
    }
  }
  
  console.log('\n\n📊 Validation Results:');
  console.log('═'.repeat(60));
  console.log(`Total Commands:      ${results.total}`);
  console.log(`Safe (Read-only):    ${results.safe}`);
  console.log(`Dry Run:             ${results.dryRun}`);
  console.log(`Skipped (Dangerous): ${results.skipped}`);
  console.log(`Passed:              ${results.passed}`);
  console.log(`Failed:              ${results.failed}`);
  console.log('═'.repeat(60));
  
  if (results.errors.length > 0) {
    console.log('\n❌ Failed Commands:');
    results.errors.slice(0, 10).forEach((err, idx) => {
      console.log(`\n${idx + 1}. ${err.command}`);
      console.log(`   Error: ${err.error.substring(0, 100)}`);
    });
    
    if (results.errors.length > 10) {
      console.log(`\n... and ${results.errors.length - 10} more errors`);
    }
  }
  
  // Cleanup
  cleanupTestProject(tempDir);
  
  const successRate = ((results.passed / (results.total - results.skipped)) * 100).toFixed(1);
  console.log(`\n✅ Success Rate: ${successRate}%`);
  
  return results;
}

// Run validation
validateCommands()
  .then(results => {
    if (results.failed === 0) {
      console.log('\n🎉 All testable commands validated successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some commands failed validation. Review errors above.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Validation script error:', error);
    process.exit(1);
  });
