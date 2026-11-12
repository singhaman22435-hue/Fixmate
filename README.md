# FixMate 🛠️

> **“Give FixMate a problem. FixMate tells you what it means, what to do, and what action to take.”**

FixMate is a **privacy-first everyday problem-solving application** featuring a **responsive Web application (Next.js)** and a **native Mobile application (React Native + Expo)**. It allows users to scan screenshots, camera photos, PDFs, documents, bank/card statements, product listings, or voice recordings—or simply type a problem.

FixMate automatically detects the user's intent, extracts relevant content via local OCR and document parsers, and analyzes the problem using a local **Ollama** model or a built-in **Deterministic Fallback Engine** with zero cloud tracking and zero paid APIs.

---

## 🎨 Design Philosophy: Light Theme First

FixMate follows a **clean, friendly, light-first visual identity**:
- **Dominant Surfaces:** Very light neutral (`#f8fafc`) and crisp white cards (`#ffffff`).
- **Primary Color:** Professional indigo/royal blue (`#4f46e5`).
- **Typography:** Dark charcoal (`#0f172a`), **never harsh pure black (`#000000`)**.
- **Touch Targets:** Accessible, minimum **44×44 px** touch targets on mobile and web.
- **Tone:** Trust + Intelligence + Simplicity + Privacy.

---

## 🏗️ Architecture

FixMate uses a unified cross-platform architecture where both Web and Mobile interfaces communicate with the same core local backend:

```text
                    FIXMATE
                       │
            ┌──────────┴──────────┐
            │                     │
         WEB APP              MOBILE APP
        Next.js             React Native
       (React 19)           (Expo SDK 52)
            │                     │
            └──────────┬──────────┘
                       │
                  Shared APIs
              (/api/analyze, /api/history)
                       │
              ┌────────┴────────┐
              │                 │
          Core Backend      Local AI Layer
        (Node / Express)     (Ollama / Heuristics)
              │                 │
          Database          OCR / Speech
       (SQLite / Prisma)  (Tesseract / Whisper)
```

---

## 📱 Mobile Application (React Native + Expo)

Located in `mobile/`:
- **Target Platforms:** Android (primary) and iOS.
- **Camera Scanning (`expo-image-picker` / `expo-camera`):** Photograph bills, errors, products, and documents with contextual permission prompts.
- **Gallery Pick:** Select existing screenshots or downloaded receipts.
- **Audio Voice Notes (`expo-av`):** Record spoken tasks and thoughts with microphone feedback and contextual permissions.
- **Document Picker (`expo-document-picker`):** Upload PDF statements and CSV files.
- **Offline & Local AI Connectivity:** Easily configure the backend server IP (defaults to `http://10.0.2.2:3000` for Android Emulator, or your LAN IP for a physical Android device) in the Settings tab.
- **Simple 5-Tab Navigation:**
  - **Solve (Home):** Scan, Speak, Upload, Type + Quick Actions + 1-tap Reconnect.
  - **Tasks:** Real SQLite-backed action items organized into Today, Tomorrow, Later, and Completed.
  - **Subs:** Recurring subscription tracker with frequency math and annual burn calculation.
  - **History:** Search and inspect previous solves with local delete & wipe.
  - **Settings:** Configure server endpoint, auto-detect PC IP, switch between Server and Standalone Offline mode, run connection diagnostics, and manage cache.

---

## 🌟 Core Problem-Solving Capabilities

1. **Screenshot → Action / Fix (`/fix`)**
   - Upload any Windows, Android, compiler, terminal, browser, or npm error screenshot.
   - Extracts root causes, provides step-by-step resolution, safe copyable commands, and cautionary warnings.
2. **Explain This Bill (`/bill`)**
   - Understand electricity, mobile, Wi-Fi bills, and fee invoices.
   - Extracts total payable, due date, line-item breakdowns, and highlights unexpected surcharges or penalty fees.
