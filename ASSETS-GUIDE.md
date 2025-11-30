# Asset Creation Guide

## Current Status
The app currently has placeholder text files instead of actual images. You need to replace these with real PNG images.

## Required Assets

### 1. **icon.png** (1024x1024)
- App icon for iOS and Android
- Should be a square image
- Represents your app in stores and home screens

### 2. **adaptive-icon.png** (1024x1024)
- Android adaptive icon
- Should have important content in center 512x512 area
- Outer areas may be masked on different devices

### 3. **splash.png** (varies)
- Splash screen shown while app loads
- Recommended: 1284x2778 for best compatibility
- Background should match backgroundColor in app.json

### 4. **favicon.png** (48x48 or larger)
- Web favicon
- Shows in browser tab

## Quick Solution Options

### Option 1: Use Online Tools (Easiest)
1. Go to https://www.canva.com or https://www.figma.com
2. Create a 1024x1024 image with:
   - Red background (#CB3837 - npm color)
   - White "npm" text or terminal icon
   - Export as PNG

### Option 2: Use Expo's Asset Generator
Run this command to generate all required assets from a single image:
```bash
npx expo-asset --help
```

### Option 3: Download Free Icons
1. Visit https://www.flaticon.com or https://icons8.com
2. Search for "terminal", "console", or "command line"
3. Download 1024x1024 PNG
4. Customize colors if needed

### Option 4: Use Placeholder Service (Testing Only)
For development/testing, you can temporarily use these URLs:
- Download from https://via.placeholder.com/1024x1024/CB3837/FFFFFF?text=NPM
- Save as required filenames

## Installation Steps

1. Create/download your images
2. Remove the .txt files in the assets/ folder
3. Add the actual PNG files:
   - `assets/icon.png`
   - `assets/adaptive-icon.png`
   - `assets/splash.png`
   - `assets/favicon.png`
4. Commit and push changes

## Quick PowerShell Script
I've created `create-placeholder-assets.ps1` that will generate simple colored placeholders for testing.

Run: `.\create-placeholder-assets.ps1`

This uses PowerShell to create basic PNG files so the app won't crash due to missing assets.
