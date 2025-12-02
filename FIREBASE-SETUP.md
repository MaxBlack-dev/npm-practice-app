# Firebase Analytics Setup Guide

Firebase Analytics is now integrated into the app to track usage statistics. The app **works perfectly offline** - analytics events are queued locally and sent when internet connection is available.

## 🎛️ Local Development vs Production

### For Local Development (Default):
Analytics is **disabled by default** to avoid Firebase requests during development.

The `.env` file is configured with:
```bash
EXPO_PUBLIC_ENABLE_ANALYTICS=false
```

This means **zero network requests** to Google while developing locally.

### To Enable Analytics (Testing/Production):
Change `.env` to:
```bash
EXPO_PUBLIC_ENABLE_ANALYTICS=true
```

Then restart the dev server (`npm start`).

## 🚀 Quick Start Summary

**Want to develop locally without Firebase?**  
✅ Already done! `.env` has `EXPO_PUBLIC_ENABLE_ANALYTICS=false` by default.

**Want to set up Firebase analytics?**
1. Create Firebase project
2. Copy config to `src/analytics/firebase.ts`
3. Change `.env` to `EXPO_PUBLIC_ENABLE_ANALYTICS=true`
4. Restart app

**Want to toggle analytics on/off?**  
Just change `EXPO_PUBLIC_ENABLE_ANALYTICS` in `.env` and restart.

---

## 🔧 Setup Steps

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "npm-practice-app")
4. Choose whether to enable Google Analytics (recommended: Yes)
5. Select or create a Google Analytics account
6. Click "Create project"

### 2. Register Your App

#### For Web:
1. In Firebase Console, click the Web icon (</>)
2. Register app with nickname (e.g., "npm-practice-web")
3. Copy the `firebaseConfig` object

#### For iOS:
1. Click the iOS icon
2. Enter iOS bundle ID (from app.json)
3. Download `GoogleService-Info.plist`
4. Place it in your project root

#### For Android:
1. Click the Android icon
2. Enter Android package name (from app.json)
3. Download `google-services.json`
4. Place it in your project root

### 3. Update Firebase Configuration

Open `src/analytics/firebase.ts` and replace the placeholder config with your actual config from Firebase Console:

```typescript
const firebaseConfig = {
  apiKey: "AIza...",  // Your actual API key
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-XXXXXXXXXX"
};
```

### 4. Enable Analytics

Update `.env` file:
```bash
EXPO_PUBLIC_ENABLE_ANALYTICS=true
```

Restart your dev server:
```bash
npm start
```

You should see in console: `📊 Firebase Analytics: Initialized and active`

### 5. Test Analytics

1. Run your app: `npx expo start`
2. Complete a task
3. Wait ~1 hour for data to appear in Firebase Console
4. Check Firebase Console > Analytics > Events

## 🔄 Workflow

### Daily Development (No Firebase):
```bash
# .env file
EXPO_PUBLIC_ENABLE_ANALYTICS=false

# Start app
npm start
```
✅ Zero Firebase requests  
✅ App works 100% normally  
✅ Console shows: "📊 Firebase Analytics: Disabled"

### Testing Analytics:
```bash
# .env file
EXPO_PUBLIC_ENABLE_ANALYTICS=true

# Start app  
npm start
```
✅ Events tracked and sent to Firebase  
✅ Can verify in Firebase Console  
✅ Console shows: "📊 Firebase Analytics: Initialized and active"

### Production Build:
```bash
# Build with analytics enabled
EXPO_PUBLIC_ENABLE_ANALYTICS=true npx expo build
```

## 📊 What Gets Tracked

### Automatic Events:
- App opens
- First app open
- Session duration
- User engagement

### Custom Events:
- ✅ **task_completed** - When user completes a task
  - `task_id`, `command`, `attempts`
- ✅ **command_entered** - When user types a command
  - `command`, `correct` (true/false)
- ✅ **solution_viewed** - When user views the solution
  - `task_id`
- ✅ **progress_reset** - When user resets progress
  - `completion_count`
- ✅ **round_completed** - When user finishes all tasks
  - `completion_count`, `tasks_completed`

### User Properties:
- `completion_count` - Number of times user completed all tasks
- `total_tasks` - Total number of tasks in app
- `favorite_command` - Most practiced command

## 🔍 View Analytics

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click "Analytics" in left sidebar
4. View:
   - **Dashboard**: Overview of users, engagement
   - **Events**: See which events fire most
   - **User Properties**: Segment users
   - **Audiences**: Create user groups
   - **Funnels**: Track user journeys

## 🌐 Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| Web | ✅ Fully Supported | Works out of the box |
| iOS | ✅ Fully Supported | Requires GoogleService-Info.plist |
| Android | ✅ Fully Supported | Requires google-services.json |
| Windows | ⚠️ Partial | Web analytics only |
| macOS | ⚠️ Partial | Web analytics only |

## 🔒 Privacy & Offline Mode

### Offline Behavior:
- ✅ App works 100% normally without internet
- ✅ Events are queued locally when offline
- ✅ Auto-syncs when connection returns
- ✅ No errors or app crashes if network unavailable
- ✅ No blocking or waiting for analytics

### Privacy:
- No personally identifiable information (PII) is collected
- User IDs are anonymous
- IP addresses can be anonymized (enable in Firebase Console)
- Complies with GDPR when configured properly
- Users can't be individually identified

### Data Retention:
- Free tier: 2 months of raw data
- With Google Analytics 4 link: 14 months
- Aggregated data: Unlimited

## 🚀 Testing Analytics

1. Run your app: `npx expo start`
2. Complete a task
3. Wait ~1 hour for data to appear in Firebase Console
4. Check Firebase Console > Analytics > Events

### Debug Mode (Instant Events):
```bash
# Enable debug mode to see events immediately
npx expo start --clear
```

Then check Firebase Console > Analytics > DebugView for real-time events.

## 💰 Cost

Firebase Analytics is **completely free** with unlimited events, users, and data. No credit card required.

## 🛠️ Troubleshooting

### Events not appearing?
- Wait 24 hours - initial data processing can take time
- Check Firebase Console > Analytics > DebugView
- Verify firebaseConfig is correct
- Check browser console for errors

### App not working offline?
- This shouldn't happen - Firebase is designed for offline use
- Check that you're not blocking the app based on analytics initialization
- Analytics failures are caught and logged, not thrown

## 📚 Learn More

- [Firebase Analytics Docs](https://firebase.google.com/docs/analytics)
- [Expo + Firebase Guide](https://docs.expo.dev/guides/using-firebase/)
- [GA4 Event Reference](https://support.google.com/analytics/answer/9267735)
