# QuizWar — Setup Guide

## 1. Firebase Project Setup

### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** → name it (e.g., `quizwar`)
3. Disable Google Analytics (optional) → **Create Project**

### Enable Anonymous Auth
1. In Firebase Console → **Build** → **Authentication**
2. Click **"Get started"**
3. Enable **Anonymous** sign-in provider → **Save**

### Enable Realtime Database
1. Go to **Build** → **Realtime Database**
2. Click **"Create Database"**
3. Choose a location → Start in **test mode** (for development)
4. Your database URL will look like: `https://your-project-default-rtdb.firebaseio.com`

### Get Firebase Config
1. Go to **Project Settings** (gear icon) → **General**
2. Under "Your apps", click the **Web** icon (`</>`)
3. Register the app (nickname: `quizwar-web`)
4. Copy the `firebaseConfig` object

---

## 2. Configure Environment Files

Paste your Firebase config into both files:

**`src/environments/environment.ts`** (development):
```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIza...',
    authDomain: 'your-project.firebaseapp.com',
    databaseURL: 'https://your-project-default-rtdb.firebaseio.com',
    projectId: 'your-project',
    storageBucket: 'your-project.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abcdef'
  }
};
```

**`src/environments/environment.prod.ts`** — same config with `production: true`

---

## 3. Run Locally

```bash
# Install dependencies
npm install

# Fill in your Firebase config in src/environments/environment.ts

# Start dev server
ng serve
# or
npm start
```

Open `http://localhost:4200` in your browser.

**To test multiplayer:** Open two browser tabs/windows (or use incognito), each with a different nickname.

---

## 4. Deploy to Render

### Option A: Using render.yaml (Blueprint)
1. Push code to a GitHub/GitLab repository
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click **"New"** → **"Blueprint"**
4. Connect your repo — Render auto-detects `render.yaml`
5. Deploy!

### Option B: Manual Setup
1. Click **"New"** → **"Static Site"**
2. Connect your GitHub repo
3. Set:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist/quiz-war/browser`
4. Add a rewrite rule: `/*` → `/index.html` (for SPA routing)
5. Deploy!

---

## Firebase Realtime Database Rules (Production)

For production, update your rules in Firebase Console → Realtime Database → Rules:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

> ⚠️ For a production app, add more restrictive rules to validate data and prevent cheating.
