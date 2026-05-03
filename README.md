# DayBridge

A senior-friendly daily support planner that helps older adults living independently manage their routines alongside their care circles.

🌐 **Live demo:** [https://daybridge.app](https://daybridge.app)

---

## Features

| Category | Details |
|---|---|
| **Impact** | Replaces scattered sticky notes with one clear, accessible daily board. Prioritizes dignity and independence for seniors. |
| **AI Care Plan Builder** | Converts a care need into practical daily steps using a guided SMART-goal conversation (powered by Cohere `command-r-08-2024`). |
| **Day Map & Timeline** | Visual solar-system view of active care plans alongside a traditional calendar for timeline tracking. |
| **Care Circle** | Match with family and helpers for shared visibility without surveillance. Includes audio calls. |
| **Accessibility** | Built with Atkinson Hyperlegible font, `prefers-reduced-motion` support, full ARIA labels, and high contrast OKLCH colors. |
| **Guest Mode** | Zero-friction onboarding — try the full application without an account, then upgrade when ready. |

---

## Project Structure

```text
.
├── src/
│   ├── components/       # UI Components (GalaxyMap, Dashboard, etc.)
│   ├── lib/              # Utilities and analytics
│   ├── services/         # Data hooks for Goals, Tasks, Milestones
│   └── App.tsx           # React routing and layout wrapper
├── convex/               # Backend logic
│   ├── ai.ts             # Cohere integration for SMART goals
│   ├── users.ts          # Authentication and user profiles
│   └── schema.ts         # Database schema
└── index.css             # Tailwind configuration and custom animations
```

---

## Prerequisites

```text
node >= 18
npm >= 9
```

1. **Convex Backend:** You need a Convex deployment to run the backend.
2. **Environment Variables:** See `.env.example` for the required keys. 

---

## Building and Running

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run locally**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

---

## Judging Criteria Highlights (Grizzly Hacks III)

1. **Impact & Accessibility Value (25%)** — Direct focus on an underserved demographic (seniors). Accessible font choice, large hit targets, and plain language.
2. **Functionality & Technical Implementation (25%)** — Real-time updates via Convex, sophisticated AI conversation flow with queue system and retries, guest auth flow.
3. **User Experience & Accessibility-First Design (25%)** — Calm UI defaults to the accessible "Care Plans" list. `prefers-reduced-motion` ensures animations don't trigger nausea.
4. **Innovation & Creativity (25%)** — Using AI to translate care needs into actionable checklists is a novel application of LLMs beyond simple chat interfaces.

---

## Contributors

This project was worked on by:
- Andrey Vasilyev
