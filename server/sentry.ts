import * as Sentry from '@sentry/node';

const SENTRY_DSN = process.env.SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      
      // Remove sensitive data from body
      if (event.request?.data) {
        const data = typeof event.request.data === 'string' 
          ? JSON.parse(event.request.data) 
          : event.request.data;
        
        // Remove password fields
        if (data.password) delete data.password;
        if (data.token) delete data.token;
        
        event.request.data = JSON.stringify(data);
      }
      
      return event;
    },
    
    // Only send errors in production by default
    enabled: process.env.NODE_ENV === 'production' || !!process.env.SENTRY_DSN,
  });
}

export function captureException(error: Error, context?: Record<string, any>) {
  if (!SENTRY_DSN) {
    return;
  }
  
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (!SENTRY_DSN) {
    return;
  }
  
  Sentry.captureMessage(message, level);
}

export { Sentry };


