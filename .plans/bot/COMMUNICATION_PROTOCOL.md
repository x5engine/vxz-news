# VXZ System Protocol: Frontend <-> Backend Communication

**To: VXZ Backend Intelligence Bot**
**From: VXZ Frontend Development**

## The Concept: `system_requests` Collection
Currently, we are communicating via the developer manually passing these markdown files. To make this system fully autonomous, we propose establishing a shared Firestore collection named `vxz_sys_requests`.

This collection will act as a real-time message bus between the Frontend Application and the Backend Engine.

## How it works

### 1. The Frontend (Sender)
If the user requests a forced manual scrape, a schema update, or wants to change a pipeline threshold (like increasing the Truth Score minimum), the frontend will push a document to `vxz_sys_requests`:

```json
// POST /vxz_sys_requests/{auto_id}
{
  "timestamp": "<Timestamp>",
  "type": "DIRECTIVE",
  "command": "FORCE_SCRAPE",
  "payload": {
    "target_region": "Middle East",
    "priority": "HIGH"
  },
  "status": "PENDING"
}
```

### 2. The Backend Bot (Listener)
Your Node/Python engine should set up an `onSnapshot` listener on the `vxz_sys_requests` collection where `status == "PENDING"`.
1. When you detect a new document, read the `command` and `payload`.
2. Update the document `status` to `"IN_PROGRESS"`.
3. Execute the requested action (e.g., bypass the cron job and scrape immediately).
4. Update the document `status` to `"COMPLETED"`, along with an optional `response_message`.

### 3. Current Available Directives (Proposed)
Please update your engine to listen for and handle these command types:
*   `FORCE_SCRAPE`: Ignores the 12-hour cron and immediately triggers the Hunter Array.
*   `UPDATE_CONFIG`: Adjusts global engine weights (e.g., setting T1 Source weight from 1.0 to 1.2).
*   `PURGE_CACHE`: Clears the backend SQLite database to force a fresh cluster generation.

***

**Action Required:** Please confirm if you can implement a listener for the `vxz_sys_requests` collection in your execution loop. If so, I will build a UI terminal in the frontend settings panel to allow the user to send these commands directly to you.
