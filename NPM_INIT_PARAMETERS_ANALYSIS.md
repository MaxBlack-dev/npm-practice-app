# NPM Init Parameters - Comprehensive Analysis

**Source Analysis Date:** December 1, 2025  
**NPM CLI Version Analyzed:** 11.6.4  
**Repositories Analyzed:**
- https://github.com/npm/cli
- https://github.com/npm/init-package-json

---

## Summary of Findings

All `--init-*` parameters work **INDEPENDENTLY**. The assumption that all three author parameters must be used together is **INCORRECT**.

---

## ALL Supported `--init-*` Parameters

### 1. `--init-author-name`
- **Type:** String
- **Default:** `""` (empty string)
- **Description:** The value `npm init` should use by default for the package author's name
- **Works Independently:** ✅ YES
- **Source:** `npm-cli-source/workspaces/config/lib/definitions/definitions.js:943-950`

### 2. `--init-author-email`
- **Type:** String
- **Default:** `""` (empty string)
- **Description:** The value `npm init` should use by default for the package author's email
- **Works Independently:** ✅ YES
- **Source:** `npm-cli-source/workspaces/config/lib/definitions/definitions.js:934-942`

### 3. `--init-author-url`
- **Type:** URL or empty string
- **Default:** `""` (empty string)
- **Description:** The value `npm init` should use by default for the package author's homepage
- **Works Independently:** ✅ YES
- **Source:** `npm-cli-source/workspaces/config/lib/definitions/definitions.js:951-958`

### 4. `--init-license`
- **Type:** String
- **Default:** `"ISC"`
- **Description:** The value `npm init` should use by default for the package license
- **Works Independently:** ✅ YES
- **Source:** `npm-cli-source/workspaces/config/lib/definitions/definitions.js:959-966`

### 5. `--init-module`
- **Type:** Path
- **Default:** `"~/.npm-init.js"`
- **Description:** A module that will be loaded by the `npm init` command. See init-package-json documentation
- **Works Independently:** ✅ YES
- **Source:** `npm-cli-source/workspaces/config/lib/definitions/definitions.js:967-977`

### 6. `--init-version`
- **Type:** Semver
- **Default:** `"1.0.0"`
- **Description:** The value that `npm init` should use by default for the package version number, if not already set in package.json
- **Works Independently:** ✅ YES
- **Source:** `npm-cli-source/workspaces/config/lib/definitions/definitions.js:986-994`

### 7. `--init-type`
- **Type:** String
- **Default:** `"commonjs"`
- **Description:** The value that `npm init` should use by default for the package.json type field
- **Works Independently:** ✅ YES
- **Added In:** Modern npm versions (Node.js ESM support era)
- **Source:** `npm-cli-source/workspaces/config/lib/definitions/definitions.js:978-985`

### 8. `--init-private`
- **Type:** Boolean
- **Default:** `false`
- **Description:** The value `npm init` should use by default for the package's private flag
- **Works Independently:** ✅ YES
- **Special Note:** Only included in output if explicitly set or already exists in package.json
- **Source:** `npm-cli-source/workspaces/config/lib/definitions/definitions.js:995-1003`

---

## Deprecated Parameters (Still Supported)

These are **historical aliases** that still work but are deprecated:

### 9. `init.author.email` (Deprecated)
- **Type:** String
- **Replacement:** `--init-author-email`
- **Source:** `npm-cli-source/workspaces/config/lib/definitions/definitions.js:1005-1013`

### 10. `init.author.name` (Deprecated)
- **Type:** String
- **Replacement:** `--init-author-name`
- **Source:** `npm-cli-source/workspaces/config/lib/definitions/definitions.js:1014-1023`

### 11. `init.author.url` (Deprecated)
- **Type:** URL or empty string
- **Replacement:** `--init-author-url`
- **Source:** `npm-cli-source/workspaces/config/lib/definitions/definitions.js:1024-1033`

### 12. `init.license` (Deprecated)
- **Type:** String
- **Replacement:** `--init-license`
- **Source:** `npm-cli-source/workspaces/config/lib/definitions/definitions.js:1034-1043`

### 13. `init.module` (Deprecated)
- **Type:** Path
- **Replacement:** `--init-module`
- **Source:** `npm-cli-source/workspaces/config/lib/definitions/definitions.js:1044-1053`

### 14. `init.version` (Deprecated)
- **Type:** Semver
- **Replacement:** `--init-version`
- **Source:** `npm-cli-source/workspaces/config/lib/definitions/definitions.js:1054-1063`

---

## How Author Field Construction Works

### The Critical Code Logic

**Location:** `init-package-json/lib/default-input.js:255-263`

```javascript
if (!package.author) {
  const authorName = getConfig('author.name')
  exports.author = authorName
    ? {
      name: authorName,
      email: getConfig('author.email'),
      url: getConfig('author.url'),
    }
    : yes ? '' : prompt('author')
}
```

### Key Discovery: `getConfig()` Function

**Location:** `init-package-json/lib/default-input.js:51-57`

```javascript
const getConfig = (key) => {
  // dots take precedence over dashes
  const def = config?.defaults?.[`init.${key}`]
  const val = config.get(`init.${key}`)
  return (val !== def && val) ? val : config.get(`init-${key.replace(/\./g, '-')}`)
}
```

### How It Actually Works

1. **Config Priority:**
   - First checks: `init.author.name` (deprecated dotted format)
   - Then checks: `init-author-name` (modern dashed format)

2. **Author Object Construction:**
   - **IF** `init-author-name` is set (non-empty):
     - Creates an object: `{ name: ..., email: ..., url: ... }`
     - Email and URL are fetched independently (can be empty strings)
     - All three values are collected regardless of whether they're set
   - **ELSE** (no author name):
     - Prompts user or leaves empty

