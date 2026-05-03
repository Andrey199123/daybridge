# DayBridge

**A senior-friendly daily support planner that helps older adults living independently manage their routines alongside their care circles.**

🌐 **Live demo:** https://daybridge.app

---

## The Problem

Older adults living independently often juggle medication reminders, doctor visits, transportation, errands, meals, paperwork, and family check-ins across sticky notes, texts, phone calls, and multiple apps. Small misses — forgetting the insurance card before a clinic visit, missing a medication refill, hesitating to ask for help — can threaten independence and confidence.

Most productivity tools assume fast typing, small screens, solo use, and abstract task labels. They are not built for this daily reality.

## How DayBridge Helps

DayBridge creates **one accessible daily board** with:
- **Large controls and plain labels** — designed for seniors, not tech-savvy workers
- **AI-assisted care plan builder** — converts a care need into practical checkpoints through a guided conversation (powered by Cohere)
- **Care circle visibility** — family and helpers see what is done, what is next, and where support is needed — without constant calls
- **Safety boundaries** — DayBridge reminds; it never diagnoses, prescribes, or changes care instructions

## Key Features

| Feature | Description |
|---|---|
| **Day Map** | Visual solar-system view of active care plans with progress rings |
| **AI Care Plan Builder** | SMART-goal guided AI chat that turns a care need into tasks |
| **Calendar & Timeline** | Tasks organized by day, week, and month |
| **Care Circle** | Match with helpers; share quiet status signals |
| **Milestones & Streaks** | Track completed plans and daily engagement |
| **Care Summary** | AI-generated plain-language summary for family and helper handoffs |
| **Guest Mode** | Try the full app without an account — no friction barrier |
| **Accessible UI** | Atkinson Hyperlegible font, large hit targets, high contrast, reduced-motion support, full ARIA labels |

## Accessibility-First Design

- Font: [Atkinson Hyperlegible](https://brailleinstitute.org/freefont) — designed specifically for low-vision readers
- `prefers-reduced-motion` fully supported — all animations disabled when the OS setting is on
- Focus-visible rings on every interactive element
- ARIA labels and `aria-current` on navigation
- Minimum 44px touch targets throughout
- High-contrast color system built on OKLCH with WCAG AA compliant ratios

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Convex (real-time, serverless) |
| Auth | Convex Auth (email + anonymous guest) |
| AI | Cohere `command-r-08-2024` via Convex actions |
| Animation | Framer Motion |
| Deployment | Vercel |

## Running Locally

```bash
npm install
npm run dev
```

For the full backend, add the required Convex and auth environment variables. See `.env.example` for expected keys — it is prefilled for the DayBridge Convex deployment (`amicable-rabbit-184`); copy it to `.env.local` for local dev.

## Build

```bash
npm run build
```

## Design Philosophy

DayBridge focuses on **day-to-day usefulness** over gamified complexity:

- **Calm, not chaotic** — one daily board, not five dashboards
- **Shared, not isolated** — care circle visibility without surveillance
- **Accessible, not dumbed-down** — plain language with full functionality
- **Safe boundaries** — AI helps with logistics, not medical decisions

The interface is intentionally calm, high-contrast, and focused on what matters most: helping seniors maintain independence with dignity while giving their care circle enough context to help without hovering.
