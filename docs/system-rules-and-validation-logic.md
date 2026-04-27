# System rules and validation logic

Plain-language summary of what the platform enforces and validates. No action required for most users.

## Scheduling (agency)

- Client selection and form state stay consistent when switching clients quickly (no mixed assignments).
- DSP search is filtered to people marked available for work.

### When saving a shift

- A **client** and a **visit location** (address or map point) are required; the **start time** must be valid.
- If the **end time** is earlier than the **start time** on the clock, the system treats the visit as ending the **next calendar day** (overnight visit).
- The **assigned caregiver** must exist, be **available for work**, and—when the shift belongs to an agency—must be **on that same agency**.
- The **client** must be **active**, the visit **date** must fall within **authorized service dates** for that client (when those are recorded), and the visit must not be **after the client’s contract end** (when one is set).
- If the client’s record **requires map coordinates** for visits, the saved location must include **valid coordinates**.
- You cannot save a **duplicate** visit: same caregiver, same day, same start and end, same client.
- You cannot save a visit that **overlaps in time** with another visit for that caregiver that day that is **not completed or cancelled**.
- You cannot save a visit that **overlaps** with another **not completed or cancelled** visit for the **same client** with a **different** caregiver that day.
- You cannot save a visit that **overlaps** a **scheduled or active ride** for that caregiver that day (the system blocks a window around the ride’s start time).
- Saving a visit cannot push the client over the **authorized hours for that service this week** (Sunday–Saturday), when that limit is recorded on the service (**0** means no hours allowed for that week).
- Saving a visit cannot push the client over the **total approved hours for that service** (within its authorization period when both start and end are set, otherwise a rolling window around the visit date), when that total is recorded (**0** means no hours allowed toward the total). If the system cannot compute that window (for example, an invalid visit date), the save is blocked until data is fixed.

## Shift management (staff)

### Geofencing

- Clock-in and clock-out are allowed only when your reported location is within a set distance of the **visit location** (the shift’s location, or the client’s primary address when the shift has no specific location).
- That distance defaults to about **300 feet** (~92 m). A wider radius may be configured for the deployment, up to a fixed maximum.
- Location is taken at the time of the action so the check reflects where you are then; the app’s on-screen distance check is aligned with what the server enforces.

### Shift expiration

**No clock-in yet (shift still pending or available to clock in)**

- **Grace (first 15 minutes after start):** You are still in the normal on-time window. The app does not show an “expiring” countdown during this period.
- **After 15 minutes without clock-in:** The app can show a **countdown** until the hard cutoff (you still have time to clock in). The system may send the assigned caregiver a **reminder** that they have not clocked in yet (not every minute—scheduled checks). Agency staff may also receive a one-time **shift expiring / no clock-in** alert for the same warning window.
- **Hard no-show cutoff:** If there is still **no clock-in** by **one hour after** the scheduled start, the shift is treated as **expired** (no clock-in). When that happens, the system may send an **expiration** notification where that is enabled.
- **Short visits:** If the scheduled **end time** is already in the past before that one-hour cutoff, the shift can still expire as **past the visit window** even if the one-hour rule has not been reached.

**After you clock in**

- A clock-in **more than 15 minutes after** the scheduled start counts as **late**. The system may store an **estimated end time** for that visit: your actual clock-in time plus the **planned length** of the shift (start-to-end, including overnight visits where the end is the next calendar day). Ongoing shifts are treated as past the visit when **now** is after the **scheduled end** or, when present, after that **estimated end time**—whichever applies.
- Shift Maintenance flags those visits as **Late clock-in** when an estimated end time is present.
- **Agency admins** may be notified when someone **clocks in late** (after the 15-minute grace). They are **not** sent a separate “shift started” notice for that same late clock-in, so they get one clear late clock-in alert instead of two.

**Overnight visits**

- When the **end time** is earlier on the clock than the **start time** the same calendar day, the system treats the end as the **next** day. That rule applies to **expiration**, **estimated end time**, and what you see in the app so overnight shifts do not end at the wrong moment.

**Geofencing note**

- Clock-in still requires being within range of the visit location; expiration rules do not bypass geofencing.

### After clock-out

- After clock-out, shift lists refresh so what you see matches the server.

## Profiles and dates of birth

- Date of birth cannot be saved if it is in the future where we collect it.

## Messages and notifications

- Only appropriate updates are allowed on notification and conversation records so each account stays tied to the right person.

For **how in-app, email (Mailgun), push (Expo), compliance expiry, and certification reminders work** in the backend (including scheduled jobs and delivery behavior), see **`docs/notifications-and-expiry-delivery.md`**.

---

*For engineering detail, see the backend repository and pull request history.*
