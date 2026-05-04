# Shift Maintenance Dashboard

## Overview

A tool for Super Admins and Agency administrators to spot shift problems, fix schedules, and read a full history of what happened on each shift—from creation through clock-in/out, updates, and removals.

## What's New

### Shift Maintenance Page

Both Super Admins and Agency admins get a **Shift Maintenance** area with two tabs.

**How it fits with everyday work** — **Shift Management** is where agencies review recent activity and open shifts. **Recent Shifts** on that hub lets you **search by name** (client or caregiver), **filter by day**, and flip **pages** when the list is long. Shift Maintenance adds a **date-range** view driven by **automatic checks** for common problems, and it asks for a **short written reason** when you save a fix so the history stays clear. Super Admins can work across agencies; agencies see only their own shifts.

**Problem shifts** — Lists shifts in the range that match rules such as:

- **Missed shift** — The scheduled time has passed and no one clocked in  
- **Incomplete shift** — Past the scheduled end, someone clocked in, and there is still no clock-out (shown in its own **Incomplete shifts** block under **Flagged issues** on the same tab)  
- **Late clock-in** — The DSP clocked in after the grace window, so the system estimated a new end time  
- **No DSP assigned** — Shift has no assigned caregiver  
- **End before start** — End time is before start time  

Open a row to adjust clock times or completion in one place. You write a **note for the history**, then tap **Update changes** to save. Nothing saves until you do that.

**Activity history** — Read-only list of actions on shifts: created, clocked in/out, status changes, updates, and deletes. Each row shows **when**, **who**, **role**, a **short summary**, and—when someone left one—a **note**. Click the **note icon** to read the full text. This log cannot be edited from the product.

### Shift Details Page

From **Shift Management**, opening a shift’s **Details** gives you the **same kind of editor** for clocks and completion: draft your changes, add the **required note**, then **Update changes**.

The **What needs attention** block lists issues spotted from that shift’s data. **Resolve and fix** opens the same editor. **Edit clock times** in the header does too.

The **Activity on this shift** table matches the maintenance idea: full notes open in a small dialog when you use the note icon.

### Where to Find It

- **Super Admins** — **Shift Maintenance** in the sidebar (needs the Shift Maintenance permission).
- **Agency Admins** — **Shift maintenance** card on the **Shift Management** hub, next to Shifts. Use **Back to Shift Management** to leave the maintenance screen.

### Access and Permissions

- Super Admins can pick an agency and work on its shifts.  
- Agency users only see their agency.  
- Employees do not use this area.  
- Actions are recorded under the signed-in user.

### Agency staff access scopes

Staff who should use Shift Management need the **Shift Management** scope (the old **Scheduling** label may still appear in some records until a profile is saved again; access is mapped so work keeps working).

## Security Improvements

- Agency users cannot view or change other agencies’ shifts.  
- A shift’s agency is fixed after creation.  
- Audit history is read-only in the app and not exposed for direct editing.  
- Maintenance-related requests are rate-limited to reduce abuse.
