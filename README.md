# DayBridge

DayBridge is a senior-friendly daily support planner built for Grizzly Hacks III.

It adapts the original Arc planning engine into a tool for older adults living independently and the care circles around them. The goal is simple: make the day easier to understand, easier to follow, and easier to support without taking independence away.

## Grizzly Hacks III Prompt Fit

**Prompt:** Build something for a group of people whose daily life looks very different from yours.

**Who we are designing for:** Older adults who live independently, especially seniors who juggle medication routines, rides, doctor visits, errands, meals, paperwork, and family check-ins.

**Specific problem:** Daily support is scattered across sticky notes, memory, phone calls, text threads, calendars, and medical portals. A senior may remember the appointment but forget the insurance card, remember the medication but forget the refill, or hesitate to ask for help because it feels like bothering someone.

**Why this matters:** Small misses can threaten confidence, independence, and family peace of mind. Most productivity tools are built for younger workers and assume fast typing, tiny screens, solo use, and abstract task labels.

**How DayBridge helps:** DayBridge creates one accessible daily board with large controls, plain-language reminders, AI-assisted care-plan breakdowns, and caregiver-friendly updates. It helps seniors act independently while giving family and helpers enough context to support without hovering.

## Core Features

- **Daily Board:** A scannable day plan for medication reminders, appointments, rides, meals, errands, and calls.
- **AI Care Plan Builder:** Turns a senior's need into smaller checkpoints and daily tasks.
- **Care Circle Signals:** Helps family members see what is done, what is next, and where help is needed.
- **Accessible UI:** Larger text, strong contrast, generous hit targets, and plain labels.
- **Safety Boundaries:** DayBridge can remind someone to follow existing instructions, but it does not diagnose, prescribe, or change medication or treatment plans.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Convex
- Convex Auth
- Framer Motion
- Lucide React

## Running Locally

```bash
npm install
npm run dev
```

For the full backend, add the required Convex and auth environment variables. See `.env.example` for the expected keys.

## Build

```bash
npm run build
```

## Hackathon Notes

DayBridge keeps the strongest part of Arc, its planning engine, but changes the audience and product purpose:

- From student goals to senior daily independence
- From missions to care plans
- From gamified progress to practical routine clarity
- From solo productivity to shared support

The prototype is intentionally focused on day-to-day usefulness rather than flashy complexity.
