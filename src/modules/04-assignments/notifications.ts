import type { AssignmentNotification } from './attempts'

/** Sends one event to Module 8. Read-only use of Module 8's router: no Module 8 files change. */
export type Notifier = (event: AssignmentNotification) => Promise<void>

/**
 * @brief Calls Module 8's events endpoint in-process. Throws if Module 8 refuses the event.
 * Module 8 is loaded on first use, so Module 4's tests never open Module 8's database.
 */
export const sendToModule8: Notifier = async (event) => {
  const { default: notificationsModule } = await import('../08-notifications')
  const response = await notificationsModule.router.handle(
    new Request('http://localhost/api/notifications/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
    }),
  )
  if (!response.ok) {
    throw new Error(`Module 8 refused the notification (HTTP ${response.status})`)
  }
}

/**
 * @brief Send a notification without ever blocking or failing the caller.
 * Creating an assignment must succeed even when Module 8 is down; the failure is only logged.
 */
export async function notifySafely(notify: Notifier, event: AssignmentNotification): Promise<void> {
  try {
    await notify(event)
  } catch (error) {
    console.warn('[Module 4] Could not send the new-assignment notification:', error)
  }
}
