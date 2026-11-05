import { Elysia } from 'elysia'

// TEMPORARY: fake user until Module 1's login exists.
// Test as someone else by adding ?user_id=user_3 to the URL.
// Remove the query fallback when switching to the real session lookup.
export async function getCurrentUser(request: Request) {
  const url = new URL(request.url)
  return {
    user_id: url.searchParams.get('user_id') ?? 'user_test',
    role: 'student',
  }
}

// Routes that .use(auth) get `user` in their handlers
export const auth = new Elysia({ name: 'notif-auth' }).resolve(
  { as: 'scoped' },
  async ({ request }) => ({
    user: await getCurrentUser(request),
  }),
)
