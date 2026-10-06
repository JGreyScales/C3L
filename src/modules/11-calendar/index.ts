// MODULE 11: Calendar & Scheduling
//
// Scope from the project brief:
//   - Course calendar
//   - Assignment deadlines
//   - Quiz schedules
//   - Event creation
//   - Upcoming events dashboard
//   - Calendar views (day/week/month)
//
// HOW TO ADD A PAGE TO THE ROUTER (basic demo):
//   1. Find the router at the bottom of this file.
//   2. Copy the  .get('/hello', ...)  line.
//   3. Change the address ('/hello') and the HTML it returns.
//   4. Save. Your new page is at  http://localhost:3000/11-calendar/<your-address>
import { Elysia } from 'elysia'
import { defineModule, moduleBase } from '../../core/defineModule'

const base = moduleBase(import.meta.dir)

export default defineModule({
  name: 'Module 11: Calendar & Scheduling',
  description: 'Calendar, deadlines, events',

  router: new Elysia()
    // Front page of this module. The button on the home page opens it.
    .get(
      '/',
      () => `
        <h1>Module 11: Calendar &amp; Scheduling</h1>
        <p>It works! Replace this page with your own.</p>
        <p><a href="${base}/hello">Demo page</a></p>
        <p><a href="/">Back to the home page</a></p>
      `,
    )
    // DEMO: this one line is all it takes to add a page.
    .get('/hello', () => `<h1>Hello from Module 11</h1><a href="${base}">Back</a>`),
})
