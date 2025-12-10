import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export function initPostHog() {
  if (POSTHOG_KEY && typeof window !== 'undefined') {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // Capture pageviews automatically
      capture_pageview: true,
      // Capture pageleaves for session recordings
      capture_pageleave: true,
      // Disable in development for cleaner data
      loaded: (posthog) => {
        if (import.meta.env.DEV) {
          // Optionally disable in dev - uncomment if you want
          // posthog.opt_out_capturing();
        }
      },
    });
  }
}

export { posthog };

