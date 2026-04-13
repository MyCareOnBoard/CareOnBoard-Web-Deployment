# System rules and validation logic

Plain-language summary of what the platform enforces and validates. No action required for most users.

## Scheduling (agency)

- Client selection and form state stay consistent when switching clients quickly (no mixed assignments).
- DSP search is filtered to people marked available for work.

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
