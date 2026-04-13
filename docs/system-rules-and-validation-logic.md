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

## Shift management (staff)

### Geofencing

- Clock-in and clock-out are allowed only when your reported location is within a set distance of the **visit location** (the shift’s location, or the client’s primary address when the shift has no specific location).
- That distance defaults to about **300 feet** (~92 m). A wider radius may be configured for the deployment, up to a fixed maximum.
- Location is taken at the time of the action so the check reflects where you are then; the app’s on-screen distance check is aligned with what the server enforces.

### Shift expiration

- If you have **not clocked in**, a shift can become **expired** **15 minutes after** the scheduled start (applies when the shift is still pending or available for clock-in).
- Shifts that are **available** or **in progress** are treated as past their visit once **current time is after the scheduled end**. For visits that run past midnight, the end time is interpreted on the correct calendar day so overnight shifts expire at the right moment.
- When a shift expires under these rules, the system may send an expiration notification where that is enabled.

### After clock-out

- After clock-out, shift lists refresh so what you see matches the server.

## Profiles and dates of birth

- Date of birth cannot be saved if it is in the future where we collect it.

## Messages and notifications

- Only appropriate updates are allowed on notification and conversation records so each account stays tied to the right person.

---

*For engineering detail, see the backend repository and pull request history.*
