# Shift calendar and activity views

## Overview

Agency staff can review a **client’s** or a **DSP’s** shifts in a **month calendar** or switch to a **list** where that fits the screen. The calendar is built for **scanning**: one glance at a day shows whether something is scheduled, how the **first** visit of the day looks, and whether more visits hide behind a small **+** control. Opening anything meaningful lands on the **shift details** page for that visit.

This document describes what people see and how it behaves. It does not describe server logic or database fields.

---

## Where it appears

### Client profile (agency)

- Open a **client**, then the **Activity** (or equivalent) tab where shifts are shown.
- **Calendar** is the default. **List** uses the same icon control as the calendar header; the list loads when you first choose list view (so opening the tab on calendar stays light until you need the full list).

### DSP profile (agency)

- Open a **DSP (caregiver) profile**, then the **Shifts** area.
- The same **month calendar** and **calendar / list** icons appear in line with the **month and year** pickers, consistent with the client experience.

---

## Month calendar

### What each day shows

- **Days in the selected month** use a neutral background when there are **no** shifts that day.
- **Days with at least one shift** show:
  - The **day number** on the **top left**.
  - A **status or attention label** on the **top right** for the **first** shift of that day (scheduled order). That label stays **outside** the main tap area so the rest of the cell is clearly “open this shift.”
  - A **block** for that first shift: **clock-in and clock-out** times when they exist; if neither clock exists yet, you still see a **Scheduled:** line with the planned window so context is not lost.
  - The **other person** in the visit: on a **client** profile you see **who is assigned** (or that no one is assigned); on a **DSP** profile you see **which client** the visit is for.

**Days that belong to the previous or next month** (shown to complete the week rows) stay visually muted. If a muted day still has shifts, you can read them, but the styling keeps the focus on the month you selected.

### Day coloring (first shift only)

Background tint follows the **first** shift of the day. It is meant as a **signal**, not a full story:

- **Attention-style** tints call out issues the product already knows about for that shift (for example missed, incomplete clocking, unassigned caregiver, or an invalid time window).
- When there is no such issue, the tint reflects the shift’s **normal status** (for example active, completed, pending, available).

If several shifts fall on one day, only the **first** shift drives the cell color; use the **+** list to review the others.

### More than one shift on a day

- A small **+** badge in the **bottom-right** of the day shows how many **additional** shifts exist after the first (for example three visits → **+2**).
- **On a device with a mouse**, pointing at **+** opens a panel listing those other shifts in the same compact style; you can move the pointer into the panel without it snapping shut immediately.
- **On touch-first devices** (or when hover is not reliable), **tapping +** opens the same list in a way that stays open until you dismiss it or choose a row.

Each row in that list opens **shift details** for that visit. The **+** control is labeled for screen readers with the **date** and **how many** extra shifts, so it is not a vague “more” button.

### Opening shift details

- Tap or click the **main day block** (first shift) to open **shift details** for that visit.
- Tap or click a row in the **+** overflow list to open **shift details** for that visit.

Choosing **+** does not also trigger the first-shift action; the two targets are separate.

---

## Month and year controls

- **Month** and **Year** are dropdowns at the top of the calendar card.
- Changing either loads shifts for that calendar month for the **client** or **DSP** you are viewing.
- While new data is loading, the calendar shows a short **loading** state over the grid.
- If loading fails, you see a **message** and a **Try again** action.

---

## When the month is very full

If the system returns **as many shifts as it is allowed to load for one month**, a **notice** appears above the grid explaining that you are seeing **only the first chunk** of shifts for that month (so very busy schedules are honest about the cap). The exact wording on screen is the source of truth.

---

## Empty and edge cases

- **No shifts** in the selected month: a simple **empty** message under the grid.
- **No client or DSP context** (should not happen in normal navigation): the calendar does not fetch and shows an empty state.

---

## Client activity: calendar vs list

### Calendar

- Uses the **month grid** described above.
- **Calendar** and **List** are **icon buttons** in the **same row** as the month and year selectors (there is **no** large “Shifts” heading above the calendar anymore).

### List

- The same **icons** appear **right-aligned above the list** so you can jump back to the calendar.
- The first time you open **list** view in a session, the product **loads** the list; after that, returning to list reuses what was already loaded until you leave the screen.
- Rows show **caregiver**, **date**, **location**, **clocked in / out**, and **duration** (or the best available labels when data is missing).
- **Pagination** at the bottom applies when there are more rows than one page allows.

---

## DSP shifts: calendar vs list

- **Calendar** behaves like the client calendar, but every day is interpreted from the **DSP’s** perspective (client names, etc.).
- **List** mode on the DSP profile is **broader** than the client list: it includes **previous**, **ongoing**, and **upcoming** groupings and other actions that already existed on that screen. The **calendar / list icons** still match the client pattern for familiarity.

---

## Accessibility and clarity (plain language)

- **Day cells** expose a short **summary** to assistive technology: the date, **how many** shifts, the **first** shift’s planned window, and the **primary name** for that view (client or caregiver).
- **+** controls describe **which day** and **how many** extra shifts they reveal.
- Rows you can open use action-style wording (for example that you are **opening shift details** and **for whom**, with **when** where it helps tell visits apart).
- When **scheduled** time is shown under empty clocks, it is explicitly labeled **Scheduled:** so it is not confused with actual clock-in/out.

---

## How this fits the rest of the product

- **Shift details** is the place to read everything about one visit and to use deeper actions your role allows.
- **Shift maintenance** (where your organization uses it) is a separate, date-range workflow for finding and fixing problem shifts across many people. The **calendar** here is for **one client or one DSP** and **one month at a time**.

---

*Screen text and limits (for example how many shifts load at once) may be refined over time; trust the in-app messages when they differ from this guide.*