3. **Author Field Stringification:**

**Location:** `init-package-json/lib/init-package-json.js:41-46`

```javascript
const stringifyPerson = (p) => {
  const { name, url, web, email, mail } = p
  const u = url || web
  const e = email || mail
  return `${name}${e ? ` <${e}>` : ''}${u ? ` (${u})` : ''}`
}
```

**Location:** `init-package-json/lib/init-package-json.js:85`

```javascript
if (pkg.content.author) {
  pkg.content.author = stringifyPerson(pkg.content.author)
}
```

### Examples of Author Field Output

1. **All three parameters set:**
   ```
   --init-author-name="John Doe" --init-author-email="john@example.com" --init-author-url="https://johndoe.com"
   → "author": "John Doe <john@example.com> (https://johndoe.com)"
   ```

2. **Only name set:**
   ```
   --init-author-name="John Doe"
   → "author": "John Doe"
   ```

3. **Name and email only:**
   ```
   --init-author-name="John Doe" --init-author-email="john@example.com"
   → "author": "John Doe <john@example.com>"
   ```

4. **Name and URL only:**
   ```
   --init-author-name="John Doe" --init-author-url="https://johndoe.com"
   → "author": "John Doe (https://johndoe.com)"
   ```

5. **None set:**
   ```
   (no author parameters)
   → "author": "" (or prompts if not using --yes)
   ```

---

## Which Parameters Work Independently vs Together

### ✅ ALL PARAMETERS WORK INDEPENDENTLY

Every single `--init-*` parameter can be used alone or in any combination:

- ✅ `--init-author-name` alone works
- ✅ `--init-author-email` alone works (but won't appear in output without name)
- ✅ `--init-author-url` alone works (but won't appear in output without name)
- ✅ `--init-license` alone works
- ✅ `--init-version` alone works
- ✅ `--init-module` alone works
- ✅ `--init-type` alone works
- ✅ `--init-private` alone works

### ⚠️ Important Caveat for Author Parameters

While they work independently from a **configuration perspective**, the **author field output** has this behavior:

- **`--init-author-name`** is the **trigger** for including author information
- If name is NOT set → email and url are ignored (won't appear in package.json)
- If name IS set → email and url are optional additions to the author string

**This is NOT a requirement that they must be used together**, but rather a **logical dependency** where:
- Email/URL without a name don't make semantic sense
- The code checks for name first before constructing the author object

---

## Undocumented Parameters

### None Found

All parameters found in the code are documented in:
- The npm configuration definitions
- The official npm documentation
- The `npm init` command help

**Conclusion:** No undocumented `--init-*` parameters exist in the npm CLI source code.

---

## Test Evidence

**Location:** `init-package-json/test/npm-defaults.js`

The test file confirms that ALL three author parameters work together:

```javascript
const env = {
  npm_config_yes: 'yes',
  npm_config_silent: 'true',
  npm_config_init_author_name: 'npmbot',
  npm_config_init_author_email: 'n@p.m',
  npm_config_init_author_url: 'http://npm.im',
  npm_config_init_license: EXPECTED.license,
  npm_config_init_version: EXPECTED.version,
}
```

**Expected Output:**
```javascript
author: 'npmbot <n@p.m> (http://npm.im/)'
```

The test demonstrates that when all three are provided, they produce a properly formatted author string.

---

## Usage Recommendations for Learning App

### For Teaching npm init

1. **Correct Information:**
   - All `--init-*` parameters work independently
   - You can use any subset of author parameters
   - Name is required for email/url to appear in output

2. **Suggested Mock Behavior:**

```javascript
// Correct implementation
function formatAuthor(name, email, url) {
  if (!name) {
    // No author field if no name
    return undefined;
  }
  
  let author = name;
  if (email) author += ` <${email}>`;
  if (url) author += ` (${url})`;
  return author;
}

// Examples:
formatAuthor("John", "", "") → "John"
formatAuthor("John", "j@e.com", "") → "John <j@e.com>"
formatAuthor("John", "", "http://j.com") → "John (http://j.com)"
formatAuthor("John", "j@e.com", "http://j.com") → "John <j@e.com> (http://j.com)"
formatAuthor("", "j@e.com", "") → undefined (no author field)
```

3. **Parameter Independence:**
   - Each parameter sets its own default value
   - Each can be configured in `.npmrc` independently
   - Each can be passed on command line independently
   - Only the author field has logical composition rules

---

## Complete Parameter List for Implementation

```typescript
interface NpmInitParameters {
  // Author parameters (compose into single "author" field)
  'init-author-name': string;      // default: ""
  'init-author-email': string;     // default: ""
  'init-author-url': string;       // default: ""
  
  // Independent package.json fields
  'init-license': string;          // default: "ISC"
  'init-version': string;          // default: "1.0.0"
  'init-type': string;             // default: "commonjs"
  'init-private': boolean;         // default: false
  
  // Special behavior
  'init-module': string;           // default: "~/.npm-init.js"
}
```

---

## Sources Referenced

1. **npm CLI Repository:**
   - `lib/commands/init.js` - Main init command
   - `workspaces/config/lib/definitions/definitions.js` - All config parameter definitions

2. **init-package-json Repository:**
   - `lib/init-package-json.js` - Main initialization logic
   - `lib/default-input.js` - Default value handling and author construction
   - `test/npm-defaults.js` - Test demonstrating all parameters working together

---

## Conclusion

**All `--init-*` parameters are independent.** The three author parameters (name, email, url) compose into a single author field with specific formatting rules, but they can each be set independently. The name parameter acts as the trigger for including author information, while email and url are optional additions.

This analysis is based on direct source code review of the official npm CLI and init-package-json repositories.
