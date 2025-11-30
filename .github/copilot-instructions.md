# NPM Learning App - Workspace Instructions

## Project Overview
Cross-platform npm command learning application built with React Native (Expo) for mobile/desktop and React for web.

## Architecture
- **Shared Core**: Command parser, task system, npm command database, mock outputs
- **Mobile/Desktop**: React Native + Expo (iOS, Android, Windows, macOS)
- **Web**: React web application
- **Language**: TypeScript

## Key Features
- 65+ npm commands with all parameters
- Command alias support (init/create, install/i/add, etc.)
- Flexible parameter ordering
- Mock command outputs (no real execution)
- Progressive task-based learning
- Cross-platform deployment

## Development Guidelines
- Use TypeScript for all code
- Share business logic between platforms
- Keep UI components platform-specific
- Mock all npm command outputs
- Validate commands without execution

## Project Status
- [x] Workspace initialized
- [x] Expo project scaffolded
- [x] Core modules implemented
- [x] Dependencies installed
- [x] Documentation complete

