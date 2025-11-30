/**
 * NPM Command Definitions
 * Contains all 65+ npm commands with their aliases and parameters
 */

export interface CommandParameter {
  name: string;
  aliases?: string[];
  description: string;
  requiresValue?: boolean;
}

export interface NpmCommand {
  name: string;
  aliases?: string[];
  description: string;
  parameters: CommandParameter[];
  mockOutput: string;
}

export const NPM_COMMANDS: NpmCommand[] = [
  {
    name: 'init',
    aliases: ['create'],
    description: 'Create a package.json file',
    parameters: [
      { name: '-y', aliases: ['--yes'], description: 'Use default values', requiresValue: false },
      { name: '--scope', description: 'Set package scope', requiresValue: true },
    ],
    mockOutput: 'Wrote to package.json:\n\n{\n  "name": "my-project",\n  "version": "1.0.0",\n  "description": "",\n  "main": "index.js",\n  "scripts": {\n    "test": "echo \\"Error: no test specified\\" && exit 1"\n  },\n  "keywords": [],\n  "author": "",\n  "license": "ISC"\n}',
  },
  {
    name: 'install',
    aliases: ['i', 'add'],
    description: 'Install packages',
    parameters: [
      { name: '-g', aliases: ['--global'], description: 'Install globally', requiresValue: false },
      { name: '--save-dev', aliases: ['-D'], description: 'Save to devDependencies', requiresValue: false },
      { name: '--save', aliases: ['-S'], description: 'Save to dependencies', requiresValue: false },
      { name: '--save-optional', aliases: ['-O'], description: 'Save to optionalDependencies', requiresValue: false },
      { name: '--no-save', description: 'Prevent saving to dependencies', requiresValue: false },
      { name: '--save-exact', aliases: ['-E'], description: 'Save exact version', requiresValue: false },
      { name: '--save-bundle', aliases: ['-B'], description: 'Save to bundleDependencies', requiresValue: false },
    ],
    mockOutput: '\nadded 1 package, and audited 2 packages in 3s\n\nfound 0 vulnerabilities',
  },
  {
    name: 'uninstall',
    aliases: ['remove', 'rm', 'r', 'un', 'unlink'],
    description: 'Remove packages',
    parameters: [
      { name: '-g', aliases: ['--global'], description: 'Uninstall globally', requiresValue: false },
      { name: '--save', aliases: ['-S'], description: 'Remove from dependencies', requiresValue: false },
      { name: '--save-dev', aliases: ['-D'], description: 'Remove from devDependencies', requiresValue: false },
    ],
    mockOutput: '\nremoved 1 package, and audited 1 package in 1s\n\nfound 0 vulnerabilities',
  },
  {
    name: 'update',
    aliases: ['up', 'upgrade'],
    description: 'Update packages',
    parameters: [
      { name: '-g', aliases: ['--global'], description: 'Update globally', requiresValue: false },
      { name: '--save', aliases: ['-S'], description: 'Update and save to dependencies', requiresValue: false },
    ],
    mockOutput: '\nupdated 1 package, and audited 2 packages in 2s\n\nfound 0 vulnerabilities',
  },
  {
    name: 'list',
    aliases: ['ls', 'll', 'la'],
    description: 'List installed packages',
    parameters: [
      { name: '-g', aliases: ['--global'], description: 'List global packages', requiresValue: false },
      { name: '--depth', description: 'Max depth of tree', requiresValue: true },
      { name: '--json', description: 'Output as JSON', requiresValue: false },
    ],
    mockOutput: 'my-project@1.0.0 C:\\Users\\user\\project\n└── lodash@4.17.21',
  },
  {
    name: 'run',
    aliases: ['run-script'],
    description: 'Run a script from package.json',
    parameters: [
      { name: '--silent', description: 'Suppress output', requiresValue: false },
    ],
    mockOutput: '\n> my-project@1.0.0 start\n> node index.js\n\nHello World!',
  },
  {
    name: 'test',
    aliases: ['t', 'tst'],
    description: 'Run tests',
    parameters: [],
    mockOutput: '\n> my-project@1.0.0 test\n> jest\n\nPASS  ./app.test.js\n  ✓ renders correctly (5ms)\n\nTest Suites: 1 passed, 1 total\nTests:       1 passed, 1 total',
  },
  {
    name: 'start',
    description: 'Start the application',
    parameters: [],
    mockOutput: '\n> my-project@1.0.0 start\n> node index.js\n\nServer is running on port 3000',
  },
  {
    name: 'version',
    aliases: ['v'],
    description: 'Display npm version',
    parameters: [
      { name: '--json', description: 'Output as JSON', requiresValue: false },
    ],
    mockOutput: '{\n  npm: \'10.2.4\',\n  node: \'20.11.0\',\n  v8: \'11.3.244.8-node.16\',\n  uv: \'1.46.0\',\n  zlib: \'1.3\',\n  brotli: \'1.0.9\',\n  ares: \'1.20.1\',\n  modules: \'115\',\n  nghttp2: \'1.58.0\',\n  napi: \'9\',\n  llhttp: \'8.1.1\',\n  uvwasi: \'0.0.19\',\n  acorn: \'8.11.2\',\n  simdutf: \'4.0.4\',\n  undici: \'5.28.2\',\n  openssl: \'3.0.12+quic\'\n}',
  },
  {
    name: 'publish',
    description: 'Publish a package to the registry',
    parameters: [
      { name: '--access', description: 'Set access level (public/restricted)', requiresValue: true },
      { name: '--tag', description: 'Tag to publish', requiresValue: true },
      { name: '--dry-run', description: 'Test without publishing', requiresValue: false },
    ],
    mockOutput: 'npm notice \nnpm notice 📦  my-package@1.0.0\nnpm notice === Tarball Contents ===\nnpm notice 1.1kB package.json\nnpm notice 524B  index.js\nnpm notice === Tarball Details ===\nnpm notice name:          my-package\nnpm notice version:       1.0.0\nnpm notice package size:  1.2 kB\nnpm notice unpacked size: 1.6 kB\nnpm notice total files:   2\nnpm notice \n+ my-package@1.0.0',
  },
  {
    name: 'unpublish',
    description: 'Remove a package from the registry',
    parameters: [
      { name: '--force', aliases: ['-f'], description: 'Force unpublish', requiresValue: false },
    ],
    mockOutput: '- my-package@1.0.0',
  },
  {
    name: 'search',
    aliases: ['s', 'se', 'find'],
    description: 'Search for packages',
    parameters: [
      { name: '--long', description: 'Display full package descriptions', requiresValue: false },
      { name: '--json', description: 'Output as JSON', requiresValue: false },
    ],
    mockOutput: 'NAME                      | DESCRIPTION          | AUTHOR          | DATE       | VERSION\nlodash                    | Lodash modular utilities | jdalton | 2023-02-15 | 4.17.21',
  },
  {
    name: 'view',
    aliases: ['info', 'show', 'v'],
    description: 'View package information',
    parameters: [
      { name: '--json', description: 'Output as JSON', requiresValue: false },
    ],
    mockOutput: 'lodash@4.17.21 | MIT | deps: none | versions: 116\nLodash modular utilities.\nhttps://lodash.com/\n\nkeywords: modules, stdlib, util\n\ndist\n.tarball: https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz\n.shasum: 679591c564c3bffaae8454cf0b3df370c3d6911c',
  },
  {
    name: 'outdated',
    description: 'Check for outdated packages',
    parameters: [
      { name: '-g', aliases: ['--global'], description: 'Check global packages', requiresValue: false },
      { name: '--json', description: 'Output as JSON', requiresValue: false },
    ],
    mockOutput: 'Package   Current  Wanted  Latest  Location\nlodash    4.17.20  4.17.21 4.17.21 node_modules/lodash',
  },
  {
    name: 'audit',
    description: 'Run security audit',
    parameters: [
      { name: '--fix', description: 'Automatically fix vulnerabilities', requiresValue: false },
      { name: '--json', description: 'Output as JSON', requiresValue: false },
      { name: '--audit-level', description: 'Minimum level to exit with error', requiresValue: true },
    ],
    mockOutput: 'found 0 vulnerabilities',
  },
  {
    name: 'config',
    aliases: ['c'],
    description: 'Manage npm configuration',
    parameters: [
      { name: 'set', description: 'Set config value', requiresValue: true },
      { name: 'get', description: 'Get config value', requiresValue: true },
      { name: 'delete', description: 'Delete config value', requiresValue: true },
      { name: 'list', description: 'List all config', requiresValue: false },
      { name: '--global', aliases: ['-g'], description: 'Use global config', requiresValue: false },
    ],
    mockOutput: '; "user" config from C:\\Users\\user\\.npmrc\n\ninit-author-name = "Your Name"\nregistry = "https://registry.npmjs.org/"',
  },
  {
    name: 'cache',
    description: 'Manage npm cache',
    parameters: [
      { name: 'clean', description: 'Clean cache', requiresValue: false },
      { name: 'verify', description: 'Verify cache', requiresValue: false },
      { name: '--force', aliases: ['-f'], description: 'Force operation', requiresValue: false },
    ],
    mockOutput: 'Cache verified and compressed\nContent verified: 1234 (56.7 MB)\nIndex entries: 5678\nFinished in 3.45s',
  },
  {
    name: 'doctor',
    description: 'Check npm environment',
    parameters: [],
    mockOutput: 'Check                               Value   Recommendation\nnpm ping                            ok      \nnpm -v                              v10.2.4 Use npm v10.8.2\nnode -v                             v20.11.0 Use node v20.15.0\nnpm config get registry             ok      using default registry\nwhich git                           ok      C:\\Program Files\\Git\\cmd\\git.EXE',
  },
  {
    name: 'prune',
    description: 'Remove extraneous packages',
    parameters: [
      { name: '--production', description: 'Remove devDependencies', requiresValue: false },
      { name: '--dry-run', description: 'Show what would be removed', requiresValue: false },
    ],
    mockOutput: 'removed 15 packages in 1.2s',
  },
  {
    name: 'dedupe',
    aliases: ['ddp'],
    description: 'Reduce package duplication',
    parameters: [],
    mockOutput: 'removed 3 packages, and changed 5 packages in 2s',
  },
  {
    name: 'link',
    aliases: ['ln'],
    description: 'Create a symlink to a package',
    parameters: [
      { name: '--global', aliases: ['-g'], description: 'Link globally', requiresValue: false },
    ],
    mockOutput: 'C:\\Users\\user\\AppData\\Roaming\\npm\\node_modules\\my-package -> C:\\Users\\user\\my-package',
  },
  {
    name: 'ci',
    aliases: ['clean-install', 'ic'],
    description: 'Clean install from package-lock',
    parameters: [],
    mockOutput: '\nadded 145 packages in 5.3s',
  },
  {
    name: 'exec',
    aliases: ['x'],
    description: 'Execute a package binary',
    parameters: [
      { name: '--package', aliases: ['-p'], description: 'Package to execute', requiresValue: true },
    ],
    mockOutput: 'Package executed successfully',
  },
  {
    name: 'explain',
    aliases: ['why'],
    description: 'Explain why a package is installed',
    parameters: [],
    mockOutput: 'lodash@4.17.21\nnode_modules/lodash\n  lodash@"^4.17.0" from my-project@1.0.0\n  node_modules/my-project',
  },
  {
    name: 'fund',
    description: 'Display funding information',
    parameters: [
      { name: '--json', description: 'Output as JSON', requiresValue: false },
    ],
    mockOutput: 'my-project@1.0.0\n├── https://github.com/sponsors/author1\n│   └── package1@1.0.0\n└── https://opencollective.com/project2\n    └── package2@2.0.0\n\n2 packages are looking for funding',
  },
  {
    name: 'help',
    aliases: ['?'],
    description: 'Get help on npm',
    parameters: [],
    mockOutput: 'npm <command>\n\nUsage:\n\nnpm install        install all the dependencies in your project\nnpm install <foo>  add the <foo> dependency to your project\nnpm test           run this project\'s tests\nnpm run <foo>      run the script named <foo>\nnpm <command> -h   quick help on <command>\nnpm -l             display usage info for all commands',
  },
  {
    name: 'help-search',
    description: 'Search npm help documentation',
    parameters: [],
    mockOutput: 'Top hits for "install"\n———————————————————————————————————\nnpm install\n  Install a package',
  },
  {
    name: 'hook',
    description: 'Manage registry hooks',
    parameters: [
      { name: 'add', description: 'Add hook', requiresValue: true },
      { name: 'ls', description: 'List hooks', requiresValue: false },
      { name: 'rm', description: 'Remove hook', requiresValue: true },
    ],
    mockOutput: 'No hooks configured',
  },
  {
    name: 'org',
    description: 'Manage organization',
    parameters: [
      { name: 'set', description: 'Set organization property', requiresValue: true },
      { name: 'ls', description: 'List organizations', requiresValue: false },
    ],
    mockOutput: '@myorg',
  },
  {
    name: 'owner',
    aliases: ['author'],
    description: 'Manage package owners',
    parameters: [
      { name: 'add', description: 'Add owner', requiresValue: true },
      { name: 'rm', description: 'Remove owner', requiresValue: true },
      { name: 'ls', description: 'List owners', requiresValue: false },
    ],
    mockOutput: 'username <user@example.com>',
  },
  {
    name: 'pack',
    description: 'Create a tarball from a package',
    parameters: [
      { name: '--dry-run', description: 'Test without creating tarball', requiresValue: false },
    ],
    mockOutput: 'npm notice \nnpm notice 📦  my-package@1.0.0\nnpm notice === Tarball Contents ===\nnpm notice 1.1kB package.json\nnpm notice 524B  index.js\nnpm notice === Tarball Details ===\nnpm notice name:          my-package\nnpm notice version:       1.0.0\nnpm notice filename:      my-package-1.0.0.tgz\nnpm notice package size:  1.2 kB\nnpm notice unpacked size: 1.6 kB\nnpm notice total files:   2\nnpm notice \nmy-package-1.0.0.tgz',
  },
  {
    name: 'ping',
    description: 'Ping npm registry',
    parameters: [],
    mockOutput: 'Ping success: wrote to registry in 256ms',
  },
  {
    name: 'prefix',
    description: 'Display prefix',
    parameters: [
      { name: '-g', aliases: ['--global'], description: 'Display global prefix', requiresValue: false },
    ],
    mockOutput: 'C:\\Users\\user\\project',
  },
  {
    name: 'profile',
    description: 'Manage npm profile',
    parameters: [
      { name: 'get', description: 'Get profile property', requiresValue: false },
      { name: 'set', description: 'Set profile property', requiresValue: true },
    ],
    mockOutput: '┌─────────────┬────────────────────┐\n│ name        │ username           │\n├─────────────┼────────────────────┤\n│ email       │ user@example.com   │\n├─────────────┼────────────────────┤\n│ created     │ 2023-01-15         │\n└─────────────┴────────────────────┘',
  },
  {
    name: 'rebuild',
    aliases: ['rb'],
    description: 'Rebuild a package',
    parameters: [],
    mockOutput: 'rebuilt dependencies',
  },
  {
    name: 'repo',
    description: 'Open package repository in browser',
    parameters: [],
    mockOutput: 'Opening https://github.com/lodash/lodash in browser',
  },
  {
    name: 'restart',
    description: 'Restart a package',
    parameters: [],
    mockOutput: '\n> my-project@1.0.0 restart\n> npm stop && npm start',
  },
  {
    name: 'root',
    description: 'Display npm root',
    parameters: [
      { name: '-g', aliases: ['--global'], description: 'Display global root', requiresValue: false },
    ],
    mockOutput: 'C:\\Users\\user\\project\\node_modules',
  },
  {
    name: 'set-script',
    description: 'Set a package.json script',
    parameters: [],
    mockOutput: 'Added script "build": "tsc"',
  },
  {
    name: 'shrinkwrap',
    description: 'Lock dependencies',
    parameters: [],
    mockOutput: 'wrote npm-shrinkwrap.json',
  },
  {
    name: 'star',
    description: 'Mark a package as favorite',
    parameters: [],
    mockOutput: '★ lodash',
  },
  {
    name: 'stars',
    description: 'View starred packages',
    parameters: [],
    mockOutput: 'lodash\nexpress\nreact',
  },
  {
    name: 'stop',
    description: 'Stop a package',
    parameters: [],
    mockOutput: '\n> my-project@1.0.0 stop\n> node stop.js',
  },
  {
    name: 'team',
    description: 'Manage organization teams',
    parameters: [
      { name: 'create', description: 'Create team', requiresValue: true },
      { name: 'destroy', description: 'Destroy team', requiresValue: true },
      { name: 'add', description: 'Add user to team', requiresValue: true },
      { name: 'rm', description: 'Remove user from team', requiresValue: true },
      { name: 'ls', description: 'List teams', requiresValue: false },
    ],
    mockOutput: '@myorg:developers\n@myorg:admins',
  },
  {
    name: 'token',
    description: 'Manage authentication tokens',
    parameters: [
      { name: 'list', description: 'List tokens', requiresValue: false },
      { name: 'create', description: 'Create token', requiresValue: false },
      { name: 'revoke', description: 'Revoke token', requiresValue: true },
    ],
    mockOutput: '┌────────┬─────────┬────────────┬──────────┐\n│ token  │ created │ readonly   │ CIDR     │\n├────────┼─────────┼────────────┼──────────┤\n│ abc123 │ 2023-01 │ no         │          │\n└────────┴─────────┴────────────┴──────────┘',
  },
  {
    name: 'unstar',
    description: 'Unmark a package as favorite',
    parameters: [],
    mockOutput: '☆ lodash',
  },
  {
    name: 'whoami',
    description: 'Display npm username',
    parameters: [],
    mockOutput: 'username',
  },
  {
    name: 'access',
    description: 'Manage package access',
    parameters: [
      { name: 'public', description: 'Make package public', requiresValue: false },
      { name: 'restricted', description: 'Make package restricted', requiresValue: false },
      { name: 'grant', description: 'Grant access', requiresValue: true },
      { name: 'revoke', description: 'Revoke access', requiresValue: true },
    ],
    mockOutput: 'Set package access to public',
  },
  {
    name: 'adduser',
    aliases: ['login', 'add-user'],
    description: 'Add a registry user account',
    parameters: [
      { name: '--registry', description: 'Registry URL', requiresValue: true },
      { name: '--scope', description: 'Scope for authentication', requiresValue: true },
    ],
    mockOutput: 'Logged in as username on https://registry.npmjs.org/.',
  },
  {
    name: 'logout',
    description: 'Log out of the registry',
    parameters: [
      { name: '--registry', description: 'Registry URL', requiresValue: true },
      { name: '--scope', description: 'Scope for authentication', requiresValue: true },
    ],
    mockOutput: 'Logged out from https://registry.npmjs.org/',
  },
  {
    name: 'bugs',
    aliases: ['issues'],
    description: 'Open package bugs page in browser',
    parameters: [],
    mockOutput: 'Opening https://github.com/lodash/lodash/issues in browser',
  },
  {
    name: 'docs',
    aliases: ['home'],
    description: 'Open package documentation in browser',
    parameters: [],
    mockOutput: 'Opening https://lodash.com/ in browser',
  },
  {
    name: 'edit',
    description: 'Edit an installed package',
    parameters: [],
    mockOutput: 'Opening package in editor',
  },
  {
    name: 'explore',
    description: 'Browse an installed package',
    parameters: [],
    mockOutput: 'Spawning shell in package directory',
  },
  {
    name: 'diff',
    description: 'Show package diff',
    parameters: [],
    mockOutput: 'diff --git a/index.js b/index.js\nindex 1234567..abcdefg 100644\n--- a/index.js\n+++ b/index.js\n@@ -1,3 +1,3 @@\n-console.log("old");\n+console.log("new");',
  },
  {
    name: 'dist-tag',
    aliases: ['dist-tags'],
    description: 'Modify package distribution tags',
    parameters: [
      { name: 'add', description: 'Add tag', requiresValue: true },
      { name: 'rm', description: 'Remove tag', requiresValue: true },
      { name: 'ls', description: 'List tags', requiresValue: false },
    ],
    mockOutput: 'latest: 1.0.0\nbeta: 1.1.0-beta.0',
  },
  {
    name: 'deprecate',
    description: 'Deprecate a package version',
    parameters: [],
    mockOutput: 'Deprecated my-package@1.0.0',
  },
  {
    name: 'completion',
    description: 'Tab completion for npm',
    parameters: [],
    mockOutput: '###-begin-npm-completion-###\n# npm command completion script',
  },
  {
    name: 'bin',
    description: 'Display npm bin folder',
    parameters: [
      { name: '-g', aliases: ['--global'], description: 'Display global bin folder', requiresValue: false },
    ],
    mockOutput: 'C:\\Users\\user\\project\\node_modules\\.bin',
  },
  {
    name: 'pkg',
    description: 'Manage package.json',
    parameters: [
      { name: 'get', description: 'Get a field', requiresValue: true },
      { name: 'set', description: 'Set a field', requiresValue: true },
      { name: 'delete', description: 'Delete a field', requiresValue: true },
    ],
    mockOutput: '{\n  "name": "my-project",\n  "version": "1.0.0"\n}',
  },
  {
    name: 'query',
    description: 'Query installed packages with CSS selectors',
    parameters: [],
    mockOutput: '[\n  {\n    "name": "lodash",\n    "version": "4.17.21"\n  }\n]',
  },
  {
    name: 'sbom',
    description: 'Generate a Software Bill of Materials',
    parameters: [
      { name: '--format', description: 'Output format', requiresValue: true },
    ],
    mockOutput: '{\n  "bomFormat": "CycloneDX",\n  "specVersion": "1.4",\n  "version": 1,\n  "components": []\n}',
  },
];