3. **Forgotten Subscription Finder (`/subscriptions`)**
   - Audit credit card/bank statement PDFs, CSVs, or transaction screenshots.
   - Identifies recurring merchants (Netflix, Spotify, AWS, Gym, utilities), calculates annual burn, and suggests cancellations.
   - **Zero banking credentials or third-party aggregation required.**
4. **What Should I Buy? Purchase Scanner (`/buy`)**
   - Scan product screenshots, specification sheets, and shopping pages.
   - Delivers an honest verdict: who should buy it, who should skip it, pros, cons, and questions to ask before purchasing.
5. **Scam Check (`/scam`)**
   - Paste suspicious SMS, WhatsApp forwards, job offers, lottery winnings, or links.
   - Analyzes social engineering cues, calculates a risk level (LOW / MEDIUM / HIGH), and lists critical "What NOT to do" rules.
   - **Never asks for passwords, OTPs, or private keys.**
6. **Voice Note → To-Do List (`/voice`, `/tasks`)**
   - Speak or upload spoken thoughts. Converts messy dictation into an organized, prioritized action checklist.
   - Export to standard iCalendar (`.ics`) format or copy to clipboard.
7. **Unified AI Analysis Engine (`/`)**
   - A single unified drop zone that automatically routes images, PDFs, CSVs, audio, and text to the appropriate specialized pipeline.
8. **Local SQLite History & Total Erasure (`/history`)**
   - Search, filter by category, export to JSON/Markdown, or wipe all records with one click.

---

## 🔒 Privacy Principles

- **Zero Paid APIs:** No OpenAI, no Gemini, no Claude, no Groq, no OpenRouter.
- **100% Local Processing:** Files are processed on your machine.
- **Offline Fallback Engine:** If Ollama is offline or not installed, FixMate seamlessly falls back to deterministic regex extractors, Tesseract OCR, and rule-based heuristics without crashing.
- **Clean Architecture:** Type-safe modular pipelines with Zod schema validation and robust JSON repair.

---

## 🚀 Running for Real Users (1-Click Launchers)

### 1. Run Production Web Application (Instant Speed)
Double-click:
- **`start-production.bat`**: Initializes SQLite database, launches the optimized production server on `http://localhost:3000` (and `http://10.210.244.81:3000` for phones), and automatically opens your browser.

### 2. Run Mobile App
- **Expo Go (Any Android / iOS Phone)**: Double-click **`start-mobile.bat`** (or `mobile/run-android.bat`). Automatically clears stale ports and launches Metro in LAN mode.
- **Standalone Android APK**: Double-click **`mobile/build-apk.bat`** to trigger an automated EAS build that produces a direct `.apk` installable on any Android phone without Expo Go.

---

## 💻 Commands & Development Workflow

### Web Application

```bash
# Install root dependencies
npm install

# Initialize local SQLite database
npm run db:setup

# Run Web dev server (http://localhost:3000)
npm run web:dev
# or
npm run dev

# Run production build
npm run web:build
```

### Mobile Application

```bash
# Install mobile dependencies
cd mobile && npm install

# Start Expo Development Server
npm run mobile:dev

# Run directly on connected Android device / emulator
npm run mobile:android

# Typecheck mobile TypeScript
npm run mobile:typecheck
```

### Full Quality Verification

```bash
# Run unit & integration tests
npm test

# Run TypeScript check across BOTH Web and Mobile
npm run typecheck

# Run Next.js linting
npm run lint

# Build production web bundle
npm run build
```

---

## 🤖 Setting Up Local Ollama AI

FixMate works completely offline with its **Deterministic Fallback Engine**. For advanced natural language reasoning:

1. **Install Ollama**: Download from [https://ollama.com/download](https://ollama.com/download).
2. **Pull the Recommended Text Model**:
   ```bash
   ollama run llama3.2
   ```
3. **(Optional) Pull the Multimodal Vision Model**:
   ```bash
   ollama run llama3.2-vision
   ```
4. Visit the `/setup` page on Web or the Settings tab on Mobile to verify diagnostic health in real-time.

---

## 📄 License

MIT. Built with 100% open-source software and local AI privacy.
