Real-Time Operations Workflow

A React-based real-time verification workflow portal built with WebSockets. It provides a Kanban-style interface for managing verification tasks.

Features

Real-time task status updates using WebSocket

Pending, In Progress, and Completed task columns

Approve and Reject actions

Automatic WebSocket reconnection

Offline state handling

Loading indicator during connection

"All caught up!" empty state

Responsive user interface

Accessibility support

Activity log for workflow updates

Tech Stack

React 18

JavaScript

WebSocket

Vite

CSS

Oxlint

WebSocket

WebSocket endpoint used for the project:

wss://echo.websocket.events

Example status update:

```json
{
  "type": "STATUS_UPDATE",
  "taskId": 1,
  "newStatus": "APPROVED"
}
```

Project Structure

```text
real-time-operations-workflow/
├── public/
├── src/
│   ├── components/
│   │   ├── WorkflowEngine.jsx
│   │   └── WorkflowEngine.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

Installation

Install the project dependencies:

```bash
npm install
```

Run the Project

Start the development server:

```bash
npm run dev
```

Production Build

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Workflow

Pending

Tasks waiting for verification.

In Progress

Tasks currently being processed.

Completed

Approved or rejected tasks.

When a task status changes, the application sends the update through WebSocket and updates the task status.

Accessibility

The project uses semantic HTML, ARIA labels, accessible buttons, and status information.

License

This project was developed as part of a frontend engineering workflow project.
