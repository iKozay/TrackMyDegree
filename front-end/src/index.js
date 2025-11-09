import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import posthog from 'posthog-js';
import { PostHogProvider } from '@posthog/react'

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>
  <PostHogProvider client={posthog}>
    <App />
  </PostHogProvider>,
  // /* </React.StrictMode> */
);
