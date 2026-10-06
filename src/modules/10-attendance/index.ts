// MODULE 10: Attendance & Participation Tracking
//
// Scope from the project brief:
//   - Record attendance
//   - Attendance history
//   - Excused/unexcused absences
//   - Participation tracking
//   - Attendance reports
//   - Attendance statistics
//
// HOW TO ADD A PAGE TO THE ROUTER (basic demo):
//   1. Find the router at the bottom of this file.
//   2. Copy the  .get('/hello', ...)  line.
//   3. Change the address ('/hello') and the HTML it returns.
//   4. Save. Your new page is at  http://localhost:3000/10-attendance/<your-address>
import { Elysia } from 'elysia'
import { defineModule, moduleBase } from '../../core/defineModule'

const base = moduleBase(import.meta.dir)

export default defineModule({
  name: 'Module 10: Attendance & Participation Tracking',
  description: 'Attendance, absences, participation',

  router: new Elysia()
    // Front page of this module. The button on the home page opens it.
    .get(
      '/',
      () => `
        <h1>Module 10: Attendance &amp; Participation Tracking</h1>
        <p>It works! Replace this page with your own.</p>
        <p><a href="${base}/hello">Demo page</a></p>
        <p><a href="/">Back to the home page</a></p>
      `,
    )
    // DEMO: this one line is all it takes to add a page.
    .get('/hello', () => `<h1>Hello from Module 10</h1><a href="${base}">Back</a>`),
})
