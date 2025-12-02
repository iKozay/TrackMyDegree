# Project Name

Typescript track my degree front-end.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20.19.1)
- A package manager:
  - `npm` (used in the examples below), or
  - `yarn`, or
  - `pnpm`

---

### 1. Install Dependencies

```bash
npm install

npm run dev

```

## Folder & File Structure

The project is organized as follows:

```bash
.
├── api/
├── assets/
├── handlers/
├── hooks/
├── mock/
├── providers/
├── reducers/
├── styles/
├── components/
├── contexts/
├── images/
├── pages/
├── tests/
├── types/
├── App.tsx
├── App.css
├── main.tsx
├── ProtectedRoute.tsx
├── setupTests.ts
└── ...
```

## Folder Structure

### `api/`

Contains functions and utilities for communicating with the backend or external APIs  
(e.g., HTTP clients, endpoint wrappers, request/response helpers).

### `assets/`

Holds static assets that are not simple images in JSX, such as fonts, PDFs, JSON files, or other bundled resources.

### `handlers/`

Includes logic and helper functions that handle specific state updates  
(e.g., form movefrompoolToSemester, undo, redo. ).

### `hooks/`

Custom React hooks used across the application  
(e.g., `useAuth`, `useTimelineState`, , or any reusable stateful logic).

### `mock/`

Stores mock data and mock implementations for development and testing  
(e.g., fake API responses, sample datasets, stub services). To be removed later.

### `providers/`

React provider components that wrap parts of the app or the whole app  
(e.g. AuthProvider, TimeLineDndProvider etc.).

### `reducers/`

Contains reducer functions and related state logic, typically used with `useReducer` of the timeline page.

### `styles/`

Global and shared styling resources.  
(e.g.,timeline.css, navbar.css, utility styles).

### `components/`

Reusable UI building blocks that do not represent full pages  
(e.g., CourseDetail, modals, forms, navbars, TimelineLoader).

### `contexts/`

React Context definitions and related helpers  
(e.g., `AuthContext`, and custom `useXContext` hooks).

### `images/`

Image assets used in the UI  
(e.g., logos, icons as images, illustrations).

### `pages/`

Route-level components representing full screens of the application  
(e.g., `LandingPage`, `LoginPage`, `TimelinePage`).

### `tests/`

Test files and test utilities  
(e.g., unit/integration tests, custom render helpers, test data builders).

### `types/`

Shared TypeScript type definitions and interfaces  
(e.g., domain models like `User`, `Course`, `AuthResponse`).
