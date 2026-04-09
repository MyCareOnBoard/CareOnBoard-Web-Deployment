# Shift Maintenance Dashboard

## Overview

A new admin tool that helps Super Admins and Agency administrators identify shift problems, correct scheduling issues, and review a **full shift lifecycle audit** (creation through clock-in/out, status changes, corrections, and deletions).

## What's New

### Shift Maintenance Page

Both Super Admins and Agency admins now have access to a dedicated Shift Maintenance page with two views.

**Relationship to Activity Log** — For agencies, **Shift Management → Activity Log** already shows recent shift activity, includes filters such as missed or incomplete-style views, and lets you open shift details and edit from there. Shift Maintenance does **not** replace that daily workflow. It adds a focused place to work from **server-checked anomaly rules** over a **date range you choose**, requires a **written reason** when you change or delete a shift, and keeps those actions in a **separate audit history**. Super Admins also get a cross-agency view, which Activity Log does not offer.

**Problem shifts** (first tab in the app) — Scans shifts within a selected date range and flags issues such as:

- **Missed shift** — The scheduled window has passed but no one clocked in
- **No clock-out** — Someone clocked in but never clocked out
- **No DSP assigned** — A pending shift has no assigned caregiver
- **End before start** — The scheduled end time is earlier than the start time

From this view, administrators can open a shift and either update it or remove it. Every change or removal done here requires a **short note** that is stored in the activity history.

**Activity history** (second tab) — A read-only record of **every action** recorded on a shift, not only admin corrections. The system logs:

- **Created** — Who created the shift (agency or staff workflows)
- **Clocked In / Shift Started / Clocked Out** — Who performed the action and relevant times or duration (DSP-facing flows)
- **Status Change** — When shift status was updated and what it changed from and to
- **Updated / Deleted** — Administrative corrections and removals; updates still require a written reason when done through maintenance

Each row shows **when** the event happened, **who** did it, their **role** (for example DSP, Agency, or Super Admin), a short **summary** of what happened, the **shift ID**, and a **note** when one was saved (routine DSP clock-in/out usually has no note). This history cannot be edited or deleted through the product.

### Where to Find It

- **Super Admins** — New "Shift Maintenance" item in the sidebar navigation. Requires the "Shift Maintenance" access permission to be enabled for the admin account.
- **Agency Admins** — New "Shift maintenance" card on the **Shift Management** hub page, alongside the existing Shifts and Activity Log sections. Use **Back to Shift Management** on the maintenance screen to return to that hub.

### Access and Permissions

- Super Admins can view and correct shifts across any agency by selecting an agency
- Agency admins and staff can only see and correct shifts belonging to their own agency
- Employees do not have access to this feature
- All logged shift actions are attributed to the authenticated user who performed them (DSP, agency user, or Super Admin as applicable)

### Agency staff access scopes

Internal users who should reach the Shift Management hub need the **Shift Management** scope on their access list (replacing the former **Scheduling** scope). Existing accounts that still show **Scheduling** in the database keep access until an admin saves their profile again; the app maps the old value to the new label where needed.

## Security Improvements

As part of this update, several security enhancements were applied to the existing shift system:

- Agency users can no longer view or modify shifts belonging to other agencies
- A shift's agency assignment can no longer be changed after it is created
- The audit log is protected from any direct access or tampering outside of the system
- All maintenance actions are subject to request rate limits to prevent misuse
