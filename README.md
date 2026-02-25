# ⚔️ QuizWar ⚔️

**QuizWar** is a real-time, competitive trivia web application built with Angular and Firebase. Dive into fast-paced multiplayer battles, answer questions correctly to build up your streak, activate score multipliers, and compete for end-of-game superlatives!

![QuizWar Logo / Banner](./public/favicon.svg)

## 🌟 Features

- **Real-Time Multiplayer:** Powered by Firebase Realtime Database for seamless, synchronized gameplay across all clients.
- **Selectable & Escalating Difficulty:** Room hosts can choose from preset difficulties (Easy, Medium, Hard, Any) or select **Escalating**, which intelligently sorts fetched questions from easiest to hardest, ramping up the challenge as the game progresses.
- **Custom Emoji Avatars:** Bring personality to the battlefield by selecting a custom emoji avatar before joining a room.
- **Live Emote Overlay:** Taunt your opponents or celebrate a victory with live emotes! These floating chat bubbles cross all players' screens in real-time.
- **Streaks & Multipliers:** Answer correctly in consecutive rounds to build a streak. Hit a streak of 3 or more to unlock a **1.5x score multiplier** and watch your points skyrocket! 
- **Procedural Sound Effects:** Interactive chiptune/8-bit audio generated via the Web Audio API—including metronome countdowns, victory chords, wrong answer buzzes, and a triumphant final fanfare.
- **End-of-Game Superlatives:** A detailed results screen that maps podium standings and awards unique superlatives based on computed stats, including:
  - ⚡ **Fastest Finger:** Awarded to the player with the lowest average response time on correct answers.
  - 🔥 **On Fire!:** Awarded for the highest streak achieved during the game.
  - 🎯 **Sharp Shooter:** Awarded to the player with the highest accuracy percentage.

## 🚀 Tech Stack

- **Framework:** Angular 19+ (Standalone Components, Signals, Reactive Primitives)
- **State & Backend:** Firebase Realtime Database and Anonymous Authentication
- **External APIs:** Open Trivia Database (OpenTDB)
- **Audio:** Web Audio API (No external sound files, fully procedural generated oscillators)
- **Styling:** Vanilla CSS with a custom design system focusing on dark themes, deep glows, and glassmorphism.
- **Deployment:** Render / Static Site Hosting

## 📦 Local Development Setup

To run QuizWar locally, you will need Node.js and the Angular CLI installed.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/haybiz/quizwar.git
   cd quizwar
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Firebase:**
   Create two files in `src/environments/`:
   - `environment.ts`
   - `environment.prod.ts`
   
   Add your Firebase project config to both:
   ```typescript
   export const environment = {
       production: false, // or true for prod
       firebase: {
           apiKey: "YOUR_API_KEY",
           authDomain: "YOUR_AUTH_DOMAIN",
           databaseURL: "YOUR_DATABASE_URL",
           projectId: "YOUR_PROJECT_ID",
           storageBucket: "YOUR_STORAGE_BUCKET",
           messagingSenderId: "YOUR_SENDER_ID",
           appId: "YOUR_APP_ID"
       }
   };
   ```

4. **Start the Development Server:**
   ```bash
   npm run start
   ```
   Navigate to `http://localhost:4200/`. The app will automatically reload if you modify source files.

## 🛠 Building for Production

To build the application for deployment (such as to Render, Vercel, or Firebase Hosting):

```bash
npm run build
```
This will compile the project down to statically hostable files within the `dist/quizwar/browser` directory.

---

*Battle your friends in real-time trivia combat. Grab a crown, show off your smarts, and dominate the war room.*
