# NPM Practice - Interactive npm Learning App

Learn npm commands through hands-on practice! This cross-platform application teaches you all 65+ npm commands with their parameters through interactive tasks.

## Features

- ✅ **65+ npm commands** with comprehensive parameter coverage
- 🔄 **Command alias support** (e.g., `npm i` = `npm install` = `npm add`)
- 🎯 **Flexible parameter ordering** - enter parameters in any order
- 🎭 **Mock command outputs** - see realistic results without executing real commands
- 📊 **Progress tracking** - monitor your learning journey
- 🌍 **Cross-platform** - iOS, Android, Windows, macOS, and Web

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- For mobile development: [Expo Go](https://expo.dev/client) app on your phone

### Installation

```bash
npm install
```

### Running the App

#### Web (Recommended for quick testing)
```bash
npm run web
```

#### iOS
```bash
npm run ios
```

#### Android
```bash
npm run android
```

#### Start Development Server
```bash
npm start
```

Then scan the QR code with:
- **iOS**: Camera app
- **Android**: Expo Go app

## How It Works

### 1. Task-Based Learning
Each npm command is broken down into tasks:
- Base command usage
- Individual parameter usage
- Real-world scenarios

### 2. Smart Command Parsing
The app understands:
- **Aliases**: `npm init` = `npm create`
- **Parameter aliases**: `-g` = `--global`, `-D` = `--save-dev`
- **Parameter order**: `npm i lodash -g` = `npm i -g lodash`

### 3. Mock Execution
All commands show realistic outputs without actually executing, making it safe to practice commands like:
- `npm publish`
- `npm unpublish`
- `npm install -g`

## Project Structure

```
├── src/
│   └── core/               # Shared business logic
│       ├── commands.ts     # 65+ npm command definitions
│       ├── parser.ts       # Command parsing engine
│       ├── taskSystem.ts   # Task generation & validation
│       └── index.ts        # Core exports
├── App.tsx                 # React Native UI
├── app.json               # Expo configuration
└── package.json
```

## Technology Stack

- **Framework**: React Native + Expo
- **Language**: TypeScript
- **Platform Support**: 
  - Mobile: iOS, Android (via Expo)
  - Desktop: Windows, macOS (via Expo)
  - Web: Browser (via Expo Web)

## Building for Production

### iOS (App Store)
```bash
npx eas build --platform ios
```

### Android (Google Play)
```bash
npx eas build --platform android
```

### Web
```bash
npx expo export:web
```

## Development Roadmap

- [x] Core command parser with alias support
- [x] Task generation system
- [x] Basic UI for mobile
- [ ] Desktop-optimized UI
- [ ] Web-optimized UI
- [ ] User authentication
- [ ] Cloud progress sync
- [ ] Achievement system
- [ ] Command search
- [ ] Custom task creation

## Contributing

This is an open-source educational project. Contributions welcome!

### Adding New Commands

1. Edit `src/core/commands.ts`
2. Add command definition with parameters and mock output
3. Tasks are auto-generated

### Improving Mock Outputs

Real npm outputs are stored in each command's `mockOutput` field. To improve realism:

1. Run actual npm command
2. Copy the output
3. Update the `mockOutput` in `commands.ts`

## License

MIT License - feel free to use this project for learning or teaching!

## Author

Created by [MaxBlack-dev](https://github.com/MaxBlack-dev)

## Acknowledgments

- npm team for the amazing package manager
- Expo team for cross-platform framework
- Everyone learning and teaching npm

---

**Happy Learning! 🚀**

*Learn by doing - master npm commands one task at a time!*
