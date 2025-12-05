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
      '--yes': {
        title: () => 'Initialize project with default settings',
        description: () => 'Create a package.json file automatically without answering any questions, using default values',
      },
      '-f': {
        title: () => 'Force reinitialize project',
        description: () => 'Create a new package.json file even if one already exists, overwriting the existing file',
      },
      '--force': {
        title: () => 'Force reinitialize project',
        description: () => 'Create a new package.json file even if one already exists, overwriting the existing file',
      },
      '--scope': {
        title: () => 'Initialize with scope @mycompany',
        description: () => 'Create a package.json with scope set to "@mycompany" (packages that belong to an organization)',
      },
      '--init-author-name': {
        title: () => 'Initialize with author name "John Doe"',
        description: () => 'Create a package.json with the author name field set to "John Doe"',
      },
      '--init-author-email': {
        title: () => 'Initialize with author email "john@example.org"',
        description: () => 'Create a package.json with the author email field set to "john@example.org"',
      },
      '--init-author-url': {
        title: () => 'Initialize with author URL "https://johndoe.dev"',
        description: () => 'Create a package.json with the author website URL set to "https://johndoe.dev"',
      },
      '--init-license': {
        title: () => 'Initialize with GPL-3.0 license',
        description: () => 'Create a package.json with the license field set to "GPL-3.0"',
      },
      '--init-version': {
        title: () => 'Initialize with version 1.5.0',
        description: () => 'Create a package.json with the initial version set to "1.5.0"',
      },
      '--init-private': {
        title: () => 'Initialize as private package',
        description: () => 'Create a package.json marked as private to prevent accidental publishing to npm',
      },
      '--init-type': {
        title: () => 'Initialize with type "module"',
        description: () => 'Set the package type to "module" for ES6 import/export syntax',
      },
      '--init-module': {
        title: () => 'Initialize with custom init script',
        description: () => 'Use a custom initialization script at the specified path',
      },
      '-w': {
        title: () => 'Initialize in workspace "packages/tools"',
        description: () => 'Create a package.json in the "packages/tools" workspace directory',
      },
      '--workspace': {
        title: () => 'Initialize in workspace "packages/tools"',
        description: () => 'Create a package.json in the "packages/tools" workspace directory',
      },
      '--workspaces': {
        title: () => 'Initialize all workspaces',
        description: () => 'Run npm init for all workspace packages defined in your monorepo',
      },
      '--include-workspace-root': {
        title: () => 'Initialize with workspace root',
        description: () => 'Include the root package when initializing workspaces',
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
  
  // ========== COMPREHENSIVE INIT COMMAND TASKS ==========
  // Organized in logical groups: basic, initializers, config options, workspaces, combinations
  // These are added FIRST so they appear at the beginning
  
  // Basic init task
  tasks.push({
    id: taskId++,
    title: 'Initialize a new project',
    description: 'Create a package.json file to start a new npm project',
    expectedCommand: 'npm init',
    hint: 'Aliases: create',
    commandName: 'init',
    commandExplanation: 'Creates a package.json file for your project. You\'ll be prompted to answer questions about your project name, version, description, etc.',
  });

  tasks.push({
    id: taskId++,
    title: 'Initialize project with default settings',
    description: 'Create a package.json file automatically without answering any questions, using default values',
    expectedCommand: 'npm init -y',
    hint: 'Use -y or --yes to accept all defaults',
    commandName: 'init',
    commandExplanation: 'The -y (or --yes) flag skips all prompts and creates a package.json with default values. Quick way to start a project.',
  });
  
  // GROUP 1: Using Initializers (npm init <initializer>)
  tasks.push({
    id: taskId++,
    title: 'Initialize a Vite project',
    description: 'Use npm init to bootstrap a new Vite application (runs create-vite)',
    expectedCommand: 'npm init vite',
    hint: 'npm init <initializer> runs the corresponding create-<initializer> package',
    commandName: 'init',
    commandExplanation: 'npm init <initializer> is a shortcut for npx create-<initializer>. It downloads and runs project scaffolding tools.',
  });

  tasks.push({
    id: taskId++,
    title: 'Initialize Vite project named "my-app"',
    description: 'Create a Vite project in a directory called "my-app"',
    expectedCommand: 'npm init vite my-app',
    hint: 'Add a directory name after the initializer',
    commandName: 'init',
    commandExplanation: 'You can specify a target directory name when using initializers.',
  });

  tasks.push({
    id: taskId++,
    title: 'Initialize with @vitejs/app initializer',
    description: 'Use the scoped @vitejs/app package initializer to create a project',
    expectedCommand: 'npm init @vitejs/app',
    hint: 'Scoped initializers work the same way with @scope/name format',
    commandName: 'init',
    commandExplanation: 'npm init @scope runs npx @scope/create. Useful for organization-specific initializers.',
  });

  tasks.push({
    id: taskId++,
    title: 'Initialize with latest react-app',
    description: 'Run the react-app initializer at the latest version',
    expectedCommand: 'npm init react-app@latest',
    hint: 'Use @ to specify version or dist-tag (like @latest, @1.2.3)',
    commandName: 'init',
    commandExplanation: 'You can pin initializers to specific versions using @version or @tag syntax (like @latest, @next, @1.2.3).',
  });

  tasks.push({
    id: taskId++,
    title: 'Initialize Vite with React template',
    description: 'Create a Vite project using the React template',
    expectedCommand: 'npm init vite -- --template react',
    hint: 'Use -- to separate npm options from initializer options',
    commandName: 'init',
    commandExplanation: 'Arguments after -- are passed directly to the initializer package.',
  });

  // GROUP 2: Configuration Options (--init-* flags) - Specific values
  tasks.push({
    id: taskId++,
    title: 'Initialize with author name "John Doe"',
    description: 'Create a package.json with the author name set to "John Doe"',
    expectedCommand: 'npm init --init-author-name="John Doe"',
    hint: 'Use --init-author-name with the specific name value, and -y to skip prompts',
    commandName: 'init',
    commandExplanation: 'The --init-author-name parameter sets the author field in package.json. Default: empty string.',
  });

  tasks.push({
    id: taskId++,
    title: 'Initialize with full author info',
    description: 'Set author to "John Doe" with email "john@example.org" and URL "https://johndoe.dev"',
    expectedCommand: 'npm init --init-author-name="John Doe" --init-author-email="john@example.org" --init-author-url="https://johndoe.dev"',
    hint: 'Combine --init-author-name, --init-author-email, and --init-author-url',
    commandName: 'init',
    commandExplanation: 'Email and URL are only included in the author field if --init-author-name is set. Format: "Name <email> (url)". You can use any combination: name only, name+email, name+url, or all three.',
  });

  tasks.push({
    id: taskId++,
    title: 'Initialize with MIT license',
    description: 'Create a package.json with the license field set to "MIT"',
    expectedCommand: 'npm init --init-license=MIT',
    hint: 'Use --init-license=MIT',
    commandName: 'init',
    commandExplanation: 'The --init-license parameter sets the license field in package.json. Default: ISC. Common values: MIT, ISC, Apache-2.0, GPL-3.0, BSD-3-Clause, Unlicense.',
  });

  tasks.push({
    id: taskId++,
    title: 'Initialize with version 0.1.0',
    description: 'Create a package.json with the initial version set to "0.1.0"',
    expectedCommand: 'npm init --init-version=0.1.0',
    hint: 'Use --init-version with the version number, and -y to skip prompts',
    commandName: 'init',
    commandExplanation: 'The --init-version parameter sets the initial version field in package.json. Default: 1.0.0. Must follow semver format (e.g., 0.1.0, 1.0.0, 2.3.4).',
  });

  tasks.push({
    id: taskId++,
    title: 'Initialize with ES module type',
    description: 'Set the package type to "module" to use ES6 import/export',
    expectedCommand: 'npm init --init-type=module',
    hint: 'Use --init-type=module',
    commandName: 'init',
    commandExplanation: 'The --init-type parameter sets the "type" field in package.json. Allowed values: "module" (uses import/export) or "commonjs" (uses require()). Default: commonjs.',
  });

  tasks.push({
    id: taskId++,
    title: 'Initialize with custom init script',
    description: 'Use a custom initialization script located at ./my-init.js',
    expectedCommand: 'npm init --init-module=./my-init.js',
    hint: 'Use --init-module with a script path, and -y to skip prompts',
    commandName: 'init',
    commandExplanation: 'The --init-module parameter specifies a custom initialization script path. Default: ~/.npm-init.js. The script is run to generate package.json with custom logic.',
  });

  tasks.push({
    id: taskId++,
    title: 'Initialize as private package',
    description: 'Create a package.json with private:true to prevent publishing',
    expectedCommand: 'npm init --init-private',
    hint: 'Use the --init-private flag with',
    commandName: 'init',
    commandExplanation: 'The --init-private flag adds "private": true to package.json, preventing accidental publishing to npm. Default: false (package can be published).',
  });

  // GROUP 3: Scope and Force
  tasks.push({
    id: taskId++,
    title: 'Initialize with scope @acmecorp',
    description: 'Create a package.json with scope set to "@acmecorp"',
    expectedCommand: 'npm init --scope=@acmecorp',
    hint: 'Use --scope=@acmecorp',
    commandName: 'init',
    commandExplanation: 'The --scope parameter sets the package name to @scopename/package-name format, useful for organizations. Default: unscoped package name. Scope must start with @.',
  });

  tasks.push({
    id: taskId++,
    title: 'Force reinitialize package',
    description: 'Create a new package.json, overwriting the existing one if present',
    expectedCommand: 'npm init -f',
    hint: 'Use -f or --force flag',
    commandName: 'init',
    commandExplanation: 'The --force (-f) flag allows npm init to overwrite an existing package.json file without prompting. Use with caution!',
  });

  // GROUP 4: Workspaces
  tasks.push({
    id: taskId++,
    title: 'Initialize in workspace "packages/frontend"',
    description: 'Create package.json in the packages/frontend workspace directory',
    expectedCommand: 'npm init -w packages/frontend',
    hint: 'Use -w with the workspace path',
    commandName: 'init',
    commandExplanation: 'The -w (--workspace) flag initializes a package.json in a specific workspace within a monorepo. The workspace must be defined in the root package.json.',
  });

  tasks.push({
    id: taskId++,
    title: 'Initialize all workspaces',
    description: 'Run npm init for every workspace package in your monorepo',
    expectedCommand: 'npm init --workspaces',
    hint: 'Use the --workspaces flag',
    commandName: 'init',
    commandExplanation: 'The --workspaces flag runs npm init for all workspace packages defined in your root package.json "workspaces" field.',
  });

  tasks.push({
    id: taskId++,
    title: 'Initialize workspace "packages/api" with Vite',
    description: 'Use the Vite initializer to set up the packages/api workspace',
    expectedCommand: 'npm init -w packages/api vite',
    hint: 'Combine -w with an initializer name',
    commandName: 'init',
    commandExplanation: 'You can use initializers within specific workspaces for specialized setups by combining -w and the initializer name.',
  });

  tasks.push({
    id: taskId++,
    title: 'Initialize workspaces including root',
    description: 'Initialize both all workspaces AND the root package.json',
    expectedCommand: 'npm init --workspaces --include-workspace-root',
    hint: 'Combine --workspaces with --include-workspace-root',
    commandName: 'init',
    commandExplanation: 'The --include-workspace-root flag ensures the root package.json is also initialized when using --workspaces.',
  });
  // ========== END INIT TASKS ==========

  // ========== COMPREHENSIVE INSTALL COMMAND TASKS ==========
  // Tasks organized to match npm v11 documentation order
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-install
  // Structure: Basic usage tasks first, then Configuration flags in documentation order
  
  // ===== BASIC INSTALL TASKS (no flags) =====
  tasks.push({
    id: taskId++,
    title: 'Install lodash package',
    description: 'Add the lodash utility library to your project',
    expectedCommand: 'npm install lodash',
    hint: 'Aliases: i, add, in, ins, inst, insta, instal, isnt, isnta, isntal, isntall',
    commandName: 'install',
    commandExplanation: 'Installs a package and adds it to dependencies in package.json. By default, uses the latest version.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install multiple packages',
    description: 'Install both express and body-parser in one command',
    expectedCommand: 'npm install express body-parser',
    hint: 'List packages separated by spaces',
    commandName: 'install',
    commandExplanation: 'You can install multiple packages in a single command by listing them separated by spaces.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install specific version',
    description: 'Install lodash version 4.17.20 exactly',
    expectedCommand: 'npm install lodash@4.17.20',
    hint: 'Use @version after package name',
    commandName: 'install',
    commandExplanation: 'The @version syntax lets you install a specific version. Example: package@1.2.3',
  });

  tasks.push({
    id: taskId++,
    title: 'Install latest version',
    description: 'Install the latest version of react using the @latest tag',
    expectedCommand: 'npm install react@latest',
    hint: 'Use @latest to get the newest version',
    commandName: 'install',
    commandExplanation: 'The @latest tag ensures you get the most recent published version, even if you have an older one installed.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install from folder',
    description: 'Install a package from the local folder ./my-package',
    expectedCommand: 'npm install ./my-package',
    hint: 'Use a relative or absolute folder path',
    commandName: 'install',
    commandExplanation: 'You can install packages from local folders by providing a path. Useful for local development or packages not published to npm.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install from tarball file',
    description: 'Install a package from a local package.tgz file',
    expectedCommand: 'npm install ./package.tgz',
    hint: 'Provide path to a .tgz or .tar.gz file',
    commandName: 'install',
    commandExplanation: 'You can install packages from tarball files created with npm pack. The file must be a .tgz or .tar.gz archive.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install from tarball URL',
    description: 'Install a package from a remote tarball URL (https://example.com/package.tgz)',
    expectedCommand: 'npm install https://example.com/package.tgz',
    hint: 'Use a full HTTPS URL to a tarball file',
    commandName: 'install',
    commandExplanation: 'You can install packages from remote tarball URLs. The URL must point to a .tgz file accessible via HTTPS.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install from git URL',
    description: 'Install a package from git+https://github.com/user/repo.git',
    expectedCommand: 'npm install git+https://github.com/user/repo.git',
    hint: 'Use git+https:// or git+ssh:// URL',
    commandName: 'install',
    commandExplanation: 'You can install packages from git repositories using git+https:// or git+ssh:// URLs. npm will clone the repo and install it.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install from GitHub shortcut',
    description: 'Install lodash using the GitHub username/repo shortcut',
    expectedCommand: 'npm install lodash/lodash',
    hint: 'Format: username/repository',
    commandName: 'install',
    commandExplanation: 'GitHub shortcut syntax: username/repo automatically resolves to github.com. You can add #branch or #tag for specific versions.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install from GitHub with branch',
    description: 'Install lodash from GitHub repo user/repo using the main branch',
    expectedCommand: 'npm install lodash/lodash#main',
    hint: 'Use username/repo#branch-name format',
    commandName: 'install',
    commandExplanation: 'Add #branch-name after the repo to install from a specific branch. Also works with #v1.2.3 for tags.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install from GitLab',
    description: 'Install lodash from GitLab repository gitlab:user/repo',
    expectedCommand: 'npm install gitlab:lodash/lodash',
    hint: 'Use gitlab:username/repository',
    commandName: 'install',
    commandExplanation: 'GitLab shortcut syntax: gitlab:user/repo automatically resolves to gitlab.com. Similar to GitHub shortcuts.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install from gist',
    description: 'Install a package from GitHub gist with ID abc123def456',
    expectedCommand: 'npm install gist:abc123def456',
    hint: 'Use gist:gist-id format',
    commandName: 'install',
    commandExplanation: 'You can install packages from GitHub gists using the gist: prefix followed by the gist ID.',
  });

  // ===== CONFIGURATION FLAGS (in documentation order) =====
  // 1. save (default true, so we show --no-save)
  tasks.push({
    id: taskId++,
    title: 'Install without saving',
    description: 'Install axios without adding it to package.json',
    expectedCommand: 'npm install axios --no-save',
    hint: 'Use --no-save flag',
    commandName: 'install',
    commandExplanation: 'The --no-save flag installs the package but doesn\'t modify package.json. Useful for temporary testing.',
  });

  // 2. save-exact
  tasks.push({
    id: taskId++,
    title: 'Install with exact version',
    description: 'Install react and save the exact version (no ^ or ~)',
    expectedCommand: 'npm install react --save-exact',
    hint: 'Use --save-exact or -E flag',
    commandName: 'install',
    commandExplanation: 'The --save-exact (-E) flag saves the exact version without range operators (^ or ~). Example: "1.2.3" instead of "^1.2.3".',
  });

  // 3. global
  tasks.push({
    id: taskId++,
    title: 'Install globally',
    description: 'Install typescript globally on your system',
    expectedCommand: 'npm install typescript --global',
    hint: 'Use --global or -g flag',
    commandName: 'install',
    commandExplanation: 'The --global (-g) flag installs packages system-wide, making CLI tools available from anywhere. They go to a global directory, not node_modules.',
  });

  // 4. install-strategy
  tasks.push({
    id: taskId++,
    title: 'Install with hoisted strategy',
    description: 'Use hoisted installation strategy (default behavior)',
    expectedCommand: 'npm install --install-strategy=hoisted',
    hint: 'Use --install-strategy with nested, hoisted, shallow, or linked',
    commandName: 'install',
    commandExplanation: 'The --install-strategy option controls how dependencies are installed. hoisted (default): non-duplicated in top-level, duplicated as needed.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install with nested strategy',
    description: 'Install in place without hoisting (formerly --legacy-bundling)',
    expectedCommand: 'npm install --install-strategy=nested',
    hint: 'Use --install-strategy=nested flag',
    commandName: 'install',
    commandExplanation: 'The --install-strategy=nested installs packages in place without hoisting, creating a nested structure like npm v2. Replaces deprecated --legacy-bundling.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install with shallow strategy',
    description: 'Only install direct dependencies at top level (formerly --global-style)',
    expectedCommand: 'npm install --install-strategy=shallow',
    hint: 'Use --install-strategy=shallow flag',
    commandName: 'install',
    commandExplanation: 'The --install-strategy=shallow only installs direct deps at top-level. Replaces deprecated --global-style.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install with linked strategy',
    description: 'Install in node_modules/.store and link in place (experimental)',
    expectedCommand: 'npm install --install-strategy=linked',
    hint: 'Use --install-strategy=linked flag (experimental)',
    commandName: 'install',
    commandExplanation: 'The --install-strategy=linked is experimental: installs in node_modules/.store, links in place, unhoisted.',
  });

  // 5. legacy-bundling (deprecated, covered by install-strategy=nested)
  // 6. global-style (deprecated, covered by install-strategy=shallow)

  // 7. omit
  tasks.push({
    id: taskId++,
    title: 'Install omitting dev dependencies',
    description: 'Install production dependencies only, skip devDependencies',
    expectedCommand: 'npm install --omit=dev',
    hint: 'Use --omit=dev, --omit=optional, or --omit=peer',
    commandName: 'install',
    commandExplanation: 'The --omit flag specifies dependency types to skip. Can be dev, optional, or peer. Common in production deployments.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install omitting peer dependencies',
    description: 'Install but skip peer dependencies',
    expectedCommand: 'npm install --omit=peer',
    hint: 'Use --omit=dev, --omit=optional, or --omit=peer',
    commandName: 'install',
    commandExplanation: 'The --omit=peer flag skips installing peer dependencies. These are packages that should be installed by the consumer.',
  });

  // 8. include
  tasks.push({
    id: taskId++,
    title: 'Install including optional dependencies',
    description: 'Install all dependencies including optional ones',
    expectedCommand: 'npm install --include=optional',
    hint: 'Use --include=dev, --include=optional, or --include=peer',
    commandName: 'install',
    commandExplanation: 'The --include flag specifies dependency types to include. Can be dev, optional, or peer.',
  });

  // 9. strict-peer-deps
  tasks.push({
    id: taskId++,
    title: 'Install with strict peer deps',
    description: 'Fail installation if peer dependencies conflict',
    expectedCommand: 'npm install --strict-peer-deps',
    hint: 'Use --strict-peer-deps flag',
    commandName: 'install',
    commandExplanation: 'The --strict-peer-deps flag causes npm to fail if there are peer dependency conflicts instead of just warning.',
  });

  // 10. prefer-dedupe
  tasks.push({
    id: taskId++,
    title: 'Install with prefer-dedupe',
    description: 'Prefer deduping existing packages over installing new copies',
    expectedCommand: 'npm install --prefer-dedupe',
    hint: 'Use --prefer-dedupe flag',
    commandName: 'install',
    commandExplanation: 'The --prefer-dedupe flag attempts to reuse existing packages in the tree rather than installing duplicates.',
  });

  // 11. package-lock
  tasks.push({
    id: taskId++,
    title: 'Install lodash without package-lock',
    description: 'Install lodash but don\'t read or update package-lock.json',
    expectedCommand: 'npm install lodash --no-package-lock',
    hint: 'Use --no-package-lock flag',
    commandName: 'install',
    commandExplanation: 'The --no-package-lock flag prevents npm from reading or writing package-lock.json. Not recommended for most projects.',
  });

  // 12. package-lock-only
  tasks.push({
    id: taskId++,
    title: 'Update only package-lock',
    description: 'Update package-lock.json without installing packages',
    expectedCommand: 'npm install --package-lock-only',
    hint: 'Use --package-lock-only flag',
    commandName: 'install',
    commandExplanation: 'The --package-lock-only flag only updates package-lock.json without modifying node_modules. Useful for lockfile maintenance.',
  });

  // 13. foreground-scripts
  tasks.push({
    id: taskId++,
    title: 'Install with foreground scripts',
    description: 'Run install scripts in foreground with full output',
    expectedCommand: 'npm install --foreground-scripts',
    hint: 'Use --foreground-scripts flag',
    commandName: 'install',
    commandExplanation: 'The --foreground-scripts flag runs lifecycle scripts in the foreground, showing full output instead of hiding it.',
  });

  // 14. ignore-scripts
  tasks.push({
    id: taskId++,
    title: 'Install without running scripts',
    description: 'Install packages but skip pre/post install scripts',
    expectedCommand: 'npm install --ignore-scripts',
    hint: 'Use --ignore-scripts flag',
    commandName: 'install',
    commandExplanation: 'The --ignore-scripts flag prevents npm from running install scripts defined in packages. Useful for security or when scripts fail.',
  });

  // 15. audit
  tasks.push({
    id: taskId++,
    title: 'Install lodash without audit',
    description: 'Install lodash without checking for vulnerabilities',
    expectedCommand: 'npm install lodash --no-audit',
    hint: 'Use --no-audit flag',
    commandName: 'install',
    commandExplanation: 'The --no-audit flag skips the security audit that normally runs after install. Speeds up installation but you won\'t see vulnerability warnings.',
  });

  // 16. before
  tasks.push({
    id: taskId++,
    title: 'Install versions before date',
    description: 'Install lodash package versions available before specific date 2023-01-01',
    expectedCommand: 'npm install lodash --before=2023-01-01',
    hint: 'Use --before flag with date',
    commandName: 'install',
    commandExplanation: 'The --before flag installs only versions published before the specified date. Useful for reproducing builds from a specific point in time.',
  });

  // 17. bin-links
  tasks.push({
    id: taskId++,
    title: 'Install without bin links',
    description: 'Install packages without creating binary symlinks',
    expectedCommand: 'npm install --no-bin-links',
    hint: 'Use --no-bin-links flag',
    commandName: 'install',
    commandExplanation: 'The --no-bin-links flag prevents npm from creating symlinks for package binaries. Useful on Windows or restricted filesystems.',
  });

  // 18. fund
  tasks.push({
    id: taskId++,
    title: 'Install without funding info',
    description: 'Hide funding messages during installation',
    expectedCommand: 'npm install --no-fund',
    hint: 'Use --no-fund flag',
    commandName: 'install',
    commandExplanation: 'The --no-fund flag suppresses funding messages that npm shows after installation.',
  });

  // 19. dry-run
  tasks.push({
    id: taskId++,
    title: 'Dry run express installation',
    description: 'Preview what would be installed for express without actually installing',
    expectedCommand: 'npm install express --dry-run',
    hint: 'Use --dry-run flag',
    commandName: 'install',
    commandExplanation: 'The --dry-run flag shows what would happen without making changes. Useful for testing before actual installation.',
  });

  // 20. cpu
  tasks.push({
    id: taskId++,
    title: 'Install for specific CPU',
    description: 'Filter packages by CPU architecture (x64)',
    expectedCommand: 'npm install --cpu=x64',
    hint: 'Use --cpu=x64, --cpu=arm64, etc.',
    commandName: 'install',
    commandExplanation: 'The --cpu flag filters packages by required CPU architecture. Common values: x64, arm64, ia32.',
  });

  // 21. os
  tasks.push({
    id: taskId++,
    title: 'Install for specific OS',
    description: 'Filter packages by operating system (linux)',
    expectedCommand: 'npm install --os=linux',
    hint: 'Use --os=linux, --os=darwin, --os=win32, etc.',
    commandName: 'install',
    commandExplanation: 'The --os flag filters packages by required operating system. Common values: linux, darwin (macOS), win32.',
  });

  // 22. libc
  tasks.push({
    id: taskId++,
    title: 'Install for specific libc',
    description: 'Filter packages by libc implementation (glibc)',
    expectedCommand: 'npm install --libc=glibc',
    hint: 'Use --libc=glibc or --libc=musl',
    commandName: 'install',
    commandExplanation: 'The --libc flag filters packages by required C library implementation. Common values: glibc, musl.',
  });

  // 23. workspace
  tasks.push({
    id: taskId++,
    title: 'Install in specific workspace',
    description: 'Install lodash in the packages/frontend workspace',
    expectedCommand: 'npm install lodash --workspace=packages/frontend',
    hint: 'Use --workspace or -w flag',
    commandName: 'install',
    commandExplanation: 'The --workspace (-w) flag installs packages in a specific workspace within a monorepo. The workspace must be defined in root package.json.',
  });

  // 24. workspaces
  tasks.push({
    id: taskId++,
    title: 'Install in all workspaces',
    description: 'Install lodash in every workspace package',
    expectedCommand: 'npm install lodash --workspaces',
    hint: 'Use --workspaces flag',
    commandName: 'install',
    commandExplanation: 'The --workspaces flag installs the package in all workspaces defined in your monorepo.',
  });

  // 25. include-workspace-root
  tasks.push({
    id: taskId++,
    title: 'Install in workspace root',
    description: 'Install lodash in all workspaces including the root package',
    expectedCommand: 'npm install lodash --workspaces --include-workspace-root',
    hint: 'Use --include-workspace-root with --workspaces',
    commandName: 'install',
    commandExplanation: 'The --include-workspace-root flag includes the workspace root when using --workspaces, installing in all packages.',
  });

  // 26. install-links
  tasks.push({
    id: taskId++,
    title: 'Install file dependencies as regular packages',
    description: 'Install file: protocol dependencies as regular packages instead of symlinks',
    expectedCommand: 'npm install ./my-package --install-links',
    hint: 'Use --install-links flag',
    commandName: 'install',
    commandExplanation: 'The --install-links flag treats file: protocol dependencies as regular packages (packed and installed) instead of creating symlinks. Useful for testing package behavior.',
  });

  // Additional save-* flags (from description section, not config section)
  tasks.push({
    id: taskId++,
    title: 'Install as dev dependency',
    description: 'Install jest as a development dependency',
    expectedCommand: 'npm install jest --save-dev',
    hint: 'Use --save-dev or -D flag',
    commandName: 'install',
    commandExplanation: 'The --save-dev (-D) flag adds the package to devDependencies. These are only needed during development, not in production.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install as optional dependency',
    description: 'Install fsevents as an optional dependency',
    expectedCommand: 'npm install fsevents --save-optional',
    hint: 'Use --save-optional or -O flag',
    commandName: 'install',
    commandExplanation: 'The --save-optional (-O) flag adds packages to optionalDependencies. Installation continues even if these fail.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install as bundled dependency',
    description: 'Install axios as a production dependency and bundle it for publishing',
    expectedCommand: 'npm install axios --save-prod --save-bundle',
    hint: 'Use --save-prod with --save-bundle (or -B) flag',
    commandName: 'install',
    commandExplanation: 'The --save-bundle (-B) flag is used alongside save flags like --save-prod to add packages to both dependencies and bundleDependencies. Bundled packages are included when you publish.',
  });
  // ========== END INSTALL TASKS ==========

  // ========== COMPREHENSIVE UNINSTALL COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-uninstall
  
  // Basic uninstall tasks (no flags)
  tasks.push({
    id: taskId++,
    title: 'Uninstall lodash package',
    description: 'Remove lodash from your project',
    expectedCommand: 'npm uninstall lodash',
    hint: 'Aliases: remove, rm, r, un, unlink',
    commandName: 'uninstall',
    commandExplanation: 'Removes a package from node_modules and removes it from dependencies in package.json.',
  });

  tasks.push({
    id: taskId++,
    title: 'Uninstall multiple packages',
    description: 'Remove both express and body-parser in one command',
    expectedCommand: 'npm uninstall express body-parser',
    hint: 'List packages separated by spaces',
    commandName: 'uninstall',
    commandExplanation: 'You can uninstall multiple packages in a single command by listing them separated by spaces.',
  });

  // Configuration flags (in documentation order)
  // 1. global
  tasks.push({
    id: taskId++,
    title: 'Uninstall globally',
    description: 'Remove typescript that was installed globally',
    expectedCommand: 'npm uninstall typescript --global',
    hint: 'Use --global or -g flag',
    commandName: 'uninstall',
    commandExplanation: 'The --global (-g) flag uninstalls packages that were installed system-wide.',
  });

  // 2. workspace
  tasks.push({
    id: taskId++,
    title: 'Uninstall from specific workspace',
    description: 'Remove lodash from the packages/frontend workspace',
    expectedCommand: 'npm uninstall lodash --workspace=packages/frontend',
    hint: 'Use --workspace or -w flag',
    commandName: 'uninstall',
    commandExplanation: 'The --workspace (-w) flag uninstalls packages from a specific workspace within a monorepo.',
  });

  // 3. workspaces
  tasks.push({
    id: taskId++,
    title: 'Uninstall from all workspaces',
    description: 'Remove lodash from every workspace package',
    expectedCommand: 'npm uninstall lodash --workspaces',
    hint: 'Use --workspaces flag',
    commandName: 'uninstall',
    commandExplanation: 'The --workspaces flag uninstalls the package from all workspaces defined in your monorepo.',
  });

  // 4. include-workspace-root
  tasks.push({
    id: taskId++,
    title: 'Uninstall from workspaces including root',
    description: 'Remove axios from all workspaces and the root package',
    expectedCommand: 'npm uninstall axios --workspaces --include-workspace-root',
    hint: 'Use --include-workspace-root with --workspaces',
    commandName: 'uninstall',
    commandExplanation: 'The --include-workspace-root flag includes the workspace root when using --workspaces.',
  });
  // ========== END UNINSTALL TASKS ==========

  // ========== COMPREHENSIVE CI COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-ci
  
  // Basic ci task (no flags)
  tasks.push({
    id: taskId++,
    title: 'Clean install from lock file',
    description: 'Delete node_modules and install from package-lock.json',
    expectedCommand: 'npm ci',
    hint: 'Aliases: clean-install, ic, install-clean, isntall-clean',
    commandName: 'ci',
    commandExplanation: 'Removes node_modules and does a clean install from package-lock.json. Faster and more reliable than npm install in CI/CD.',
  });

  // Configuration flags (in documentation order)
  // 1. install-strategy
  tasks.push({
    id: taskId++,
    title: 'Clean install with nested strategy',
    description: 'Use npm ci with nested installation strategy',
    expectedCommand: 'npm ci --install-strategy=nested',
    hint: 'Use --install-strategy with nested, hoisted, shallow, or linked',
    commandName: 'ci',
    commandExplanation: 'The --install-strategy flag controls how dependencies are installed during clean install.',
  });

  // 2. legacy-bundling
  tasks.push({
    id: taskId++,
    title: 'Clean install with legacy bundling',
    description: 'Use npm ci with npm v2 bundling behavior',
    expectedCommand: 'npm ci --legacy-bundling',
    hint: 'Use --legacy-bundling flag (deprecated, use --install-strategy=nested)',
    commandName: 'ci',
    commandExplanation: 'The --legacy-bundling flag uses npm v2 installation style. Deprecated in favor of --install-strategy=nested.',
  });

  // 3. global-style
  tasks.push({
    id: taskId++,
    title: 'Clean install with global style',
    description: 'Use npm ci with global-style installation',
    expectedCommand: 'npm ci --global-style',
    hint: 'Use --global-style flag (deprecated, use --install-strategy=shallow)',
    commandName: 'ci',
    commandExplanation: 'The --global-style flag installs only direct dependencies at top level. Deprecated in favor of --install-strategy=shallow.',
  });

  // 4. omit
  tasks.push({
    id: taskId++,
    title: 'Clean install omitting dev dependencies',
    description: 'Run npm ci but skip devDependencies',
    expectedCommand: 'npm ci --omit=dev',
    hint: 'Use --omit=dev, --omit=optional, or --omit=peer',
    commandName: 'ci',
    commandExplanation: 'The --omit flag skips certain dependency types. Common in production deployments.',
  });

  // 5. strict-peer-deps
  tasks.push({
    id: taskId++,
    title: 'Clean install with strict peer deps',
    description: 'Fail npm ci if peer dependencies conflict',
    expectedCommand: 'npm ci --strict-peer-deps',
    hint: 'Use --strict-peer-deps flag',
    commandName: 'ci',
    commandExplanation: 'The --strict-peer-deps flag causes npm ci to fail on peer dependency conflicts.',
  });

  // 6. foreground-scripts
  tasks.push({
    id: taskId++,
    title: 'Clean install with foreground scripts',
    description: 'Run npm ci with scripts in foreground',
    expectedCommand: 'npm ci --foreground-scripts',
    hint: 'Use --foreground-scripts flag',
    commandName: 'ci',
    commandExplanation: 'The --foreground-scripts flag runs lifecycle scripts in the foreground with full output.',
  });

  // 7. ignore-scripts
  tasks.push({
    id: taskId++,
    title: 'Clean install without running scripts',
    description: 'Run npm ci but skip install scripts',
    expectedCommand: 'npm ci --ignore-scripts',
    hint: 'Use --ignore-scripts flag',
    commandName: 'ci',
    commandExplanation: 'The --ignore-scripts flag prevents npm from running install scripts. Useful for security.',
  });

  // 8. audit
  tasks.push({
    id: taskId++,
    title: 'Clean install without audit',
    description: 'Run npm ci without security audit',
    expectedCommand: 'npm ci --no-audit',
    hint: 'Use --no-audit flag',
    commandName: 'ci',
    commandExplanation: 'The --no-audit flag skips the security audit during clean install.',
  });

  // 9. dry-run
  tasks.push({
    id: taskId++,
    title: 'Dry run clean install',
    description: 'Preview what npm ci would do without making changes',
    expectedCommand: 'npm ci --dry-run',
    hint: 'Use --dry-run flag',
    commandName: 'ci',
    commandExplanation: 'The --dry-run flag shows what would happen without actually performing the clean install.',
  });

  // 10. fund
  tasks.push({
    id: taskId++,
    title: 'Clean install without funding info',
    description: 'Run npm ci without displaying funding information',
    expectedCommand: 'npm ci --no-fund',
    hint: 'Use --no-fund flag',
    commandName: 'ci',
    commandExplanation: 'The --no-fund flag suppresses funding messages during clean install.',
  });

  // 11. workspace
  tasks.push({
    id: taskId++,
    title: 'Clean install in specific workspace',
    description: 'Run npm ci in the packages/frontend workspace',
    expectedCommand: 'npm ci --workspace=packages/frontend',
    hint: 'Use --workspace or -w flag',
    commandName: 'ci',
    commandExplanation: 'The --workspace (-w) flag runs npm ci in a specific workspace within a monorepo.',
  });

  // 12. workspaces
  tasks.push({
    id: taskId++,
    title: 'Clean install all workspaces',
    description: 'Run npm ci in every workspace package',
    expectedCommand: 'npm ci --workspaces',
    hint: 'Use --workspaces flag',
    commandName: 'ci',
    commandExplanation: 'The --workspaces flag runs npm ci in all workspaces defined in your monorepo.',
  });

  // 13. include-workspace-root
  tasks.push({
    id: taskId++,
    title: 'Clean install workspaces including root',
    description: 'Run npm ci in all workspaces and the root package',
    expectedCommand: 'npm ci --workspaces --include-workspace-root',
    hint: 'Use --include-workspace-root with --workspaces',
    commandName: 'ci',
    commandExplanation: 'The --include-workspace-root flag includes the workspace root when using --workspaces with npm ci.',
  });
  // ========== END CI TASKS ==========

  // ========== COMPREHENSIVE UPDATE COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-update
  
  // Basic update tasks (no flags)
  tasks.push({
    id: taskId++,
    title: 'Update all packages',
    description: 'Update all packages to their latest compatible versions',
    expectedCommand: 'npm update',
    hint: 'Aliases: up, upgrade, udpate',
    commandName: 'update',
    commandExplanation: 'Updates all packages to the latest version that satisfies the semver ranges in package.json.',
  });

  tasks.push({
    id: taskId++,
    title: 'Update specific package',
    description: 'Update lodash to its latest compatible version',
    expectedCommand: 'npm update lodash',
    hint: 'Specify package name after update command',
    commandName: 'update',
    commandExplanation: 'Updates a specific package to the latest version allowed by package.json semver range.',
  });

  // Configuration flags (in documentation order)
  // 1. save (default true, so we show --no-save)
  tasks.push({
    id: taskId++,
    title: 'Update without saving',
    description: 'Update packages without modifying package.json',
    expectedCommand: 'npm update --no-save',
    hint: 'Use --no-save flag',
    commandName: 'update',
    commandExplanation: 'The --no-save flag updates packages in node_modules but doesn\'t update package.json.',
  });

  // 2. global
  tasks.push({
    id: taskId++,
    title: 'Update global packages',
    description: 'Update all globally installed packages',
    expectedCommand: 'npm update --global',
    hint: 'Use --global or -g flag',
    commandName: 'update',
    commandExplanation: 'The --global (-g) flag updates packages that were installed system-wide.',
  });

  // 3. install-strategy
  tasks.push({
    id: taskId++,
    title: 'Update with nested strategy',
    description: 'Update packages using nested installation strategy',
    expectedCommand: 'npm update --install-strategy=nested',
    hint: 'Use --install-strategy with nested, hoisted, shallow, or linked',
    commandName: 'update',
    commandExplanation: 'The --install-strategy flag controls how dependencies are organized during update.',
  });

  // 4. legacy-bundling
  tasks.push({
    id: taskId++,
    title: 'Update with legacy bundling',
    description: 'Update packages with npm v2 bundling behavior',
    expectedCommand: 'npm update --legacy-bundling',
    hint: 'Use --legacy-bundling flag (deprecated, use --install-strategy=nested)',
    commandName: 'update',
    commandExplanation: 'The --legacy-bundling flag uses npm v2 installation style during update. Deprecated.',
  });

  // 5. global-style
  tasks.push({
    id: taskId++,
    title: 'Update with global style',
    description: 'Update with only direct dependencies at top level',
    expectedCommand: 'npm update --global-style',
    hint: 'Use --global-style flag (deprecated, use --install-strategy=shallow)',
    commandName: 'update',
    commandExplanation: 'The --global-style flag installs only direct deps at top-level during update. Deprecated.',
  });

  // 6. omit
  tasks.push({
    id: taskId++,
    title: 'Update omitting dev dependencies',
    description: 'Update production dependencies only',
    expectedCommand: 'npm update --omit=dev',
    hint: 'Use --omit=dev, --omit=optional, or --omit=peer',
    commandName: 'update',
    commandExplanation: 'The --omit flag skips updating certain dependency types.',
  });

  // 7. include
  tasks.push({
    id: taskId++,
    title: 'Update including optional dependencies',
    description: 'Update all dependencies including optional ones',
    expectedCommand: 'npm update --include=optional',
    hint: 'Use --include=dev, --include=optional, or --include=peer',
    commandName: 'update',
    commandExplanation: 'The --include flag specifies dependency types to include in update.',
  });

  // 8. strict-peer-deps
  tasks.push({
    id: taskId++,
    title: 'Update with strict peer deps',
    description: 'Fail update if peer dependencies conflict',
    expectedCommand: 'npm update --strict-peer-deps',
    hint: 'Use --strict-peer-deps flag',
    commandName: 'update',
    commandExplanation: 'The --strict-peer-deps flag causes npm update to fail on peer dependency conflicts.',
  });

  // 9. package-lock
  tasks.push({
    id: taskId++,
    title: 'Update without package-lock',
    description: 'Update packages without modifying package-lock.json',
    expectedCommand: 'npm update --no-package-lock',
    hint: 'Use --no-package-lock flag',
    commandName: 'update',
    commandExplanation: 'The --no-package-lock flag prevents npm from updating package-lock.json.',
  });

  // 10. foreground-scripts
  tasks.push({
    id: taskId++,
    title: 'Update with foreground scripts',
    description: 'Run update with scripts in foreground',
    expectedCommand: 'npm update --foreground-scripts',
    hint: 'Use --foreground-scripts flag',
    commandName: 'update',
    commandExplanation: 'The --foreground-scripts flag runs lifecycle scripts in the foreground during update.',
  });

  // 11. ignore-scripts
  tasks.push({
    id: taskId++,
    title: 'Update without running scripts',
    description: 'Update packages but skip install scripts',
    expectedCommand: 'npm update --ignore-scripts',
    hint: 'Use --ignore-scripts flag',
    commandName: 'update',
    commandExplanation: 'The --ignore-scripts flag prevents npm from running install scripts during update.',
  });

  // 12. audit
  tasks.push({
    id: taskId++,
    title: 'Update without audit',
    description: 'Update packages without security audit',
    expectedCommand: 'npm update --no-audit',
    hint: 'Use --no-audit flag',
    commandName: 'update',
    commandExplanation: 'The --no-audit flag skips the security audit during update.',
  });

  // 13. before
  tasks.push({
    id: taskId++,
    title: 'Update to versions before date',
    description: 'Update to versions published before 2023-01-01',
    expectedCommand: 'npm update --before=2023-01-01',
    hint: 'Use --before flag with date',
    commandName: 'update',
    commandExplanation: 'The --before flag only updates to versions published before the specified date.',
  });

  // 14. bin-links
  tasks.push({
    id: taskId++,
    title: 'Update without bin links',
    description: 'Update packages without creating binary symlinks',
    expectedCommand: 'npm update --no-bin-links',
    hint: 'Use --no-bin-links flag',
    commandName: 'update',
    commandExplanation: 'The --no-bin-links flag prevents npm from creating symlinks for binaries during update.',
  });

  // 15. fund
  tasks.push({
    id: taskId++,
    title: 'Update without funding info',
    description: 'Update packages without displaying funding information',
    expectedCommand: 'npm update --no-fund',
    hint: 'Use --no-fund flag',
    commandName: 'update',
    commandExplanation: 'The --no-fund flag suppresses funding messages during update.',
  });

  // 16. dry-run
  tasks.push({
    id: taskId++,
    title: 'Dry run update',
    description: 'Preview what would be updated without making changes',
    expectedCommand: 'npm update --dry-run',
    hint: 'Use --dry-run flag',
    commandName: 'update',
    commandExplanation: 'The --dry-run flag shows what would happen without actually updating packages.',
  });

  // 17. workspace
  tasks.push({
    id: taskId++,
    title: 'Update in specific workspace',
    description: 'Update packages in the packages/frontend workspace',
    expectedCommand: 'npm update --workspace=packages/frontend',
    hint: 'Use --workspace or -w flag',
    commandName: 'update',
    commandExplanation: 'The --workspace (-w) flag updates packages in a specific workspace within a monorepo.',
  });

  // 18. workspaces
  tasks.push({
    id: taskId++,
    title: 'Update all workspaces',
    description: 'Update packages in every workspace',
    expectedCommand: 'npm update --workspaces',
    hint: 'Use --workspaces flag',
    commandName: 'update',
    commandExplanation: 'The --workspaces flag updates packages in all workspaces defined in your monorepo.',
  });

  // 19. include-workspace-root
  tasks.push({
    id: taskId++,
    title: 'Update workspaces including root',
    description: 'Update packages in all workspaces and the root',
    expectedCommand: 'npm update --workspaces --include-workspace-root',
    hint: 'Use --include-workspace-root with --workspaces',
    commandName: 'update',
    commandExplanation: 'The --include-workspace-root flag includes the workspace root when using --workspaces.',
  });

  // 20. install-links
  tasks.push({
    id: taskId++,
    title: 'Update with install-links',
    description: 'Update and pack file: dependencies instead of symlinking',
    expectedCommand: 'npm update --install-links',
    hint: 'Use --install-links flag',
    commandName: 'update',
    commandExplanation: 'The --install-links flag treats file: protocol dependencies as regular packages during update.',
  });
  // ========== END UPDATE TASKS ==========

  // ========== COMPREHENSIVE LIST COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-list
  
  // Basic list task (no flags)
  tasks.push({
    id: taskId++,
    title: 'List installed packages',
    description: 'Show a tree of all installed packages',
    expectedCommand: 'npm list',
    hint: 'Aliases: ls, ll, la',
    commandName: 'list',
    commandExplanation: 'Displays a tree of installed packages and their dependencies.',
  });

  // Configuration flags (in documentation order)
  // 1. all
  tasks.push({
    id: taskId++,
    title: 'List all dependencies',
    description: 'Show all dependencies including transitive ones',
    expectedCommand: 'npm list --all',
    hint: 'Use --all or -a flag',
    commandName: 'list',
    commandExplanation: 'The --all (-a) flag shows all dependencies without depth limit.',
  });

  // 2. json
  tasks.push({
    id: taskId++,
    title: 'List packages as JSON',
    description: 'Output package list in JSON format',
    expectedCommand: 'npm list --json',
    hint: 'Use --json flag',
    commandName: 'list',
    commandExplanation: 'The --json flag outputs the package tree as JSON for programmatic use.',
  });

  // 3. long
  tasks.push({
    id: taskId++,
    title: 'List with extended information',
    description: 'Show package list with additional details',
    expectedCommand: 'npm list --long',
    hint: 'Use --long or -l flag',
    commandName: 'list',
    commandExplanation: 'The --long (-l) flag shows extended information like description and homepage.',
  });

  // 4. parseable
  tasks.push({
    id: taskId++,
    title: 'List in parseable format',
    description: 'Output package list as parseable lines',
    expectedCommand: 'npm list --parseable',
    hint: 'Use --parseable or -p flag',
    commandName: 'list',
    commandExplanation: 'The --parseable (-p) flag outputs packages as newline-delimited paths.',
  });

  // 5. global
  tasks.push({
    id: taskId++,
    title: 'List global packages',
    description: 'Show all globally installed packages',
    expectedCommand: 'npm list --global',
    hint: 'Use --global or -g flag',
    commandName: 'list',
    commandExplanation: 'The --global (-g) flag lists packages installed system-wide.',
  });

  // 6. depth
  tasks.push({
    id: taskId++,
    title: 'List with depth limit',
    description: 'Show packages up to depth 1',
    expectedCommand: 'npm list --depth=1',
    hint: 'Use --depth with a number',
    commandName: 'list',
    commandExplanation: 'The --depth flag limits how deep the dependency tree is displayed.',
  });

  // 7. omit
  tasks.push({
    id: taskId++,
    title: 'List omitting dev dependencies',
    description: 'Show only production dependencies',
    expectedCommand: 'npm list --omit=dev',
    hint: 'Use --omit=dev, --omit=optional, or --omit=peer',
    commandName: 'list',
    commandExplanation: 'The --omit flag excludes certain dependency types from the list.',
  });

  // 8. include
  tasks.push({
    id: taskId++,
    title: 'List including optional dependencies',
    description: 'Show all dependencies including optional ones',
    expectedCommand: 'npm list --include=optional',
    hint: 'Use --include=dev, --include=optional, or --include=peer',
    commandName: 'list',
    commandExplanation: 'The --include flag specifies dependency types to include in the list.',
  });

  // 9. link
  tasks.push({
    id: taskId++,
    title: 'List only linked packages',
    description: 'Show only packages that are symlinked',
    expectedCommand: 'npm list --link',
    hint: 'Use --link flag',
    commandName: 'list',
    commandExplanation: 'The --link flag shows only packages installed via npm link.',
  });

  // 10. package-lock-only
  tasks.push({
    id: taskId++,
    title: 'List from package-lock only',
    description: 'Show packages based on package-lock.json',
    expectedCommand: 'npm list --package-lock-only',
    hint: 'Use --package-lock-only flag',
    commandName: 'list',
    commandExplanation: 'The --package-lock-only flag uses package-lock.json instead of reading node_modules.',
  });

  // 11. unicode
  tasks.push({
    id: taskId++,
    title: 'List without unicode',
    description: 'Show package tree without unicode characters',
    expectedCommand: 'npm list --no-unicode',
    hint: 'Use --no-unicode flag',
    commandName: 'list',
    commandExplanation: 'The --no-unicode flag uses ASCII characters instead of unicode for the tree.',
  });

  // 12. workspace
  tasks.push({
    id: taskId++,
    title: 'List specific workspace',
    description: 'Show packages in the packages/frontend workspace',
    expectedCommand: 'npm list --workspace=packages/frontend',
    hint: 'Use --workspace or -w flag',
    commandName: 'list',
    commandExplanation: 'The --workspace (-w) flag lists packages in a specific workspace.',
  });

  // 13. workspaces
  tasks.push({
    id: taskId++,
    title: 'List all workspaces',
    description: 'Show packages in every workspace',
    expectedCommand: 'npm list --workspaces',
    hint: 'Use --workspaces or -ws flag',
    commandName: 'list',
    commandExplanation: 'The --workspaces flag lists packages in all workspaces.',
  });

  // 14. include-workspace-root
  tasks.push({
    id: taskId++,
    title: 'List workspaces including root',
    description: 'Show packages in all workspaces and the root',
    expectedCommand: 'npm list --workspaces --include-workspace-root',
    hint: 'Use --include-workspace-root with --workspaces',
    commandName: 'list',
    commandExplanation: 'The --include-workspace-root flag includes the workspace root when using --workspaces.',
  });

  // 15. install-links
  tasks.push({
    id: taskId++,
    title: 'List including symlinked packages',
    description: 'Show file: dependencies in the list',
    expectedCommand: 'npm list --install-links',
    hint: 'Use --install-links flag',
    commandName: 'list',
    commandExplanation: 'The --install-links flag includes symlinked file: dependencies in the list.',
  });
  // ========== END LIST TASKS ==========

  // ========== COMPREHENSIVE OUTDATED COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-outdated
  
  // Basic outdated task (no flags)
  tasks.push({
    id: taskId++,
    title: 'Check for outdated packages',
    description: 'See which packages have newer versions available',
    expectedCommand: 'npm outdated',
    hint: 'Shows Current, Wanted, and Latest versions',
    commandName: 'outdated',
    commandExplanation: 'Checks for packages that have newer versions available and shows current vs wanted vs latest.',
  });

  // Configuration flags (in documentation order)
  // 1. all
  tasks.push({
    id: taskId++,
    title: 'Check all packages for updates',
    description: 'Show all outdated packages including transitive',
    expectedCommand: 'npm outdated --all',
    hint: 'Use --all or -a flag',
    commandName: 'outdated',
    commandExplanation: 'The --all (-a) flag shows all outdated packages without depth limit.',
  });

  // 2. json
  tasks.push({
    id: taskId++,
    title: 'Outdated packages as JSON',
    description: 'Output outdated packages in JSON format',
    expectedCommand: 'npm outdated --json',
    hint: 'Use --json flag',
    commandName: 'outdated',
    commandExplanation: 'The --json flag outputs outdated packages as JSON for programmatic use.',
  });

  // 3. long
  tasks.push({
    id: taskId++,
    title: 'Outdated with extended info',
    description: 'Show outdated packages with additional details',
    expectedCommand: 'npm outdated --long',
    hint: 'Use --long or -l flag',
    commandName: 'outdated',
    commandExplanation: 'The --long (-l) flag shows extended information about outdated packages.',
  });

  // 4. parseable
  tasks.push({
    id: taskId++,
    title: 'Outdated in parseable format',
    description: 'Output outdated packages as parseable lines',
    expectedCommand: 'npm outdated --parseable',
    hint: 'Use --parseable or -p flag',
    commandName: 'outdated',
    commandExplanation: 'The --parseable (-p) flag outputs outdated packages in a line-based format.',
  });

  // 5. global
  tasks.push({
    id: taskId++,
    title: 'Check global packages',
    description: 'Show outdated globally installed packages',
    expectedCommand: 'npm outdated --global',
    hint: 'Use --global or -g flag',
    commandName: 'outdated',
    commandExplanation: 'The --global (-g) flag checks for outdated packages installed system-wide.',
  });

  // 6. before
  tasks.push({
    id: taskId++,
    title: 'Outdated before date',
    description: 'Show versions published before 2023-01-01',
    expectedCommand: 'npm outdated --before=2023-01-01',
    hint: 'Use --before flag with date',
    commandName: 'outdated',
    commandExplanation: 'The --before flag only shows versions published before the specified date.',
  });

  // 7. workspace
  tasks.push({
    id: taskId++,
    title: 'Check specific workspace',
    description: 'Show outdated packages in packages/frontend',
    expectedCommand: 'npm outdated --workspace=packages/frontend',
    hint: 'Use --workspace or -w flag',
    commandName: 'outdated',
    commandExplanation: 'The --workspace (-w) flag checks for outdated packages in a specific workspace.',
  });

  // 8. workspaces
  tasks.push({
    id: taskId++,
    title: 'Check all workspaces',
    description: 'Show outdated packages in every workspace',
    expectedCommand: 'npm outdated --workspaces',
    hint: 'Use --workspaces flag',
    commandName: 'outdated',
    commandExplanation: 'The --workspaces flag checks for outdated packages in all workspaces.',
  });
  // ========== END OUTDATED TASKS ==========

  // ========== COMPREHENSIVE AUDIT COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-audit
  
  // Basic audit task (no flags)
  tasks.push({
    id: taskId++,
    title: 'Run security audit',
    description: 'Check for known security vulnerabilities',
    expectedCommand: 'npm audit',
    hint: 'Shows vulnerabilities by severity level',
    commandName: 'audit',
    commandExplanation: 'Scans your dependencies for known security vulnerabilities and shows a report.',
  });

  // Configuration flags (in documentation order)
  // 1. audit-level
  tasks.push({
    id: taskId++,
    title: 'Audit with level threshold',
    description: 'Fail on moderate or higher severity issues',
    expectedCommand: 'npm audit --audit-level=moderate',
    hint: 'Use --audit-level with info, low, moderate, high, or critical',
    commandName: 'audit',
    commandExplanation: 'The --audit-level flag sets the minimum severity level to exit with error.',
  });

  // 2. dry-run
  tasks.push({
    id: taskId++,
    title: 'Audit dry run fixes',
    description: 'Preview what audit fix would do',
    expectedCommand: 'npm audit fix --dry-run',
    hint: 'Use --dry-run flag with audit fix',
    commandName: 'audit',
    commandExplanation: 'The --dry-run flag shows what npm audit fix would change without making modifications.',
  });

  // 3. force
  tasks.push({
    id: taskId++,
    title: 'Force audit fix',
    description: 'Install breaking changes to fix vulnerabilities',
    expectedCommand: 'npm audit fix --force',
    hint: 'Use --force or -f flag',
    commandName: 'audit',
    commandExplanation: 'The --force (-f) flag installs potentially breaking updates to fix vulnerabilities.',
  });

  // 4. json
  tasks.push({
    id: taskId++,
    title: 'Audit report as JSON',
    description: 'Output audit report in JSON format',
    expectedCommand: 'npm audit --json',
    hint: 'Use --json flag',
    commandName: 'audit',
    commandExplanation: 'The --json flag outputs the audit report as JSON for programmatic use.',
  });

  // 5. package-lock-only
  tasks.push({
    id: taskId++,
    title: 'Audit package-lock only',
    description: 'Audit using only package-lock.json',
    expectedCommand: 'npm audit --package-lock-only',
    hint: 'Use --package-lock-only flag',
    commandName: 'audit',
    commandExplanation: 'The --package-lock-only flag audits based on package-lock.json without reading node_modules.',
  });

  // 6. package-lock (--no-package-lock)
  tasks.push({
    id: taskId++,
    title: 'Audit without package-lock',
    description: 'Audit without reading package-lock.json',
    expectedCommand: 'npm audit --no-package-lock',
    hint: 'Use --no-package-lock flag',
    commandName: 'audit',
    commandExplanation: 'The --no-package-lock flag prevents reading package-lock.json during audit.',
  });

  // 7. omit
  tasks.push({
    id: taskId++,
    title: 'Audit omitting dev dependencies',
    description: 'Audit only production dependencies',
    expectedCommand: 'npm audit --omit=dev',
    hint: 'Use --omit=dev, --omit=optional, or --omit=peer',
    commandName: 'audit',
    commandExplanation: 'The --omit flag excludes certain dependency types from the audit.',
  });

  // 8. include
  tasks.push({
    id: taskId++,
    title: 'Audit including optional dependencies',
    description: 'Audit all dependencies including optional',
    expectedCommand: 'npm audit --include=optional',
    hint: 'Use --include=dev, --include=optional, or --include=peer',
    commandName: 'audit',
    commandExplanation: 'The --include flag specifies dependency types to include in the audit.',
  });

  // 9. foreground-scripts
  tasks.push({
    id: taskId++,
    title: 'Audit fix with foreground scripts',
    description: 'Run audit fix with scripts in foreground',
    expectedCommand: 'npm audit fix --foreground-scripts',
    hint: 'Use --foreground-scripts flag',
    commandName: 'audit',
    commandExplanation: 'The --foreground-scripts flag runs lifecycle scripts in the foreground during audit fix.',
  });

  // 10. ignore-scripts
  tasks.push({
    id: taskId++,
    title: 'Audit fix without running scripts',
    description: 'Run audit fix but skip install scripts',
    expectedCommand: 'npm audit fix --ignore-scripts',
    hint: 'Use --ignore-scripts flag',
    commandName: 'audit',
    commandExplanation: 'The --ignore-scripts flag prevents running install scripts during audit fix.',
  });

  // 11. workspace
  tasks.push({
    id: taskId++,
    title: 'Audit specific workspace',
    description: 'Audit packages in packages/frontend',
    expectedCommand: 'npm audit --workspace=packages/frontend',
    hint: 'Use --workspace or -w flag',
    commandName: 'audit',
    commandExplanation: 'The --workspace (-w) flag audits a specific workspace within a monorepo.',
  });

  // 12. workspaces
  tasks.push({
    id: taskId++,
    title: 'Audit all workspaces',
    description: 'Audit packages in every workspace',
    expectedCommand: 'npm audit --workspaces',
    hint: 'Use --workspaces or -ws flag',
    commandName: 'audit',
    commandExplanation: 'The --workspaces flag audits all workspaces defined in your monorepo.',
  });

  // 13. include-workspace-root
  tasks.push({
    id: taskId++,
    title: 'Audit workspaces including root',
    description: 'Audit all workspaces and the root package',
    expectedCommand: 'npm audit --workspaces --include-workspace-root',
    hint: 'Use --include-workspace-root with --workspaces',
    commandName: 'audit',
    commandExplanation: 'The --include-workspace-root flag includes the workspace root when auditing workspaces.',
  });

  // 14. install-links
  tasks.push({
    id: taskId++,
    title: 'Audit fix with install-links',
    description: 'Run audit fix treating file: deps as packages',
    expectedCommand: 'npm audit fix --install-links',
    hint: 'Use --install-links flag',
    commandName: 'audit',
    commandExplanation: 'The --install-links flag treats file: protocol dependencies as regular packages during audit fix.',
  });
  // ========== END AUDIT TASKS ==========

  // ========== COMPREHENSIVE RUN COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-run

  // Basic run tasks (no flags)
  tasks.push({
    id: taskId++,
    title: 'List available scripts',
    description: 'Show all scripts defined in package.json',
    expectedCommand: 'npm run',
    hint: 'Lists all available scripts',
    commandName: 'run',
    commandExplanation: 'Running npm run without arguments lists all available scripts.',
  });

  tasks.push({
    id: taskId++,
    title: 'Run build script',
    description: 'Execute the build script from package.json',
    expectedCommand: 'npm run build',
    hint: 'Use npm run followed by script name',
    commandName: 'run',
    commandExplanation: 'Runs the script defined in the "scripts" section of package.json.',
  });

  tasks.push({
    id: taskId++,
    title: 'Run script with arguments',
    description: 'Run test script with --grep flag',
    expectedCommand: 'npm run test -- --grep="pattern"',
    hint: 'Use -- to pass arguments to the script',
    commandName: 'run',
    commandExplanation: 'Arguments after -- are passed to the script, not to npm.',
  });

  // Configuration flags (in documentation order)
  // 1. workspace
  tasks.push({
    id: taskId++,
    title: 'Run script in specific workspace',
    description: 'Run build in packages/frontend workspace',
    expectedCommand: 'npm run build --workspace=packages/frontend',
    hint: 'Use --workspace or -w flag',
    commandName: 'run',
    commandExplanation: 'The --workspace flag runs the script in a specific workspace.',
  });

  // 2. workspaces
  tasks.push({
    id: taskId++,
    title: 'Run script in all workspaces',
    description: 'Run test script in all workspaces',
    expectedCommand: 'npm run test --workspaces',
    hint: 'Use --workspaces flag',
    commandName: 'run',
    commandExplanation: 'The --workspaces flag runs the script in all configured workspaces.',
  });

  // 3. include-workspace-root
  tasks.push({
    id: taskId++,
    title: 'Include root in workspace runs',
    description: 'Run build in all workspaces including root',
    expectedCommand: 'npm run build --workspaces --include-workspace-root',
    hint: 'Use --include-workspace-root with --workspaces',
    commandName: 'run',
    commandExplanation: 'The --include-workspace-root flag includes the root project when running in workspaces.',
  });

  // 4. if-present
  tasks.push({
    id: taskId++,
    title: 'Run script if present',
    description: 'Run prebuild if it exists, skip otherwise',
    expectedCommand: 'npm run prebuild --if-present',
    hint: 'Use --if-present to avoid errors',
    commandName: 'run',
    commandExplanation: 'The --if-present flag prevents errors when a script is not defined.',
  });

  // 5. ignore-scripts
  tasks.push({
    id: taskId++,
    title: 'Skip pre/post scripts',
    description: 'Run build without prebuild/postbuild',
    expectedCommand: 'npm run build --ignore-scripts',
    hint: 'Use --ignore-scripts flag',
    commandName: 'run',
    commandExplanation: 'The --ignore-scripts flag skips pre- and post- scripts but runs the main script.',
  });

  // 6. foreground-scripts
  tasks.push({
    id: taskId++,
    title: 'Run scripts in foreground',
    description: 'Run build with visible output',
    expectedCommand: 'npm run build --foreground-scripts',
    hint: 'Use --foreground-scripts for debugging',
    commandName: 'run',
    commandExplanation: 'The --foreground-scripts flag runs scripts in the foreground for better visibility.',
  });

  // 7. script-shell
  tasks.push({
    id: taskId++,
    title: 'Use custom shell',
    description: 'Run script using bash',
    expectedCommand: 'npm run build --script-shell=bash',
    hint: 'Use --script-shell with shell path',
    commandName: 'run',
    commandExplanation: 'The --script-shell flag specifies which shell to use for running scripts.',
  });
  // ========== END RUN TASKS ==========

  // ========== COMPREHENSIVE TEST COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-test

  // Basic test task (no flags)
  tasks.push({
    id: taskId++,
    title: 'Run tests',
    description: 'Execute the test script',
    expectedCommand: 'npm test',
    hint: 'Alias: npm t',
    commandName: 'test',
    commandExplanation: 'Runs the "test" script defined in package.json.',
  });

  tasks.push({
    id: taskId++,
    title: 'Run tests with arguments',
    description: 'Pass --verbose to test script',
    expectedCommand: 'npm test -- --verbose',
    hint: 'Use -- to pass args to test',
    commandName: 'test',
    commandExplanation: 'Arguments after -- are passed to the test script.',
  });

  // Configuration flags (in documentation order)
  // 1. ignore-scripts
  tasks.push({
    id: taskId++,
    title: 'Test without pre/post scripts',
    description: 'Run test without pretest/posttest',
    expectedCommand: 'npm test --ignore-scripts',
    hint: 'Use --ignore-scripts flag',
    commandName: 'test',
    commandExplanation: 'The --ignore-scripts flag skips pre- and post- scripts but runs the main test.',
  });

  // 2. script-shell
  tasks.push({
    id: taskId++,
    title: 'Test with custom shell',
    description: 'Run tests using bash',
    expectedCommand: 'npm test --script-shell=bash',
    hint: 'Use --script-shell with shell path',
    commandName: 'test',
    commandExplanation: 'The --script-shell flag specifies which shell to use for running tests.',
  });
  // ========== END TEST TASKS ==========

  // ========== COMPREHENSIVE START COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-start

  // Basic start task (no flags)
  tasks.push({
    id: taskId++,
    title: 'Start application',
    description: 'Execute the start script',
    expectedCommand: 'npm start',
    hint: 'Runs the "start" script or node server.js',
    commandName: 'start',
    commandExplanation: 'Runs the "start" script, or node server.js if no script is defined.',
  });

  tasks.push({
    id: taskId++,
    title: 'Start with arguments',
    description: 'Start with --port=4000 argument',
    expectedCommand: 'npm start -- --port=4000',
    hint: 'Use -- to pass arguments to start',
    commandName: 'start',
    commandExplanation: 'Arguments after -- are passed to the start script.',
  });

  // Configuration flags (in documentation order)
  // 1. ignore-scripts
  tasks.push({
    id: taskId++,
    title: 'Start without pre/post scripts',
    description: 'Start without prestart/poststart',
    expectedCommand: 'npm start --ignore-scripts',
    hint: 'Use --ignore-scripts flag',
    commandName: 'start',
    commandExplanation: 'The --ignore-scripts flag skips pre- and post- scripts but runs the main start.',
  });

  // 2. script-shell
  tasks.push({
    id: taskId++,
    title: 'Start with custom shell',
    description: 'Run start using bash',
    expectedCommand: 'npm start --script-shell=bash',
    hint: 'Use --script-shell with shell path',
    commandName: 'start',
    commandExplanation: 'The --script-shell flag specifies which shell to use for running start.',
  });
  // ========== END START TASKS ==========

  // ========== COMPREHENSIVE STOP COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-stop

  // Basic stop task (no flags)
  tasks.push({
    id: taskId++,
    title: 'Stop application',
    description: 'Execute the stop script',
    expectedCommand: 'npm stop',
    hint: 'Runs the "stop" script',
    commandName: 'stop',
    commandExplanation: 'Runs the "stop" script defined in package.json.',
  });

  tasks.push({
    id: taskId++,
    title: 'Stop with arguments',
    description: 'Stop with --graceful argument',
    expectedCommand: 'npm stop -- --graceful',
    hint: 'Use -- to pass arguments to stop',
    commandName: 'stop',
    commandExplanation: 'Arguments after -- are passed to the stop script.',
  });

  // Configuration flags (in documentation order)
  // 1. ignore-scripts
  tasks.push({
    id: taskId++,
    title: 'Stop without pre/post scripts',
    description: 'Stop without prestop/poststop',
    expectedCommand: 'npm stop --ignore-scripts',
    hint: 'Use --ignore-scripts flag',
    commandName: 'stop',
    commandExplanation: 'The --ignore-scripts flag skips pre- and post- scripts but runs the main stop.',
  });

  // 2. script-shell
  tasks.push({
    id: taskId++,
    title: 'Stop with custom shell',
    description: 'Run stop using bash',
    expectedCommand: 'npm stop --script-shell=bash',
    hint: 'Use --script-shell with shell path',
    commandName: 'stop',
    commandExplanation: 'The --script-shell flag specifies which shell to use for running stop.',
  });
  // ========== END STOP TASKS ==========

  // ========== COMPREHENSIVE RESTART COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-restart

  // Basic restart task (no flags)
  tasks.push({
    id: taskId++,
    title: 'Restart application',
    description: 'Execute the restart script',
    expectedCommand: 'npm restart',
    hint: 'Runs restart or stop+start',
    commandName: 'restart',
    commandExplanation: 'Runs the "restart" script, or runs stop and start scripts if no restart is defined.',
  });

  tasks.push({
    id: taskId++,
    title: 'Restart with arguments',
    description: 'Restart with --clean argument',
    expectedCommand: 'npm restart -- --clean',
    hint: 'Use -- to pass arguments to restart',
    commandName: 'restart',
    commandExplanation: 'Arguments after -- are passed to the restart script.',
  });

  // Configuration flags (in documentation order)
  // 1. ignore-scripts
  tasks.push({
    id: taskId++,
    title: 'Restart without pre/post scripts',
    description: 'Restart without prerestart/postrestart',
    expectedCommand: 'npm restart --ignore-scripts',
    hint: 'Use --ignore-scripts flag',
    commandName: 'restart',
    commandExplanation: 'The --ignore-scripts flag skips pre- and post- scripts but runs the main restart.',
  });

  // 2. script-shell
  tasks.push({
    id: taskId++,
    title: 'Restart with custom shell',
    description: 'Run restart using bash',
    expectedCommand: 'npm restart --script-shell=bash',
    hint: 'Use --script-shell with shell path',
    commandName: 'restart',
    commandExplanation: 'The --script-shell flag specifies which shell to use for running restart.',
  });
  // ========== END RESTART TASKS ==========

  // ========== COMPREHENSIVE INSTALL-TEST COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-install-test

  // Basic install-test tasks (no flags)
  tasks.push({
    id: taskId++,
    title: 'Install and test',
    description: 'Install dependencies then run tests',
    expectedCommand: 'npm install-test',
    hint: 'Alias: npm it',
    commandName: 'install-test',
    commandExplanation: 'Runs npm install followed immediately by npm test.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install package and test',
    description: 'Install lodash then run tests',
    expectedCommand: 'npm install-test lodash',
    hint: 'Takes same args as npm install',
    commandName: 'install-test',
    commandExplanation: 'Installs specified packages then runs tests.',
  });

  // Configuration flags (in documentation order)
  // 1. save (but it defaults to true, so --no-save is the actual use case)
  tasks.push({
    id: taskId++,
    title: 'Install temp and test',
    description: 'Install express without saving, then test',
    expectedCommand: 'npm install-test express --no-save',
    hint: 'Use --no-save to not update package.json',
    commandName: 'install-test',
    commandExplanation: 'The --no-save flag prevents updating package.json.',
  });

  // 2. save-exact
  tasks.push({
    id: taskId++,
    title: 'Install exact version and test',
    description: 'Install with exact version then test',
    expectedCommand: 'npm install-test lodash --save-exact',
    hint: 'Use --save-exact for pinned versions',
    commandName: 'install-test',
    commandExplanation: 'The --save-exact flag saves exact versions without semver ranges.',
  });

  // 3. global
  tasks.push({
    id: taskId++,
    title: 'Install globally and test',
    description: 'Install typescript globally then test',
    expectedCommand: 'npm install-test typescript --global',
    hint: 'Use --global or -g flag',
    commandName: 'install-test',
    commandExplanation: 'The --global flag installs packages globally.',
  });

  // 4. install-strategy (variants: hoisted, nested, shallow, linked)
  tasks.push({
    id: taskId++,
    title: 'Install with hoisted strategy and test',
    description: 'Use hoisted install strategy then test',
    expectedCommand: 'npm install-test --install-strategy=hoisted',
    hint: 'Use --install-strategy with hoisted, nested, shallow, or linked',
    commandName: 'install-test',
    commandExplanation: 'The --install-strategy flag controls how packages are organized in node_modules.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install with nested strategy and test',
    description: 'Use nested install strategy then test',
    expectedCommand: 'npm install-test --install-strategy=nested',
    hint: 'nested creates deep directory structures',
    commandName: 'install-test',
    commandExplanation: 'The nested strategy installs packages in place without hoisting.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install with shallow strategy and test',
    description: 'Use shallow install strategy then test',
    expectedCommand: 'npm install-test --install-strategy=shallow',
    hint: 'shallow only installs direct deps at top level',
    commandName: 'install-test',
    commandExplanation: 'The shallow strategy only installs direct dependencies at the top level.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install with linked strategy and test',
    description: 'Use linked install strategy then test',
    expectedCommand: 'npm install-test --install-strategy=linked',
    hint: 'linked is experimental',
    commandName: 'install-test',
    commandExplanation: 'The linked strategy is experimental and installs in node_modules/.store.',
  });

  // Skipping legacy-bundling and global-style as they're deprecated

  // 5. omit (dev, optional, peer)
  tasks.push({
    id: taskId++,
    title: 'Install without dev deps and test',
    description: 'Omit devDependencies then test',
    expectedCommand: 'npm install-test --omit=dev',
    hint: 'Use --omit with dev, optional, or peer',
    commandName: 'install-test',
    commandExplanation: 'The --omit flag excludes dependency types from installation.',
  });

  tasks.push({
    id: taskId++,
    title: 'Install without peer deps and test',
    description: 'Omit peerDependencies then test',
    expectedCommand: 'npm install-test --omit=peer',
    hint: 'Can omit multiple types',
    commandName: 'install-test',
    commandExplanation: 'The --omit=peer flag excludes peer dependencies.',
  });

  // 6. include
  tasks.push({
    id: taskId++,
    title: 'Install with optional deps and test',
    description: 'Include optionalDependencies then test',
    expectedCommand: 'npm install-test --include=optional',
    hint: 'Use --include with prod, dev, optional, or peer',
    commandName: 'install-test',
    commandExplanation: 'The --include flag specifies dependency types to install.',
  });

  // 7. strict-peer-deps
  tasks.push({
    id: taskId++,
    title: 'Install with strict peers and test',
    description: 'Fail on peer conflicts then test',
    expectedCommand: 'npm install-test --strict-peer-deps',
    hint: 'Use --strict-peer-deps flag',
    commandName: 'install-test',
    commandExplanation: 'The --strict-peer-deps flag treats peer conflicts as errors.',
  });

  // 8. prefer-dedupe
  tasks.push({
    id: taskId++,
    title: 'Install preferring deduplication and test',
    description: 'Prefer existing versions then test',
    expectedCommand: 'npm install-test --prefer-dedupe',
    hint: 'Use --prefer-dedupe flag',
    commandName: 'install-test',
    commandExplanation: 'The --prefer-dedupe flag prefers deduplicating packages over newer versions.',
  });

  // 9. package-lock (--no-package-lock is the use case)
  tasks.push({
    id: taskId++,
    title: 'Install without lockfile and test',
    description: 'Skip package-lock.json then test',
    expectedCommand: 'npm install-test --no-package-lock',
    hint: 'Use --no-package-lock to ignore lockfile',
    commandName: 'install-test',
    commandExplanation: 'The --no-package-lock flag ignores and prevents writing package-lock.json.',
  });

  // 10. package-lock-only
  tasks.push({
    id: taskId++,
    title: 'Update lockfile only and test',
    description: 'Only update package-lock.json then test',
    expectedCommand: 'npm install-test --package-lock-only',
    hint: 'Use --package-lock-only flag',
    commandName: 'install-test',
    commandExplanation: 'The --package-lock-only flag only uses the lockfile, ignoring node_modules.',
  });

  // 11. foreground-scripts
  tasks.push({
    id: taskId++,
    title: 'Install with foreground scripts and test',
    description: 'Show all script output then test',
    expectedCommand: 'npm install-test --foreground-scripts',
    hint: 'Use --foreground-scripts for debugging',
    commandName: 'install-test',
    commandExplanation: 'The --foreground-scripts flag runs scripts in foreground for visibility.',
  });

  // 12. ignore-scripts
  tasks.push({
    id: taskId++,
    title: 'Install without scripts and test',
    description: 'Skip install scripts then test',
    expectedCommand: 'npm install-test --ignore-scripts',
    hint: 'Use --ignore-scripts flag',
    commandName: 'install-test',
    commandExplanation: 'The --ignore-scripts flag prevents running lifecycle scripts.',
  });

  // 13. audit (--no-audit is the use case)
  tasks.push({
    id: taskId++,
    title: 'Install without audit and test',
    description: 'Skip security audit then test',
    expectedCommand: 'npm install-test --no-audit',
    hint: 'Use --no-audit to skip vulnerability checks',
    commandName: 'install-test',
    commandExplanation: 'The --no-audit flag skips the security audit.',
  });

  // 14. before
  tasks.push({
    id: taskId++,
    title: 'Install before date and test',
    description: 'Install versions before 2023-01-01 then test',
    expectedCommand: 'npm install-test --before=2023-01-01',
    hint: 'Use --before with a date',
    commandName: 'install-test',
    commandExplanation: 'The --before flag installs versions available before specified date.',
  });

  // 15. bin-links (--no-bin-links is the use case)
  tasks.push({
    id: taskId++,
    title: 'Install without bin links and test',
    description: 'Skip creating executable symlinks then test',
    expectedCommand: 'npm install-test --no-bin-links',
    hint: 'Use --no-bin-links flag',
    commandName: 'install-test',
    commandExplanation: 'The --no-bin-links flag prevents creating symlinks for executables.',
  });

  // 16. fund (--no-fund is the use case)
  tasks.push({
    id: taskId++,
    title: 'Install without fund message and test',
    description: 'Hide funding messages then test',
    expectedCommand: 'npm install-test --no-fund',
    hint: 'Use --no-fund to hide funding info',
    commandName: 'install-test',
    commandExplanation: 'The --no-fund flag suppresses funding messages.',
  });

  // 17. dry-run
  tasks.push({
    id: taskId++,
    title: 'Dry run install and test',
    description: 'Simulate install without changes then test',
    expectedCommand: 'npm install-test --dry-run',
    hint: 'Use --dry-run to preview changes',
    commandName: 'install-test',
    commandExplanation: 'The --dry-run flag shows what would happen without making changes.',
  });

  // 18. cpu
  tasks.push({
    id: taskId++,
    title: 'Install for specific CPU and test',
    description: 'Override CPU architecture then test',
    expectedCommand: 'npm install-test --cpu=x64',
    hint: 'Use --cpu with architecture',
    commandName: 'install-test',
    commandExplanation: 'The --cpu flag overrides CPU architecture for native modules.',
  });

  // 19. os
  tasks.push({
    id: taskId++,
    title: 'Install for specific OS and test',
    description: 'Override OS platform then test',
    expectedCommand: 'npm install-test --os=linux',
    hint: 'Use --os with platform',
    commandName: 'install-test',
    commandExplanation: 'The --os flag overrides OS platform for native modules.',
  });

  // 20. libc
  tasks.push({
    id: taskId++,
    title: 'Install for specific libc and test',
    description: 'Override libc variant then test',
    expectedCommand: 'npm install-test --libc=glibc',
    hint: 'Use --libc with variant',
    commandName: 'install-test',
    commandExplanation: 'The --libc flag overrides libc for native modules.',
  });

  // 21. workspace
  tasks.push({
    id: taskId++,
    title: 'Install in workspace and test',
    description: 'Install in packages/frontend then test',
    expectedCommand: 'npm install-test --workspace=packages/frontend',
    hint: 'Use --workspace or -w flag',
    commandName: 'install-test',
    commandExplanation: 'The --workspace flag runs install-test in a specific workspace.',
  });

  // 22. workspaces
  tasks.push({
    id: taskId++,
    title: 'Install in all workspaces and test',
    description: 'Install in every workspace then test',
    expectedCommand: 'npm install-test --workspaces',
    hint: 'Use --workspaces flag',
    commandName: 'install-test',
    commandExplanation: 'The --workspaces flag runs install-test in all workspaces.',
  });

  // 23. include-workspace-root
  tasks.push({
    id: taskId++,
    title: 'Install with root workspace and test',
    description: 'Include root in workspace installs then test',
    expectedCommand: 'npm install-test --workspaces --include-workspace-root',
    hint: 'Use --include-workspace-root with --workspaces',
    commandName: 'install-test',
    commandExplanation: 'The --include-workspace-root flag includes the root project when running in workspaces.',
  });

  // 24. install-links
  tasks.push({
    id: taskId++,
    title: 'Install file deps as packages and test',
    description: 'Pack file: deps instead of symlinking then test',
    expectedCommand: 'npm install-test --install-links',
    hint: 'Use --install-links flag',
    commandName: 'install-test',
    commandExplanation: 'The --install-links flag treats file: protocol dependencies as regular packages.',
  });
  // ========== END INSTALL-TEST TASKS ==========

  // ========== COMPREHENSIVE INSTALL-CI-TEST COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-install-ci-test

  // Basic install-ci-test task (no flags)
  tasks.push({
    id: taskId++,
    title: 'Clean install and test',
    description: 'Run npm ci then npm test',
    expectedCommand: 'npm install-ci-test',
    hint: 'Alias: npm cit',
    commandName: 'install-ci-test',
    commandExplanation: 'Runs npm ci (clean install) followed immediately by npm test.',
  });

  // Configuration flags (in documentation order)
  // 1. install-strategy
  tasks.push({
    id: taskId++,
    title: 'CI test with install strategy',
    description: 'Clean install with nested strategy then test',
    expectedCommand: 'npm install-ci-test --install-strategy=nested',
    hint: 'Use --install-strategy with hoisted, nested, shallow, or linked',
    commandName: 'install-ci-test',
    commandExplanation: 'The --install-strategy flag controls how packages are organized.',
  });

  // Skipping legacy-bundling and global-style as deprecated

  // 2. omit
  tasks.push({
    id: taskId++,
    title: 'CI test omitting dev deps',
    description: 'Clean install without devDependencies then test',
    expectedCommand: 'npm install-ci-test --omit=dev',
    hint: 'Use --omit with dev, optional, or peer',
    commandName: 'install-ci-test',
    commandExplanation: 'The --omit flag excludes dependency types from CI install.',
  });

  // 3. include
  tasks.push({
    id: taskId++,
    title: 'CI test including optional',
    description: 'Clean install with optional deps then test',
    expectedCommand: 'npm install-ci-test --include=optional',
    hint: 'Use --include flag',
    commandName: 'install-ci-test',
    commandExplanation: 'The --include flag specifies dependency types to install.',
  });

  // 4. strict-peer-deps
  tasks.push({
    id: taskId++,
    title: 'CI test with strict peers',
    description: 'Fail on peer conflicts during CI then test',
    expectedCommand: 'npm install-ci-test --strict-peer-deps',
    hint: 'Use --strict-peer-deps flag',
    commandName: 'install-ci-test',
    commandExplanation: 'The --strict-peer-deps flag treats peer conflicts as errors.',
  });

  // 5. foreground-scripts
  tasks.push({
    id: taskId++,
    title: 'CI test with foreground scripts',
    description: 'Show all script output during CI then test',
    expectedCommand: 'npm install-ci-test --foreground-scripts',
    hint: 'Use --foreground-scripts for debugging',
    commandName: 'install-ci-test',
    commandExplanation: 'The --foreground-scripts flag runs scripts in foreground.',
  });

  // 6. ignore-scripts
  tasks.push({
    id: taskId++,
    title: 'CI test without scripts',
    description: 'Skip lifecycle scripts during CI then test',
    expectedCommand: 'npm install-ci-test --ignore-scripts',
    hint: 'Use --ignore-scripts flag',
    commandName: 'install-ci-test',
    commandExplanation: 'The --ignore-scripts flag prevents running lifecycle scripts.',
  });

  // 7. audit (--no-audit is the use case)
  tasks.push({
    id: taskId++,
    title: 'CI test without audit',
    description: 'Skip security audit during CI then test',
    expectedCommand: 'npm install-ci-test --no-audit',
    hint: 'Use --no-audit to skip vulnerability checks',
    commandName: 'install-ci-test',
    commandExplanation: 'The --no-audit flag skips the security audit.',
  });

  // 8. bin-links (--no-bin-links is the use case)
  tasks.push({
    id: taskId++,
    title: 'CI test without bin links',
    description: 'Skip creating executable symlinks during CI then test',
    expectedCommand: 'npm install-ci-test --no-bin-links',
    hint: 'Use --no-bin-links flag',
    commandName: 'install-ci-test',
    commandExplanation: 'The --no-bin-links flag prevents creating symlinks for executables.',
  });

  // 9. fund (--no-fund is the use case)
  tasks.push({
    id: taskId++,
    title: 'CI test without fund message',
    description: 'Hide funding messages during CI then test',
    expectedCommand: 'npm install-ci-test --no-fund',
    hint: 'Use --no-fund to hide funding info',
    commandName: 'install-ci-test',
    commandExplanation: 'The --no-fund flag suppresses funding messages.',
  });

  // 10. dry-run
  tasks.push({
    id: taskId++,
    title: 'Dry run CI test',
    description: 'Simulate CI install without changes then test',
    expectedCommand: 'npm install-ci-test --dry-run',
    hint: 'Use --dry-run to preview changes',
    commandName: 'install-ci-test',
    commandExplanation: 'The --dry-run flag shows what would happen without making changes.',
  });

  // 11. workspace
  tasks.push({
    id: taskId++,
    title: 'CI test in workspace',
    description: 'Clean install in packages/backend then test',
    expectedCommand: 'npm install-ci-test --workspace=packages/backend',
    hint: 'Use --workspace or -w flag',
    commandName: 'install-ci-test',
    commandExplanation: 'The --workspace flag runs install-ci-test in a specific workspace.',
  });

  // 12. workspaces
  tasks.push({
    id: taskId++,
    title: 'CI test all workspaces',
    description: 'Clean install all workspaces then test',
    expectedCommand: 'npm install-ci-test --workspaces',
    hint: 'Use --workspaces flag',
    commandName: 'install-ci-test',
    commandExplanation: 'The --workspaces flag runs install-ci-test in all workspaces.',
  });

  // 13. include-workspace-root
  tasks.push({
    id: taskId++,
    title: 'CI test with root workspace',
    description: 'Include root in workspace CI then test',
    expectedCommand: 'npm install-ci-test --workspaces --include-workspace-root',
    hint: 'Use --include-workspace-root with --workspaces',
    commandName: 'install-ci-test',
    commandExplanation: 'The --include-workspace-root flag includes the root project.',
  });

  // 14. install-links
  tasks.push({
    id: taskId++,
    title: 'CI test with install-links',
    description: 'Pack file: deps during CI then test',
    expectedCommand: 'npm install-ci-test --install-links',
    hint: 'Use --install-links flag',
    commandName: 'install-ci-test',
    commandExplanation: 'The --install-links flag treats file: protocol dependencies as regular packages.',
  });
  // ========== END INSTALL-CI-TEST TASKS ==========

  // ========== COMPREHENSIVE VERSION COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-version

  // Basic version tasks (no flags)
  tasks.push({
    id: taskId++,
    title: 'Bump patch version',
    description: 'Increment patch version (1.0.0 → 1.0.1)',
    expectedCommand: 'npm version patch',
    hint: 'Use patch, minor, or major',
    commandName: 'version',
    commandExplanation: 'Increments the patch version and creates a git tag.',
  });

  tasks.push({
    id: taskId++,
    title: 'Bump minor version',
    description: 'Increment minor version (1.0.0 → 1.1.0)',
    expectedCommand: 'npm version minor',
    hint: 'Use minor for new features',
    commandName: 'version',
    commandExplanation: 'Increments the minor version and resets patch to 0.',
  });

  tasks.push({
    id: taskId++,
    title: 'Bump major version',
    description: 'Increment major version (1.0.0 → 2.0.0)',
    expectedCommand: 'npm version major',
    hint: 'Use major for breaking changes',
    commandName: 'version',
    commandExplanation: 'Increments the major version and resets minor and patch to 0.',
  });

  tasks.push({
    id: taskId++,
    title: 'Set specific version',
    description: 'Set version to 2.5.0',
    expectedCommand: 'npm version 2.5.0',
    hint: 'Provide a specific semver version',
    commandName: 'version',
    commandExplanation: 'Sets the version to the specified value.',
  });

  tasks.push({
    id: taskId++,
    title: 'Bump prepatch version',
    description: 'Create prerelease patch (1.0.0 → 1.0.1-0)',
    expectedCommand: 'npm version prepatch',
    hint: 'Use prepatch, preminor, or premajor',
    commandName: 'version',
    commandExplanation: 'Increments the patch version and adds a prerelease identifier.',
  });

  tasks.push({
    id: taskId++,
    title: 'Bump prerelease version',
    description: 'Increment prerelease number (1.0.0-0 → 1.0.0-1)',
    expectedCommand: 'npm version prerelease',
    hint: 'Use prerelease to increment prerelease number',
    commandName: 'version',
    commandExplanation: 'Increments the prerelease version number.',
  });

  tasks.push({
    id: taskId++,
    title: 'Version from git tag',
    description: 'Use latest git tag as version',
    expectedCommand: 'npm version from-git',
    hint: 'Use from-git to read version from tags',
    commandName: 'version',
    commandExplanation: 'Sets version to match the latest git tag.',
  });

  // Configuration flags (in documentation order)
  // 1. allow-same-version
  tasks.push({
    id: taskId++,
    title: 'Allow same version',
    description: 'Set version without error if same as current',
    expectedCommand: 'npm version 1.0.0 --allow-same-version',
    hint: 'Use --allow-same-version flag',
    commandName: 'version',
    commandExplanation: 'The --allow-same-version flag prevents errors when version does not change.',
  });

  // 2. commit-hooks (--no-commit-hooks is the use case)
  tasks.push({
    id: taskId++,
    title: 'Version without commit hooks',
    description: 'Bump version skipping git hooks',
    expectedCommand: 'npm version patch --no-commit-hooks',
    hint: 'Use --no-commit-hooks to skip hooks',
    commandName: 'version',
    commandExplanation: 'The --no-commit-hooks flag skips running git commit hooks.',
  });

  // 3. git-tag-version (--no-git-tag-version is the use case)
  tasks.push({
    id: taskId++,
    title: 'Version without git tag',
    description: 'Bump version without creating git tag',
    expectedCommand: 'npm version patch --no-git-tag-version',
    hint: 'Use --no-git-tag-version flag',
    commandName: 'version',
    commandExplanation: 'The --no-git-tag-version flag prevents git commit and tag creation.',
  });

  // 4. json
  tasks.push({
    id: taskId++,
    title: 'Version with JSON output',
    description: 'Bump version and output JSON',
    expectedCommand: 'npm version patch --json',
    hint: 'Use --json flag for machine-readable output',
    commandName: 'version',
    commandExplanation: 'The --json flag outputs version information in JSON format.',
  });

  // 5. preid
  tasks.push({
    id: taskId++,
    title: 'Version with prerelease ID',
    description: 'Create prerelease with "rc" identifier',
    expectedCommand: 'npm version prerelease --preid=rc',
    hint: 'Use --preid with identifier like alpha, beta, rc',
    commandName: 'version',
    commandExplanation: 'The --preid flag sets the prerelease identifier (e.g., 1.0.0-rc.0).',
  });

  // 6. sign-git-tag
  tasks.push({
    id: taskId++,
    title: 'Version with signed tag',
    description: 'Bump version and create GPG-signed tag',
    expectedCommand: 'npm version patch --sign-git-tag',
    hint: 'Use --sign-git-tag to sign tags with GPG',
    commandName: 'version',
    commandExplanation: 'The --sign-git-tag flag creates a GPG-signed git tag.',
  });

  // 7. save (--no-save is the use case, but version always saves)
  // Skipping save as it's always true for version

  // 8. workspace
  tasks.push({
    id: taskId++,
    title: 'Version specific workspace',
    description: 'Bump version in packages/frontend',
    expectedCommand: 'npm version patch --workspace=packages/frontend',
    hint: 'Use --workspace or -w flag',
    commandName: 'version',
    commandExplanation: 'The --workspace flag bumps version in a specific workspace.',
  });

  // 9. workspaces
  tasks.push({
    id: taskId++,
    title: 'Version all workspaces',
    description: 'Bump version in all workspaces',
    expectedCommand: 'npm version patch --workspaces',
    hint: 'Use --workspaces flag',
    commandName: 'version',
    commandExplanation: 'The --workspaces flag bumps version in all workspaces.',
  });

  // 10. workspaces-update (--no-workspaces-update is the use case)
  tasks.push({
    id: taskId++,
    title: 'Version without workspace update',
    description: 'Bump version without updating workspace installs',
    expectedCommand: 'npm version patch --no-workspaces-update',
    hint: 'Use --no-workspaces-update flag',
    commandName: 'version',
    commandExplanation: 'The --no-workspaces-update flag skips updating workspace dependencies.',
  });

  // 11. include-workspace-root
  tasks.push({
    id: taskId++,
    title: 'Version with root workspace',
    description: 'Include root when versioning workspaces',
    expectedCommand: 'npm version patch --workspaces --include-workspace-root',
    hint: 'Use --include-workspace-root with --workspaces',
    commandName: 'version',
    commandExplanation: 'The --include-workspace-root flag includes the root project when versioning workspaces.',
  });

  // 12. ignore-scripts
  tasks.push({
    id: taskId++,
    title: 'Version without scripts',
    description: 'Bump version without running version scripts',
    expectedCommand: 'npm version patch --ignore-scripts',
    hint: 'Use --ignore-scripts to skip preversion/version/postversion',
    commandName: 'version',
    commandExplanation: 'The --ignore-scripts flag prevents running version lifecycle scripts.',
  });
  // ========== END VERSION TASKS ==========

  // ========== COMPREHENSIVE PUBLISH COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-publish

  // Basic publish tasks (no flags)
  tasks.push({
    id: taskId++,
    title: 'Publish package',
    description: 'Publish package to registry',
    expectedCommand: 'npm publish',
    hint: 'Publishes current directory package',
    commandName: 'publish',
    commandExplanation: 'Publishes the package in the current directory to the npm registry.',
  });

  tasks.push({
    id: taskId++,
    title: 'Publish tarball',
    description: 'Publish from tarball file',
    expectedCommand: 'npm publish my-package-1.0.0.tgz',
    hint: 'Can publish .tgz files',
    commandName: 'publish',
    commandExplanation: 'Publishes a package from a tarball file.',
  });

  tasks.push({
    id: taskId++,
    title: 'Publish folder',
    description: 'Publish from specific folder',
    expectedCommand: 'npm publish ./dist',
    hint: 'Specify a folder path',
    commandName: 'publish',
    commandExplanation: 'Publishes a package from the specified folder.',
  });

  // Configuration flags (in documentation order)
  // 1. tag
  tasks.push({
    id: taskId++,
    title: 'Publish with tag',
    description: 'Publish as beta tag',
    expectedCommand: 'npm publish --tag=beta',
    hint: 'Use --tag with tag name (default: latest)',
    commandName: 'publish',
    commandExplanation: 'The --tag flag specifies the dist-tag to publish under.',
  });

  // 2. access
  tasks.push({
    id: taskId++,
    title: 'Publish as public',
    description: 'Publish scoped package as public',
    expectedCommand: 'npm publish --access=public',
    hint: 'Use --access with public or restricted',
    commandName: 'publish',
    commandExplanation: 'The --access flag controls who can see the package (public or restricted).',
  });

  tasks.push({
    id: taskId++,
    title: 'Publish as restricted',
    description: 'Publish scoped package as private',
    expectedCommand: 'npm publish --access=restricted',
    hint: 'restricted requires a paid account',
    commandName: 'publish',
    commandExplanation: 'The --access=restricted flag publishes a private scoped package.',
  });

  // 3. dry-run
  tasks.push({
    id: taskId++,
    title: 'Dry run publish',
    description: 'Preview publish without uploading',
    expectedCommand: 'npm publish --dry-run',
    hint: 'Use --dry-run to test publishing',
    commandName: 'publish',
    commandExplanation: 'The --dry-run flag shows what would be published without uploading.',
  });

  // 4. otp
  tasks.push({
    id: taskId++,
    title: 'Publish with 2FA',
    description: 'Publish with one-time password',
    expectedCommand: 'npm publish --otp=123456',
    hint: 'Use --otp with 2FA code',
    commandName: 'publish',
    commandExplanation: 'The --otp flag provides a one-time password for two-factor authentication.',
  });

  // 5. workspace
  tasks.push({
    id: taskId++,
    title: 'Publish specific workspace',
    description: 'Publish packages/frontend workspace',
    expectedCommand: 'npm publish --workspace=packages/frontend',
    hint: 'Use --workspace or -w flag',
    commandName: 'publish',
    commandExplanation: 'The --workspace flag publishes a specific workspace.',
  });

  // 6. workspaces
  tasks.push({
    id: taskId++,
    title: 'Publish all workspaces',
    description: 'Publish all workspace packages',
    expectedCommand: 'npm publish --workspaces',
    hint: 'Use --workspaces flag',
    commandName: 'publish',
    commandExplanation: 'The --workspaces flag publishes all workspace packages.',
  });

  // 7. include-workspace-root
  tasks.push({
    id: taskId++,
    title: 'Publish with root workspace',
    description: 'Include root when publishing workspaces',
    expectedCommand: 'npm publish --workspaces --include-workspace-root',
    hint: 'Use --include-workspace-root with --workspaces',
    commandName: 'publish',
    commandExplanation: 'The --include-workspace-root flag includes the root project when publishing workspaces.',
  });

  // 8. provenance
  tasks.push({
    id: taskId++,
    title: 'Publish with provenance',
    description: 'Publish with build provenance from CI',
    expectedCommand: 'npm publish --provenance',
    hint: 'Use --provenance in supported CI systems',
    commandName: 'publish',
    commandExplanation: 'The --provenance flag links the package to its CI/CD build provenance.',
  });

  // 9. provenance-file
  tasks.push({
    id: taskId++,
    title: 'Publish with provenance file',
    description: 'Publish with custom provenance bundle',
    expectedCommand: 'npm publish --provenance-file=./provenance.json',
    hint: 'Use --provenance-file with path',
    commandName: 'publish',
    commandExplanation: 'The --provenance-file flag uses a custom provenance bundle file.',
  });
  // ========== END PUBLISH TASKS ==========

  // ========== COMPREHENSIVE UNPUBLISH COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-unpublish

  // Basic unpublish tasks (no flags)
  tasks.push({
    id: taskId++,
    title: 'Unpublish specific version',
    description: 'Remove version 1.0.0 from registry',
    expectedCommand: 'npm unpublish my-package@1.0.0',
    hint: 'Specify package@version',
    commandName: 'unpublish',
    commandExplanation: 'Removes a specific version of a package from the registry.',
  });

  tasks.push({
    id: taskId++,
    title: 'Unpublish entire package',
    description: 'Remove all versions from registry',
    expectedCommand: 'npm unpublish my-package --force',
    hint: 'Requires --force to unpublish all versions',
    commandName: 'unpublish',
    commandExplanation: 'Removes all versions of a package (requires --force).',
  });

  // Configuration flags (in documentation order)
  // 1. dry-run
  tasks.push({
    id: taskId++,
    title: 'Dry run unpublish',
    description: 'Preview unpublish without removing',
    expectedCommand: 'npm unpublish my-package@1.0.0 --dry-run',
    hint: 'Use --dry-run to test unpublishing',
    commandName: 'unpublish',
    commandExplanation: 'The --dry-run flag shows what would be unpublished without removing.',
  });

  // 2. force
  tasks.push({
    id: taskId++,
    title: 'Force unpublish',
    description: 'Unpublish entire package with force',
    expectedCommand: 'npm unpublish my-package --force',
    hint: 'Use --force to unpublish all versions',
    commandName: 'unpublish',
    commandExplanation: 'The --force flag allows unpublishing all versions of a package.',
  });

  // 3. workspace
  tasks.push({
    id: taskId++,
    title: 'Unpublish workspace',
    description: 'Unpublish a specific workspace package',
    expectedCommand: 'npm unpublish --workspace=packages/frontend',
    hint: 'Use --workspace or -w flag',
    commandName: 'unpublish',
    commandExplanation: 'The --workspace flag unpublishes a specific workspace package.',
  });

  // 4. workspaces
  tasks.push({
    id: taskId++,
    title: 'Unpublish all workspaces',
    description: 'Unpublish all workspace packages',
    expectedCommand: 'npm unpublish --workspaces',
    hint: 'Use --workspaces flag',
    commandName: 'unpublish',
    commandExplanation: 'The --workspaces flag unpublishes all workspace packages.',
  });
  // ========== END UNPUBLISH TASKS ==========

  // ========== COMPREHENSIVE DEPRECATE COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-deprecate

  // Basic deprecate tasks (no flags)
  tasks.push({
    id: taskId++,
    title: 'Deprecate specific version',
    description: 'Deprecate version 1.0.0 with message',
    expectedCommand: 'npm deprecate my-package@1.0.0 "Use version 2.0.0 instead"',
    hint: 'Specify package@version and message',
    commandName: 'deprecate',
    commandExplanation: 'Marks a specific version as deprecated with a warning message.',
  });

  tasks.push({
    id: taskId++,
    title: 'Deprecate version range',
    description: 'Deprecate all 1.x versions',
    expectedCommand: 'npm deprecate my-package@"< 2.0.0" "Upgrade to 2.x"',
    hint: 'Use semver range with quotes',
    commandName: 'deprecate',
    commandExplanation: 'Deprecates all versions matching the semver range.',
  });

  tasks.push({
    id: taskId++,
    title: 'Undeprecate package',
    description: 'Remove deprecation warning',
    expectedCommand: 'npm deprecate my-package@1.0.0 ""',
    hint: 'Use empty string "" to undeprecate',
    commandName: 'deprecate',
    commandExplanation: 'Removes deprecation by providing an empty message.',
  });

  // Configuration flags (in documentation order)
  // 1. registry
  tasks.push({
    id: taskId++,
    title: 'Deprecate on custom registry',
    description: 'Deprecate on specific registry',
    expectedCommand: 'npm deprecate my-package@1.0.0 "Old version" --registry=https://custom.registry.com',
    hint: 'Use --registry with URL',
    commandName: 'deprecate',
    commandExplanation: 'The --registry flag specifies which registry to deprecate on.',
  });

  // 2. otp
  tasks.push({
    id: taskId++,
    title: 'Deprecate with 2FA',
    description: 'Deprecate with one-time password',
    expectedCommand: 'npm deprecate my-package@1.0.0 "Deprecated" --otp=123456',
    hint: 'Use --otp with 2FA code',
    commandName: 'deprecate',
    commandExplanation: 'The --otp flag provides a one-time password for two-factor authentication.',
  });

  // 3. dry-run
  tasks.push({
    id: taskId++,
    title: 'Dry run deprecate',
    description: 'Preview deprecation without applying',
    expectedCommand: 'npm deprecate my-package@1.0.0 "Old" --dry-run',
    hint: 'Use --dry-run to test deprecation',
    commandName: 'deprecate',
    commandExplanation: 'The --dry-run flag shows what would be deprecated without applying changes.',
  });
  // ========== END DEPRECATE TASKS ==========

  // ========== COMPREHENSIVE SEARCH COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-search

  // Basic search tasks (no flags)
  tasks.push({
    id: taskId++,
    title: 'Search for packages',
    description: 'Search registry for react packages',
    expectedCommand: 'npm search react',
    hint: 'Alias: npm s',
    commandName: 'search',
    commandExplanation: 'Searches the npm registry for packages matching the search term.',
  });

  tasks.push({
    id: taskId++,
    title: 'Search multiple terms',
    description: 'Search for packages matching multiple keywords',
    expectedCommand: 'npm search react typescript',
    hint: 'Provide multiple search terms',
    commandName: 'search',
    commandExplanation: 'Searches for packages matching all provided terms.',
  });

  tasks.push({
    id: taskId++,
    title: 'Search by maintainer',
    description: 'Search packages by maintainer username',
    expectedCommand: 'npm search =sindresorhus',
    hint: 'Prefix username with = to search by maintainer',
    commandName: 'search',
    commandExplanation: 'The = prefix searches for packages by a specific maintainer.',
  });

  tasks.push({
    id: taskId++,
    title: 'Search with regex',
    description: 'Search using regular expression',
    expectedCommand: 'npm search /^react-/',
    hint: 'Use /pattern/ for regex search',
    commandName: 'search',
    commandExplanation: 'Terms starting with / are interpreted as regular expressions.',
  });

  // Configuration flags (in documentation order)
  // 1. json
  tasks.push({
    id: taskId++,
    title: 'Search with JSON output',
    description: 'Get search results in JSON format',
    expectedCommand: 'npm search react --json',
    hint: 'Use --json for machine-readable output',
    commandName: 'search',
    commandExplanation: 'The --json flag outputs search results in JSON format.',
  });

  // 2. color (--no-color is the use case)
  tasks.push({
    id: taskId++,
    title: 'Search without colors',
    description: 'Disable colored output',
    expectedCommand: 'npm search react --no-color',
    hint: 'Use --no-color to disable highlighting',
    commandName: 'search',
    commandExplanation: 'The --no-color flag disables color highlighting in results.',
  });

  // 3. parseable
  tasks.push({
    id: taskId++,
    title: 'Search with parseable output',
    description: 'Get tab-separated search results',
    expectedCommand: 'npm search react --parseable',
    hint: 'Use --parseable for tab-separated format',
    commandName: 'search',
    commandExplanation: 'The --parseable flag outputs results in tab-separated format.',
  });

  // 4. description (--no-description is the use case)
  tasks.push({
    id: taskId++,
    title: 'Search without descriptions',
    description: 'Hide package descriptions in results',
    expectedCommand: 'npm search react --no-description',
    hint: 'Use --no-description to hide descriptions',
    commandName: 'search',
    commandExplanation: 'The --no-description flag hides package descriptions.',
  });

  // 5. searchlimit
  tasks.push({
    id: taskId++,
    title: 'Limit search results',
    description: 'Show only 10 search results',
    expectedCommand: 'npm search react --searchlimit=10',
    hint: 'Use --searchlimit with number (default: 20)',
    commandName: 'search',
    commandExplanation: 'The --searchlimit flag limits the number of search results.',
  });

  // 6. searchopts
  tasks.push({
    id: taskId++,
    title: 'Search with additional filters',
    description: 'Add extra search options',
    expectedCommand: 'npm search react --searchopts="typescript"',
    hint: 'Use --searchopts for additional filtering',
    commandName: 'search',
    commandExplanation: 'The --searchopts flag adds additional search filters.',
  });

  // 7. searchexclude
  tasks.push({
    id: taskId++,
    title: 'Search excluding terms',
    description: 'Exclude packages from results',
    expectedCommand: 'npm search react --searchexclude="native"',
    hint: 'Use --searchexclude to filter out results',
    commandName: 'search',
    commandExplanation: 'The --searchexclude flag excludes packages matching certain terms.',
  });

  // 8. registry
  tasks.push({
    id: taskId++,
    title: 'Search custom registry',
    description: 'Search on a specific registry',
    expectedCommand: 'npm search react --registry=https://custom.registry.com',
    hint: 'Use --registry with URL',
    commandName: 'search',
    commandExplanation: 'The --registry flag searches on a custom npm registry.',
  });

  // 9. prefer-online
  tasks.push({
    id: taskId++,
    title: 'Search with online preference',
    description: 'Force fresh search data',
    expectedCommand: 'npm search react --prefer-online',
    hint: 'Use --prefer-online for fresh results',
    commandName: 'search',
    commandExplanation: 'The --prefer-online flag forces fetching fresh search data.',
  });

  // 10. prefer-offline
  tasks.push({
    id: taskId++,
    title: 'Search with offline preference',
    description: 'Use cached search data when possible',
    expectedCommand: 'npm search react --prefer-offline',
    hint: 'Use --prefer-offline to use cache',
    commandName: 'search',
    commandExplanation: 'The --prefer-offline flag prefers using cached search data.',
  });

  // 11. offline
  tasks.push({
    id: taskId++,
    title: 'Search offline',
    description: 'Search only in cache',
    expectedCommand: 'npm search react --offline',
    hint: 'Use --offline for fully offline mode',
    commandName: 'search',
    commandExplanation: 'The --offline flag forces search to use only cached data.',
  });
  // ========== END SEARCH TASKS ==========

  // ========== COMPREHENSIVE VIEW COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-view

  // Basic view tasks (no flags)
  tasks.push({
    id: taskId++,
    title: 'View package info',
    description: 'Show information about lodash',
    expectedCommand: 'npm view lodash',
    hint: 'Alias: npm info, npm show, npm v',
    commandName: 'view',
    commandExplanation: 'Displays package information from the registry.',
  });

  tasks.push({
    id: taskId++,
    title: 'View specific version',
    description: 'Show info about lodash@4.17.21',
    expectedCommand: 'npm view lodash@4.17.21',
    hint: 'Specify package@version',
    commandName: 'view',
    commandExplanation: 'Shows information about a specific package version.',
  });

  tasks.push({
    id: taskId++,
    title: 'View specific field',
    description: 'Show dependencies of express',
    expectedCommand: 'npm view express dependencies',
    hint: 'Add field name after package',
    commandName: 'view',
    commandExplanation: 'Displays a specific field from package metadata.',
  });

  tasks.push({
    id: taskId++,
    title: 'View nested field',
    description: 'Show repository URL of npm',
    expectedCommand: 'npm view npm repository.url',
    hint: 'Use dot notation for nested fields',
    commandName: 'view',
    commandExplanation: 'Accesses nested fields using dot notation.',
  });

  tasks.push({
    id: taskId++,
    title: 'View current project',
    description: 'Show dependencies of current project',
    expectedCommand: 'npm view . dependencies',
    hint: 'Use . to reference current project',
    commandName: 'view',
    commandExplanation: 'The . refers to the current project directory.',
  });

  tasks.push({
    id: taskId++,
    title: 'View array field',
    description: 'Show contributor emails of express',
    expectedCommand: 'npm view express contributors.email',
    hint: 'Access array field properties',
    commandName: 'view',
    commandExplanation: 'Retrieves all values from objects in an array field.',
  });

  tasks.push({
    id: taskId++,
    title: 'View array element',
    description: 'Show first contributor email',
    expectedCommand: 'npm view express contributors[0].email',
    hint: 'Use [index] to select array element',
    commandName: 'view',
    commandExplanation: 'Uses numeric indices to select specific array elements.',
  });

  tasks.push({
    id: taskId++,
    title: 'View multiple fields',
    description: 'Show name and version of lodash',
    expectedCommand: 'npm view lodash name version',
    hint: 'List multiple fields separated by spaces',
    commandName: 'view',
    commandExplanation: 'Displays multiple fields in sequence.',
  });

  tasks.push({
    id: taskId++,
    title: 'View version history',
    description: 'Show all versions of react',
    expectedCommand: 'npm view react versions',
    hint: 'Use "versions" field to see all versions',
    commandName: 'view',
    commandExplanation: 'The versions field shows the complete version history.',
  });

  // Configuration flags (in documentation order)
  // 1. json
  tasks.push({
    id: taskId++,
    title: 'View with JSON output',
    description: 'Get package info in JSON format',
    expectedCommand: 'npm view lodash --json',
    hint: 'Use --json for machine-readable output',
    commandName: 'view',
    commandExplanation: 'The --json flag outputs package information in JSON format.',
  });

  // 2. workspace
  tasks.push({
    id: taskId++,
    title: 'View workspace package',
    description: 'Show info about workspace package',
    expectedCommand: 'npm view --workspace=packages/frontend',
    hint: 'Use --workspace or -w flag',
    commandName: 'view',
    commandExplanation: 'The --workspace flag views information about a specific workspace.',
  });

  // 3. workspaces
  tasks.push({
    id: taskId++,
    title: 'View all workspaces',
    description: 'Show info for all workspace packages',
    expectedCommand: 'npm view --workspaces',
    hint: 'Use --workspaces flag',
    commandName: 'view',
    commandExplanation: 'The --workspaces flag views information for all workspaces.',
  });

  // 4. include-workspace-root
  tasks.push({
    id: taskId++,
    title: 'View with root workspace',
    description: 'Include root when viewing workspaces',
    expectedCommand: 'npm view --workspaces --include-workspace-root',
    hint: 'Use --include-workspace-root with --workspaces',
    commandName: 'view',
    commandExplanation: 'The --include-workspace-root flag includes the root project.',
  });
  // ========== END VIEW TASKS ==========

  // ========== COMPREHENSIVE EXPLAIN COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-explain

  // Basic explain tasks (no flags)
  tasks.push({
    id: taskId++,
    title: 'Explain package',
    description: 'Show why lodash is installed',
    expectedCommand: 'npm explain lodash',
    hint: 'Alias: npm why',
    commandName: 'explain',
    commandExplanation: 'Shows the dependency chain causing a package to be installed.',
  });

  tasks.push({
    id: taskId++,
    title: 'Explain by folder',
    description: 'Explain package in specific folder',
    expectedCommand: 'npm explain node_modules/react',
    hint: 'Can use folder path in node_modules',
    commandName: 'explain',
    commandExplanation: 'Explains the package at a specific node_modules location.',
  });

  tasks.push({
    id: taskId++,
    title: 'Explain duplicated package',
    description: 'Show why a package is duplicated',
    expectedCommand: 'npm explain node_modules/lodash/node_modules/clone',
    hint: 'Useful for understanding duplicates',
    commandName: 'explain',
    commandExplanation: 'Helps identify why dependencies are duplicated.',
  });

  // Configuration flags (in documentation order)
  // 1. json
  tasks.push({
    id: taskId++,
    title: 'Explain with JSON output',
    description: 'Get explanation in JSON format',
    expectedCommand: 'npm explain lodash --json',
    hint: 'Use --json for machine-readable output',
    commandName: 'explain',
    commandExplanation: 'The --json flag outputs the dependency chain in JSON format.',
  });

  // 2. workspace
  tasks.push({
    id: taskId++,
    title: 'Explain in workspace',
    description: 'Explain package in specific workspace',
    expectedCommand: 'npm explain lodash --workspace=packages/frontend',
    hint: 'Use --workspace or -w flag',
    commandName: 'explain',
    commandExplanation: 'The --workspace flag explains packages within a specific workspace.',
  });
  // ========== END EXPLAIN TASKS ==========

  // ========== COMPREHENSIVE FUND COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-fund

  // Basic fund tasks (no flags)
  tasks.push({
    id: taskId++,
    title: 'List funding info',
    description: 'Show funding information for all dependencies',
    expectedCommand: 'npm fund',
    hint: 'Lists dependencies with funding',
    commandName: 'fund',
    commandExplanation: 'Displays funding information for project dependencies.',
  });

  tasks.push({
    id: taskId++,
    title: 'Fund specific package',
    description: 'Show funding info for lodash',
    expectedCommand: 'npm fund lodash',
    hint: 'Specify package name to open funding URL',
    commandName: 'fund',
    commandExplanation: 'Opens the funding URL for a specific package.',
  });

  // Configuration flags (in documentation order)
  // 1. json
  tasks.push({
    id: taskId++,
    title: 'Fund with JSON output',
    description: 'Get funding info in JSON format',
    expectedCommand: 'npm fund --json',
    hint: 'Use --json for machine-readable output',
    commandName: 'fund',
    commandExplanation: 'The --json flag outputs funding information in JSON format.',
  });

  // 2. browser (--no-browser is the use case)
  tasks.push({
    id: taskId++,
    title: 'Fund without browser',
    description: 'Print funding URLs without opening browser',
    expectedCommand: 'npm fund lodash --no-browser',
    hint: 'Use --no-browser to print URLs only',
    commandName: 'fund',
    commandExplanation: 'The --no-browser flag prints URLs instead of opening them.',
  });

  // 3. unicode (--no-unicode is the use case)
  tasks.push({
    id: taskId++,
    title: 'Fund without unicode',
    description: 'Show funding tree with ASCII',
    expectedCommand: 'npm fund --no-unicode',
    hint: 'Use --no-unicode for ASCII characters',
    commandName: 'fund',
    commandExplanation: 'The --no-unicode flag uses ASCII instead of unicode characters.',
  });

  // 4. workspace
  tasks.push({
    id: taskId++,
    title: 'Fund in workspace',
    description: 'Show funding for specific workspace',
    expectedCommand: 'npm fund --workspace=packages/frontend',
    hint: 'Use --workspace or -w flag',
    commandName: 'fund',
    commandExplanation: 'The --workspace flag shows funding for a specific workspace.',
  });

  // 5. which
  tasks.push({
    id: taskId++,
    title: 'Fund with specific URL',
    description: 'Open second funding URL for package',
    expectedCommand: 'npm fund lodash --which=2',
    hint: 'Use --which with index for multiple sources',
    commandName: 'fund',
    commandExplanation: 'The --which flag selects a specific funding URL when multiple exist.',
  });
  // ========== END FUND TASKS ==========

  // ========== COMPREHENSIVE CONFIG COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-config

  // Basic config tasks (no flags)
  tasks.push({
    id: taskId++,
    title: 'Set config value',
    description: 'Set registry to custom URL',
    expectedCommand: 'npm config set registry=https://custom.registry.com',
    hint: 'Alias: npm set or npm c set',
    commandName: 'config',
    commandExplanation: 'Sets a configuration value in the user npmrc file.',
  });

  tasks.push({
    id: taskId++,
    title: 'Get config value',
    description: 'Display current registry setting',
    expectedCommand: 'npm config get registry',
    hint: 'Alias: npm get',
    commandName: 'config',
    commandExplanation: 'Displays the current value of a configuration key.',
  });

  tasks.push({
    id: taskId++,
    title: 'Get multiple config values',
    description: 'Display registry and prefix',
    expectedCommand: 'npm config get registry prefix',
    hint: 'List multiple keys separated by spaces',
    commandName: 'config',
    commandExplanation: 'Displays values for multiple configuration keys.',
  });

  tasks.push({
    id: taskId++,
    title: 'List all config',
    description: 'Show all configuration settings',
    expectedCommand: 'npm config list',
    hint: 'Lists all current config',
    commandName: 'config',
    commandExplanation: 'Shows all configuration settings from all sources.',
  });

  tasks.push({
    id: taskId++,
    title: 'Delete config value',
    description: 'Remove registry from config',
    expectedCommand: 'npm config delete registry',
    hint: 'Use delete subcommand',
    commandName: 'config',
    commandExplanation: 'Removes a configuration key from all config files.',
  });

  tasks.push({
    id: taskId++,
    title: 'Edit config file',
    description: 'Open npmrc in editor',
    expectedCommand: 'npm config edit',
    hint: 'Opens config in default editor',
    commandName: 'config',
    commandExplanation: 'Opens the user configuration file in an editor.',
  });

  tasks.push({
    id: taskId++,
    title: 'Fix config issues',
    description: 'Repair invalid configuration',
    expectedCommand: 'npm config fix',
    hint: 'Attempts to repair config problems',
    commandName: 'config',
    commandExplanation: 'Attempts to repair invalid configuration items.',
  });

  // Configuration flags (in documentation order)
  // 1. json
  tasks.push({
    id: taskId++,
    title: 'List config as JSON',
    description: 'Get configuration in JSON format',
    expectedCommand: 'npm config list --json',
    hint: 'Use --json for machine-readable output',
    commandName: 'config',
    commandExplanation: 'The --json flag outputs configuration in JSON format.',
  });

  // 2. global
  tasks.push({
    id: taskId++,
    title: 'Set global config',
    description: 'Set prefix in global config',
    expectedCommand: 'npm config set prefix=/usr/local --global',
    hint: 'Use --global or -g to modify global config',
    commandName: 'config',
    commandExplanation: 'The --global flag modifies the global npmrc file.',
  });

  tasks.push({
    id: taskId++,
    title: 'Edit global config',
    description: 'Open global npmrc in editor',
    expectedCommand: 'npm config edit --global',
    hint: 'Use --global with edit subcommand',
    commandName: 'config',
    commandExplanation: 'The --global flag with edit opens the global config file.',
  });

  // 3. editor
  tasks.push({
    id: taskId++,
    title: 'Edit with specific editor',
    description: 'Open config in vim',
    expectedCommand: 'npm config edit --editor=vim',
    hint: 'Use --editor with editor command',
    commandName: 'config',
    commandExplanation: 'The --editor flag specifies which editor to use.',
  });

  // 4. location
  tasks.push({
    id: taskId++,
    title: 'Set in project config',
    description: 'Set registry in project npmrc',
    expectedCommand: 'npm config set registry=https://custom.com --location=project',
    hint: 'Use --location with global, user, or project',
    commandName: 'config',
    commandExplanation: 'The --location flag specifies which config file to modify.',
  });

  // 5. long (-l is the use case)
  tasks.push({
    id: taskId++,
    title: 'List with defaults',
    description: 'Show all config including defaults',
    expectedCommand: 'npm config list -l',
    hint: 'Use -l to show default values',
    commandName: 'config',
    commandExplanation: 'The -l flag shows configuration including default values.',
  });
  // ========== END CONFIG TASKS ==========

  // ========== COMPREHENSIVE GET COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-config (get is a subcommand)

  // Basic get tasks (no flags)
  tasks.push({
    id: taskId++,
    title: 'Get single value',
    description: 'Display registry setting',
    expectedCommand: 'npm get registry',
    hint: 'Shorthand for npm config get',
    commandName: 'get',
    commandExplanation: 'Gets a configuration value (alias for npm config get).',
  });

  tasks.push({
    id: taskId++,
    title: 'Get all config',
    description: 'Display all configuration',
    expectedCommand: 'npm get',
    hint: 'Without args, shows all config',
    commandName: 'get',
    commandExplanation: 'Without arguments, displays all configuration settings.',
  });

  tasks.push({
    id: taskId++,
    title: 'Get multiple values',
    description: 'Display multiple config values',
    expectedCommand: 'npm get registry prefix',
    hint: 'List multiple keys',
    commandName: 'get',
    commandExplanation: 'Displays values for multiple configuration keys.',
  });
  // ========== END GET TASKS ==========

  // ========== COMPREHENSIVE SET COMMAND TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-config (set is a subcommand)

  // Basic set tasks (no flags)
  tasks.push({
    id: taskId++,
    title: 'Set single value',
    description: 'Set registry URL',
    expectedCommand: 'npm set registry=https://registry.npmjs.org',
    hint: 'Shorthand for npm config set',
    commandName: 'set',
    commandExplanation: 'Sets a configuration value (alias for npm config set).',
  });

  tasks.push({
    id: taskId++,
    title: 'Set multiple values',
    description: 'Set registry and save-exact',
    expectedCommand: 'npm set registry=https://custom.com save-exact=true',
    hint: 'Set multiple key=value pairs',
    commandName: 'set',
    commandExplanation: 'Sets multiple configuration values at once.',
  });

  tasks.push({
    id: taskId++,
    title: 'Remove config value',
    description: 'Delete registry setting',
    expectedCommand: 'npm set registry',
    hint: 'Omit value to delete key',
    commandName: 'set',
    commandExplanation: 'Omitting the value removes the key from config.',
  });

  // Configuration flags (inherited from config)
  tasks.push({
    id: taskId++,
    title: 'Set global value',
    description: 'Set prefix in global config',
    expectedCommand: 'npm set prefix=/usr/local --global',
    hint: 'Use --global or -g flag',
    commandName: 'set',
    commandExplanation: 'The --global flag sets values in the global npmrc file.',
  });

  tasks.push({
    id: taskId++,
    title: 'Set in specific location',
    description: 'Set registry in project config',
    expectedCommand: 'npm set registry=https://custom.com --location=project',
    hint: 'Use --location with global, user, or project',
    commandName: 'set',
    commandExplanation: 'The --location flag specifies which config file to modify.',
  });
  // ========== END SET TASKS ==========

  // ========== CACHE TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-cache
  // Basic cache operations
  tasks.push({
    id: taskId++,
    title: 'Add package to cache',
    description: 'Add express to the cache',
    expectedCommand: 'npm cache add express',
    hint: 'Add a package to the cache',
    commandName: 'cache',
    commandExplanation: 'Adds the package to the local cache without installing it.',
  });
  tasks.push({
    id: taskId++,
    title: 'Clean specific cache entry',
    description: 'Remove lodash from cache',
    expectedCommand: 'npm cache clean lodash',
    hint: 'Clean a specific cache entry',
    commandName: 'cache',
    commandExplanation: 'Deletes a single entry from the cache folder.',
  });
  tasks.push({
    id: taskId++,
    title: 'Clean all cache',
    description: 'Remove all cached data',
    expectedCommand: 'npm cache clean --force',
    hint: 'Clean all cache (requires --force)',
    commandName: 'cache',
    commandExplanation: 'Deletes all entries from the cache folder (requires --force).',
  });
  tasks.push({
    id: taskId++,
    title: 'List all cache entries',
    description: 'Show everything in cache',
    expectedCommand: 'npm cache ls',
    hint: 'List all cache entries',
    commandName: 'cache',
    commandExplanation: 'Lists all entries in the local cache.',
  });
  tasks.push({
    id: taskId++,
    title: 'List specific package cache',
    description: 'Show lodash cache entries',
    expectedCommand: 'npm cache ls lodash',
    hint: 'List cache for a specific package',
    commandName: 'cache',
    commandExplanation: 'Lists cache entries for a specific package.',
  });
  tasks.push({
    id: taskId++,
    title: 'Verify cache integrity',
    description: 'Check and clean cache',
    expectedCommand: 'npm cache verify',
    hint: 'Verify cache integrity',
    commandName: 'cache',
    commandExplanation: 'Verifies cache contents, garbage collects, and checks integrity.',
  });
  
  // npx cache operations
  tasks.push({
    id: taskId++,
    title: 'List npx cache',
    description: 'Show all npx cached executables',
    expectedCommand: 'npm cache npx ls',
    hint: 'List npx cache',
    commandName: 'cache',
    commandExplanation: 'Lists all entries in the npx cache.',
  });
  tasks.push({
    id: taskId++,
    title: 'Remove npx cache entry',
    description: 'Remove create-react-app from npx cache',
    expectedCommand: 'npm cache npx rm create-react-app',
    hint: 'Remove npx cache entry',
    commandName: 'cache',
    commandExplanation: 'Removes a specific entry from the npx cache.',
  });
  tasks.push({
    id: taskId++,
    title: 'Get npx cache info',
    description: 'Show create-react-app npx cache details',
    expectedCommand: 'npm cache npx info create-react-app',
    hint: 'Get npx cache info',
    commandName: 'cache',
    commandExplanation: 'Shows detailed information about an npx cache entry.',
  });
  
  // Configuration flag
  tasks.push({
    id: taskId++,
    title: 'Use custom cache location',
    description: 'Verify cache in custom directory',
    expectedCommand: 'npm cache verify --cache=/custom/cache',
    hint: 'Use --cache flag',
    commandName: 'cache',
    commandExplanation: 'The --cache flag specifies a custom cache directory location.',
  });
  // ========== END CACHE TASKS ==========

  // ========== PRUNE TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-prune
  // Basic prune operations
  tasks.push({
    id: taskId++,
    title: 'Remove extraneous packages',
    description: 'Prune all unlisted packages',
    expectedCommand: 'npm prune',
    hint: 'Remove extraneous packages',
    commandName: 'prune',
    commandExplanation: 'Removes packages not listed in package.json dependencies.',
  });
  tasks.push({
    id: taskId++,
    title: 'Prune specific package',
    description: 'Remove lodash if extraneous',
    expectedCommand: 'npm prune lodash',
    hint: 'Prune specific package',
    commandName: 'prune',
    commandExplanation: 'Removes only the specified package if it is extraneous.',
  });
  
  // Configuration flags (in documentation order)
  tasks.push({
    id: taskId++,
    title: 'Prune dev dependencies',
    description: 'Remove devDependencies',
    expectedCommand: 'npm prune --omit=dev',
    hint: 'Use --omit=dev flag',
    commandName: 'prune',
    commandExplanation: 'The --omit=dev flag removes devDependencies (production mode).',
  });
  tasks.push({
    id: taskId++,
    title: 'Prune optional dependencies',
    description: 'Exclude optional from tree',
    expectedCommand: 'npm prune --omit=optional',
    hint: 'Use --omit=optional flag',
    commandName: 'prune',
    commandExplanation: 'The --omit=optional flag excludes optional dependencies from the tree.',
  });
  tasks.push({
    id: taskId++,
    title: 'Prune peer dependencies',
    description: 'Exclude peer from tree',
    expectedCommand: 'npm prune --omit=peer',
    hint: 'Use --omit=peer flag',
    commandName: 'prune',
    commandExplanation: 'The --omit=peer flag excludes peer dependencies from the tree.',
  });
  tasks.push({
    id: taskId++,
    title: 'Include dev dependencies',
    description: 'Keep devDependencies when pruning',
    expectedCommand: 'npm prune --include=dev',
    hint: 'Use --include=dev flag',
    commandName: 'prune',
    commandExplanation: 'The --include=dev flag ensures devDependencies are kept.',
  });
  tasks.push({
    id: taskId++,
    title: 'Dry run prune',
    description: 'Preview what would be removed',
    expectedCommand: 'npm prune --dry-run',
    hint: 'Use --dry-run flag',
    commandName: 'prune',
    commandExplanation: 'The --dry-run flag shows what would be removed without making changes.',
  });
  tasks.push({
    id: taskId++,
    title: 'Prune with JSON output',
    description: 'Get prune changes as JSON',
    expectedCommand: 'npm prune --json',
    hint: 'Use --json flag',
    commandName: 'prune',
    commandExplanation: 'The --json flag outputs the changes in JSON format.',
  });
  tasks.push({
    id: taskId++,
    title: 'Foreground scripts during prune',
    description: 'Run scripts in foreground',
    expectedCommand: 'npm prune --foreground-scripts',
    hint: 'Use --foreground-scripts flag',
    commandName: 'prune',
    commandExplanation: 'The --foreground-scripts flag runs lifecycle scripts in the foreground.',
  });
  tasks.push({
    id: taskId++,
    title: 'Ignore scripts during prune',
    description: 'Skip lifecycle scripts',
    expectedCommand: 'npm prune --ignore-scripts',
    hint: 'Use --ignore-scripts flag',
    commandName: 'prune',
    commandExplanation: 'The --ignore-scripts flag prevents running lifecycle scripts during prune.',
  });
  tasks.push({
    id: taskId++,
    title: 'Prune in workspace',
    description: 'Prune specific workspace',
    expectedCommand: 'npm prune --workspace=packages/app',
    hint: 'Use --workspace flag',
    commandName: 'prune',
    commandExplanation: 'The --workspace flag prunes in a specific workspace.',
  });
  tasks.push({
    id: taskId++,
    title: 'Prune all workspaces',
    description: 'Prune in all workspaces',
    expectedCommand: 'npm prune --workspaces',
    hint: 'Use --workspaces flag',
    commandName: 'prune',
    commandExplanation: 'The --workspaces flag prunes in all workspaces.',
  });
  tasks.push({
    id: taskId++,
    title: 'Include workspace root',
    description: 'Prune root with workspaces',
    expectedCommand: 'npm prune --include-workspace-root',
    hint: 'Use --include-workspace-root flag',
    commandName: 'prune',
    commandExplanation: 'The --include-workspace-root flag includes the root project when using workspaces.',
  });
  tasks.push({
    id: taskId++,
    title: 'Prune with install-links',
    description: 'Pack file: protocols',
    expectedCommand: 'npm prune --install-links',
    hint: 'Use --install-links flag',
    commandName: 'prune',
    commandExplanation: 'The --install-links flag packs file: protocol dependencies instead of symlinking.',
  });
  // ========== END PRUNE TASKS ==========

  // ========== DEDUPE TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-dedupe
  // Basic dedupe operation
  tasks.push({
    id: taskId++,
    title: 'Deduplicate packages',
    description: 'Simplify dependency tree',
    expectedCommand: 'npm dedupe',
    hint: 'Deduplicate packages',
    commandName: 'dedupe',
    commandExplanation: 'Simplifies the dependency tree by deduplicating packages.',
  });
  
  // Configuration flags (in documentation order)
  tasks.push({
    id: taskId++,
    title: 'Dedupe with hoisted strategy',
    description: 'Use hoisted install strategy',
    expectedCommand: 'npm dedupe --install-strategy=hoisted',
    hint: 'Use --install-strategy=hoisted flag',
    commandName: 'dedupe',
    commandExplanation: 'The --install-strategy=hoisted flag uses hoisted installation (default).',
  });
  tasks.push({
    id: taskId++,
    title: 'Dedupe with nested strategy',
    description: 'Use nested install strategy',
    expectedCommand: 'npm dedupe --install-strategy=nested',
    hint: 'Use --install-strategy=nested flag',
    commandName: 'dedupe',
    commandExplanation: 'The --install-strategy=nested flag installs packages in place without hoisting.',
  });
  tasks.push({
    id: taskId++,
    title: 'Dedupe with shallow strategy',
    description: 'Use shallow install strategy',
    expectedCommand: 'npm dedupe --install-strategy=shallow',
    hint: 'Use --install-strategy=shallow flag',
    commandName: 'dedupe',
    commandExplanation: 'The --install-strategy=shallow flag installs only direct deps at top-level.',
  });
  tasks.push({
    id: taskId++,
    title: 'Dedupe with linked strategy',
    description: 'Use experimental linked strategy',
    expectedCommand: 'npm dedupe --install-strategy=linked',
    hint: 'Use --install-strategy=linked flag',
    commandName: 'dedupe',
    commandExplanation: 'The --install-strategy=linked flag uses experimental linked installation.',
  });
  tasks.push({
    id: taskId++,
    title: 'Dedupe with legacy bundling',
    description: 'Use legacy-bundling flag',
    expectedCommand: 'npm dedupe --legacy-bundling',
    hint: 'Use --legacy-bundling flag (deprecated)',
    commandName: 'dedupe',
    commandExplanation: 'The --legacy-bundling flag installs without hoisting (deprecated, use --install-strategy=nested).',
  });
  tasks.push({
    id: taskId++,
    title: 'Dedupe with global style',
    description: 'Use global-style flag',
    expectedCommand: 'npm dedupe --global-style',
    hint: 'Use --global-style flag (deprecated)',
    commandName: 'dedupe',
    commandExplanation: 'The --global-style flag installs only direct deps at top-level (deprecated, use --install-strategy=shallow).',
  });
  tasks.push({
    id: taskId++,
    title: 'Strict peer dependencies',
    description: 'Fail on peer conflicts',
    expectedCommand: 'npm dedupe --strict-peer-deps',
    hint: 'Use --strict-peer-deps flag',
    commandName: 'dedupe',
    commandExplanation: 'The --strict-peer-deps flag treats conflicting peer dependencies as failures.',
  });
  tasks.push({
    id: taskId++,
    title: 'Dedupe without package-lock',
    description: 'Ignore package-lock.json',
    expectedCommand: 'npm dedupe --no-package-lock',
    hint: 'Use --no-package-lock flag',
    commandName: 'dedupe',
    commandExplanation: 'The --no-package-lock flag ignores and prevents writing package-lock.json.',
  });
  tasks.push({
    id: taskId++,
    title: 'Omit dev dependencies',
    description: 'Exclude devDependencies',
    expectedCommand: 'npm dedupe --omit=dev',
    hint: 'Use --omit=dev flag',
    commandName: 'dedupe',
    commandExplanation: 'The --omit=dev flag excludes devDependencies from the tree.',
  });
  tasks.push({
    id: taskId++,
    title: 'Omit optional dependencies',
    description: 'Exclude optional',
    expectedCommand: 'npm dedupe --omit=optional',
    hint: 'Use --omit=optional flag',
    commandName: 'dedupe',
    commandExplanation: 'The --omit=optional flag excludes optional dependencies from the tree.',
  });
  tasks.push({
    id: taskId++,
    title: 'Omit peer dependencies',
    description: 'Exclude peer',
    expectedCommand: 'npm dedupe --omit=peer',
    hint: 'Use --omit=peer flag',
    commandName: 'dedupe',
    commandExplanation: 'The --omit=peer flag excludes peer dependencies from the tree.',
  });
  tasks.push({
    id: taskId++,
    title: 'Include dev dependencies',
    description: 'Ensure devDependencies included',
    expectedCommand: 'npm dedupe --include=dev',
    hint: 'Use --include=dev flag',
    commandName: 'dedupe',
    commandExplanation: 'The --include=dev flag ensures devDependencies are included.',
  });
  tasks.push({
    id: taskId++,
    title: 'Ignore scripts during dedupe',
    description: 'Skip lifecycle scripts',
    expectedCommand: 'npm dedupe --ignore-scripts',
    hint: 'Use --ignore-scripts flag',
    commandName: 'dedupe',
    commandExplanation: 'The --ignore-scripts flag prevents running lifecycle scripts during dedupe.',
  });
  tasks.push({
    id: taskId++,
    title: 'Skip audit during dedupe',
    description: 'Disable audit reports',
    expectedCommand: 'npm dedupe --no-audit',
    hint: 'Use --no-audit flag',
    commandName: 'dedupe',
    commandExplanation: 'The --no-audit flag skips submitting audit reports.',
  });
  tasks.push({
    id: taskId++,
    title: 'No bin links during dedupe',
    description: 'Skip creating symlinks',
    expectedCommand: 'npm dedupe --no-bin-links',
    hint: 'Use --no-bin-links flag',
    commandName: 'dedupe',
    commandExplanation: 'The --no-bin-links flag prevents creating symlinks for package executables.',
  });
  tasks.push({
    id: taskId++,
    title: 'No funding message',
    description: 'Suppress funding message',
    expectedCommand: 'npm dedupe --no-fund',
    hint: 'Use --no-fund flag',
    commandName: 'dedupe',
    commandExplanation: 'The --no-fund flag suppresses the funding message.',
  });
  tasks.push({
    id: taskId++,
    title: 'Dry run dedupe',
    description: 'Preview dedupe changes',
    expectedCommand: 'npm dedupe --dry-run',
    hint: 'Use --dry-run flag',
    commandName: 'dedupe',
    commandExplanation: 'The --dry-run flag shows what would be done without making changes.',
  });
  tasks.push({
    id: taskId++,
    title: 'Dedupe in workspace',
    description: 'Dedupe specific workspace',
    expectedCommand: 'npm dedupe --workspace=packages/app',
    hint: 'Use --workspace flag',
    commandName: 'dedupe',
    commandExplanation: 'The --workspace flag dedupes in a specific workspace.',
  });
  tasks.push({
    id: taskId++,
    title: 'Dedupe all workspaces',
    description: 'Dedupe in all workspaces',
    expectedCommand: 'npm dedupe --workspaces',
    hint: 'Use --workspaces flag',
    commandName: 'dedupe',
    commandExplanation: 'The --workspaces flag dedupes in all workspaces.',
  });
  tasks.push({
    id: taskId++,
    title: 'Include workspace root',
    description: 'Dedupe root with workspaces',
    expectedCommand: 'npm dedupe --include-workspace-root',
    hint: 'Use --include-workspace-root flag',
    commandName: 'dedupe',
    commandExplanation: 'The --include-workspace-root flag includes the root project when using workspaces.',
  });
  tasks.push({
    id: taskId++,
    title: 'Dedupe with install-links',
    description: 'Pack file: protocols',
    expectedCommand: 'npm dedupe --install-links',
    hint: 'Use --install-links flag',
    commandName: 'dedupe',
    commandExplanation: 'The --install-links flag packs file: protocol dependencies instead of symlinking.',
  });
  // ========== END DEDUPE TASKS ==========

  // ========== FIND-DUPES TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-find-dupes
  // Basic find-dupes operation
  tasks.push({
    id: taskId++,
    title: 'Find duplicate packages',
    description: 'List duplicates without changing',
    expectedCommand: 'npm find-dupes',
    hint: 'Find duplicate packages',
    commandName: 'find-dupes',
    commandExplanation: 'Shows duplicate packages without making changes (dedupe --dry-run).',
  });
  
  // Configuration flags (in documentation order - same as dedupe)
  tasks.push({
    id: taskId++,
    title: 'Find dupes with hoisted',
    description: 'Check dupes with hoisted strategy',
    expectedCommand: 'npm find-dupes --install-strategy=hoisted',
    hint: 'Use --install-strategy=hoisted flag',
    commandName: 'find-dupes',
    commandExplanation: 'The --install-strategy=hoisted flag uses hoisted installation strategy.',
  });
  tasks.push({
    id: taskId++,
    title: 'Find dupes with nested',
    description: 'Check dupes with nested strategy',
    expectedCommand: 'npm find-dupes --install-strategy=nested',
    hint: 'Use --install-strategy=nested flag',
    commandName: 'find-dupes',
    commandExplanation: 'The --install-strategy=nested flag uses nested installation strategy.',
  });
  tasks.push({
    id: taskId++,
    title: 'Find dupes with shallow',
    description: 'Check dupes with shallow strategy',
    expectedCommand: 'npm find-dupes --install-strategy=shallow',
    hint: 'Use --install-strategy=shallow flag',
    commandName: 'find-dupes',
    commandExplanation: 'The --install-strategy=shallow flag uses shallow installation strategy.',
  });
  tasks.push({
    id: taskId++,
    title: 'Find dupes with linked',
    description: 'Check dupes with linked strategy',
    expectedCommand: 'npm find-dupes --install-strategy=linked',
    hint: 'Use --install-strategy=linked flag',
    commandName: 'find-dupes',
    commandExplanation: 'The --install-strategy=linked flag uses experimental linked installation.',
  });
  tasks.push({
    id: taskId++,
    title: 'Find dupes legacy bundling',
    description: 'Check with legacy-bundling',
    expectedCommand: 'npm find-dupes --legacy-bundling',
    hint: 'Use --legacy-bundling flag (deprecated)',
    commandName: 'find-dupes',
    commandExplanation: 'The --legacy-bundling flag checks for dupes with nested strategy (deprecated).',
  });
  tasks.push({
    id: taskId++,
    title: 'Find dupes global style',
    description: 'Check with global-style',
    expectedCommand: 'npm find-dupes --global-style',
    hint: 'Use --global-style flag (deprecated)',
    commandName: 'find-dupes',
    commandExplanation: 'The --global-style flag checks for dupes with shallow strategy (deprecated).',
  });
  tasks.push({
    id: taskId++,
    title: 'Strict peer deps check',
    description: 'Fail on peer conflicts',
    expectedCommand: 'npm find-dupes --strict-peer-deps',
    hint: 'Use --strict-peer-deps flag',
    commandName: 'find-dupes',
    commandExplanation: 'The --strict-peer-deps flag treats conflicting peer dependencies as failures.',
  });
  tasks.push({
    id: taskId++,
    title: 'Find dupes without lock',
    description: 'Ignore package-lock.json',
    expectedCommand: 'npm find-dupes --no-package-lock',
    hint: 'Use --no-package-lock flag',
    commandName: 'find-dupes',
    commandExplanation: 'The --no-package-lock flag ignores package-lock.json during analysis.',
  });
  tasks.push({
    id: taskId++,
    title: 'Find dupes omit dev',
    description: 'Exclude devDependencies',
    expectedCommand: 'npm find-dupes --omit=dev',
    hint: 'Use --omit=dev flag',
    commandName: 'find-dupes',
    commandExplanation: 'The --omit=dev flag excludes devDependencies from the tree.',
  });
  tasks.push({
    id: taskId++,
    title: 'Find dupes omit optional',
    description: 'Exclude optional',
    expectedCommand: 'npm find-dupes --omit=optional',
    hint: 'Use --omit=optional flag',
    commandName: 'find-dupes',
    commandExplanation: 'The --omit=optional flag excludes optional dependencies from the tree.',
  });
  tasks.push({
    id: taskId++,
    title: 'Find dupes omit peer',
    description: 'Exclude peer',
    expectedCommand: 'npm find-dupes --omit=peer',
    hint: 'Use --omit=peer flag',
    commandName: 'find-dupes',
    commandExplanation: 'The --omit=peer flag excludes peer dependencies from the tree.',
  });
  tasks.push({
    id: taskId++,
    title: 'Find dupes include dev',
    description: 'Ensure devDependencies included',
    expectedCommand: 'npm find-dupes --include=dev',
    hint: 'Use --include=dev flag',
    commandName: 'find-dupes',
    commandExplanation: 'The --include=dev flag ensures devDependencies are included in analysis.',
  });
  tasks.push({
    id: taskId++,
    title: 'Find dupes ignore scripts',
    description: 'Skip lifecycle scripts',
    expectedCommand: 'npm find-dupes --ignore-scripts',
    hint: 'Use --ignore-scripts flag',
    commandName: 'find-dupes',
    commandExplanation: 'The --ignore-scripts flag prevents running lifecycle scripts.',
  });
  tasks.push({
    id: taskId++,
    title: 'Find dupes no audit',
    description: 'Skip audit reports',
    expectedCommand: 'npm find-dupes --no-audit',
    hint: 'Use --no-audit flag',
    commandName: 'find-dupes',
    commandExplanation: 'The --no-audit flag skips submitting audit reports.',
  });
  tasks.push({
    id: taskId++,
    title: 'Find dupes no bin links',
    description: 'Skip bin link analysis',
    expectedCommand: 'npm find-dupes --no-bin-links',
    hint: 'Use --no-bin-links flag',
    commandName: 'find-dupes',
    commandExplanation: 'The --no-bin-links flag prevents bin link analysis.',
  });
  tasks.push({
    id: taskId++,
    title: 'Find dupes no funding',
    description: 'Suppress funding message',
    expectedCommand: 'npm find-dupes --no-fund',
    hint: 'Use --no-fund flag',
    commandName: 'find-dupes',
    commandExplanation: 'The --no-fund flag suppresses the funding message.',
  });
  tasks.push({
    id: taskId++,
    title: 'Find dupes in workspace',
    description: 'Check dupes in specific workspace',
    expectedCommand: 'npm find-dupes --workspace=packages/app',
    hint: 'Use --workspace flag',
    commandName: 'find-dupes',
    commandExplanation: 'The --workspace flag finds dupes in a specific workspace.',
  });
  tasks.push({
    id: taskId++,
    title: 'Find dupes all workspaces',
    description: 'Check dupes in all workspaces',
    expectedCommand: 'npm find-dupes --workspaces',
    hint: 'Use --workspaces flag',
    commandName: 'find-dupes',
    commandExplanation: 'The --workspaces flag finds dupes in all workspaces.',
  });
  tasks.push({
    id: taskId++,
    title: 'Find dupes workspace root',
    description: 'Include root with workspaces',
    expectedCommand: 'npm find-dupes --include-workspace-root',
    hint: 'Use --include-workspace-root flag',
    commandName: 'find-dupes',
    commandExplanation: 'The --include-workspace-root flag includes the root project when using workspaces.',
  });
  tasks.push({
    id: taskId++,
    title: 'Find dupes install-links',
    description: 'Analyze packed file: protocols',
    expectedCommand: 'npm find-dupes --install-links',
    hint: 'Use --install-links flag',
    commandName: 'find-dupes',
    commandExplanation: 'The --install-links flag analyzes packed file: protocol dependencies.',
  });
  // ========== END FIND-DUPES TASKS ==========

  // ========== REBUILD TASKS ==========
  // Reference: https://docs.npmjs.com/cli/v11/commands/npm-rebuild
  // Basic rebuild operations
  tasks.push({
    id: taskId++,
    title: 'Rebuild all packages',
    description: 'Rebuild all installed packages',
    expectedCommand: 'npm rebuild',
    hint: 'Rebuild all packages',
    commandName: 'rebuild',
    commandExplanation: 'Rebuilds all packages by running lifecycle scripts and linking bins.',
  });
  tasks.push({
    id: taskId++,
    title: 'Rebuild specific package',
    description: 'Rebuild only bcrypt',
    expectedCommand: 'npm rebuild bcrypt',
    hint: 'Rebuild specific package',
    commandName: 'rebuild',
    commandExplanation: 'Rebuilds only the specified package.',
  });
  
  // Configuration flags (in documentation order)
  tasks.push({
    id: taskId++,
    title: 'Rebuild global packages',
    description: 'Rebuild globally installed packages',
    expectedCommand: 'npm rebuild --global',
    hint: 'Use --global flag',
    commandName: 'rebuild',
    commandExplanation: 'The --global flag rebuilds globally installed packages.',
  });
  tasks.push({
    id: taskId++,
    title: 'Rebuild without bin links',
    description: 'Skip creating symlinks',
    expectedCommand: 'npm rebuild --no-bin-links',
    hint: 'Use --no-bin-links flag',
    commandName: 'rebuild',
    commandExplanation: 'The --no-bin-links flag prevents creating symlinks for executables during rebuild.',
  });
  tasks.push({
    id: taskId++,
    title: 'Foreground scripts rebuild',
    description: 'Run scripts in foreground',
    expectedCommand: 'npm rebuild --foreground-scripts',
    hint: 'Use --foreground-scripts flag',
    commandName: 'rebuild',
    commandExplanation: 'The --foreground-scripts flag runs build scripts in the foreground for debugging.',
  });
  tasks.push({
    id: taskId++,
    title: 'Ignore scripts rebuild',
    description: 'Skip lifecycle scripts',
    expectedCommand: 'npm rebuild --ignore-scripts',
    hint: 'Use --ignore-scripts flag',
    commandName: 'rebuild',
    commandExplanation: 'The --ignore-scripts flag prevents running lifecycle scripts during rebuild.',
  });
  tasks.push({
    id: taskId++,
    title: 'Rebuild in workspace',
    description: 'Rebuild specific workspace',
    expectedCommand: 'npm rebuild --workspace=packages/app',
    hint: 'Use --workspace flag',
    commandName: 'rebuild',
    commandExplanation: 'The --workspace flag rebuilds packages in a specific workspace.',
  });
  tasks.push({
    id: taskId++,
    title: 'Rebuild all workspaces',
    description: 'Rebuild in all workspaces',
    expectedCommand: 'npm rebuild --workspaces',
    hint: 'Use --workspaces flag',
    commandName: 'rebuild',
    commandExplanation: 'The --workspaces flag rebuilds packages in all workspaces.',
  });
  tasks.push({
    id: taskId++,
    title: 'Rebuild workspace root',
    description: 'Include root with workspaces',
    expectedCommand: 'npm rebuild --include-workspace-root',
    hint: 'Use --include-workspace-root flag',
    commandName: 'rebuild',
    commandExplanation: 'The --include-workspace-root flag includes the root project when rebuilding workspaces.',
  });
  tasks.push({
    id: taskId++,
    title: 'Rebuild with install-links',
    description: 'Pack file: protocols',
    expectedCommand: 'npm rebuild --install-links',
    hint: 'Use --install-links flag',
    commandName: 'rebuild',
    commandExplanation: 'The --install-links flag packs file: protocol dependencies instead of symlinking.',
  });
  // ========== END REBUILD TASKS ==========
  
  for (const cmd of NPM_COMMANDS) {
    // Skip auto-generating tasks for commands with comprehensive task sections
    if (cmd.name === 'init') {
      continue; // Skip init - we have comprehensive tasks above
    }
    
    if (cmd.name === 'install') {
      continue; // Skip install - we have comprehensive tasks above
    }
    
    if (cmd.name === 'uninstall') {
      continue; // Skip uninstall - we have comprehensive tasks above
    }
    
    if (cmd.name === 'ci') {
      continue; // Skip ci - we have comprehensive tasks above
    }
    
    if (cmd.name === 'update') {
      continue; // Skip update - we have comprehensive tasks above
    }
    
    if (cmd.name === 'list') {
      continue; // Skip list - we have comprehensive tasks above
    }
    
    if (cmd.name === 'outdated') {
      continue; // Skip outdated - we have comprehensive tasks above
    }
    
    if (cmd.name === 'audit') {
      continue; // Skip audit - we have comprehensive tasks above
    }
    
    if (cmd.name === 'run') {
      continue; // Skip run - we have comprehensive tasks above
    }
    
    if (cmd.name === 'test') {
      continue; // Skip test - we have comprehensive tasks above
    }
    
    if (cmd.name === 'start') {
      continue; // Skip start - we have comprehensive tasks above
    }
    
    if (cmd.name === 'stop') {
      continue; // Skip stop - we have comprehensive tasks above
    }
    
    if (cmd.name === 'restart') {
      continue; // Skip restart - we have comprehensive tasks above
    }
    
    if (cmd.name === 'install-test') {
      continue; // Skip install-test - we have comprehensive tasks above
    }
    
    if (cmd.name === 'install-ci-test') {
      continue; // Skip install-ci-test - we have comprehensive tasks above
    }
    
    if (cmd.name === 'version') {
      continue; // Skip version - we have comprehensive tasks above
    }
    
    if (cmd.name === 'publish') {
      continue; // Skip publish - we have comprehensive tasks above
    }
    
    if (cmd.name === 'unpublish') {
      continue; // Skip unpublish - we have comprehensive tasks above
    }
    
    if (cmd.name === 'deprecate') {
      continue; // Skip deprecate - we have comprehensive tasks above
    }
    
    if (cmd.name === 'search') {
      continue; // Skip search - we have comprehensive tasks above
    }
    
    if (cmd.name === 'view') {
      continue; // Skip view - we have comprehensive tasks above
    }
    
    if (cmd.name === 'explain') {
      continue; // Skip explain - we have comprehensive tasks above
    }
    
    if (cmd.name === 'fund') {
      continue; // Skip fund - we have comprehensive tasks above
    }
    
    if (cmd.name === 'config') {
      continue; // Skip config - we have comprehensive tasks above
    }
    
    if (cmd.name === 'get') {
      continue; // Skip get - we have comprehensive tasks above
    }
    
    if (cmd.name === 'set') {
      continue; // Skip set - we have comprehensive tasks above
    }
    
    if (cmd.name === 'cache') {
      continue; // Skip cache - we have comprehensive tasks above
    }
    
    if (cmd.name === 'prune') {
      continue; // Skip prune - we have comprehensive tasks above
    }
    
    if (cmd.name === 'dedupe') {
      continue; // Skip dedupe - we have comprehensive tasks above
    }
    
    if (cmd.name === 'find-dupes') {
      continue; // Skip find-dupes - we have comprehensive tasks above
    }
    
    if (cmd.name === 'rebuild') {
      continue; // Skip rebuild - we have comprehensive tasks above
    }
    
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
        exampleValue = '@mycompany';
      } else if (param.name === '--init-author-name') {
        exampleValue = '"John Doe"';
      } else if (param.name === '--init-author-email') {
        exampleValue = '"john@example.org"';
      } else if (param.name === '--init-author-url') {
        exampleValue = '"https://johndoe.dev"';
      } else if (param.name === '--init-license') {
        exampleValue = '"GPL-3.0"';
      } else if (param.name === '--init-version') {
        exampleValue = '"1.5.0"';
      } else if (param.name === '--init-type') {
        exampleValue = '"module"';
      } else if (param.name === '--init-module') {
        exampleValue = '"./my-init.js"';
      } else if (param.name === '-w' || param.name === '--workspace') {
        exampleValue = '"packages/tools"';
      }
      
      const paramDesc = parameterTaskDescriptions[cmd.name]?.[param.name];
      
      if (requiresPackage) {
        const examplePackage = examplePackages[packageIndex % examplePackages.length];
        packageIndex++;
        
        const expectedCmd = param.requiresValue
          ? `npm ${cmd.name} ${examplePackage} ${param.name} ${exampleValue}`
          : `npm ${cmd.name} ${examplePackage} ${param.name}`;
        
        tasks.push({
          id: taskId++,
          title: paramDesc ? paramDesc.title(examplePackage) : `Install ${examplePackage} with special option`,
          description: paramDesc ? paramDesc.description(examplePackage) : param.description,
          expectedCommand: expectedCmd,
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
        // For init command, use = syntax for parameters that require values
        const expectedCmd = param.requiresValue
          ? `npm ${cmd.name} ${param.name}=${finalValue}`
          : `npm ${cmd.name} ${param.name}`;
        
        tasks.push({
          id: taskId++,
          title: paramDesc ? paramDesc.title() : `${cmd.description} with additional option`,
          description: paramDesc ? paramDesc.description() : param.description,
          expectedCommand: expectedCmd,
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
