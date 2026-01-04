declare global {
  interface Window {
    __ENV__?: {
      NODE_ENV?: string;
      API_SERVER?: string;
      POSTHOG_KEY?: string;
      POSTHOG_HOST?: string;
    };
  }
}

export const ENV = {
  NODE_ENV: window.__ENV__?.NODE_ENV || "development",
  API_SERVER: window.__ENV__?.API_SERVER || "http://localhost:8000/api",
  POSTHOG_KEY: window.__ENV__?.POSTHOG_KEY || "",
  POSTHOG_HOST: window.__ENV__?.POSTHOG_HOST || ""
};