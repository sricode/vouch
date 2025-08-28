// src/utils/errorMonitoring.js - Error tracking setup
import * as Sentry from "@sentry/react";

// Initialize Sentry (call this in your main App.js)
export const initErrorMonitoring = () => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.REACT_APP_SENTRY_DSN, // Add this to your .env file
      environment: process.env.NODE_ENV,
      tracesSampleRate: 1.0,
      beforeSend(event) {
        // Filter out development errors
        if (event.exception) {
          const error = event.exception.values[0];
          if (error.value && error.value.includes('ChunkLoadError')) {
            return null; // Don't send chunk load errors
          }
        }
        return event;
      },
    });
  }
};

// Custom error logging
export const logError = (error, context = {}) => {
  console.error('🚨 Error:', error, context);
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      tags: context.tags || {},
      extra: context.extra || {},
      user: context.user || null,
    });
  }
};

// Log user actions for debugging
export const logUserAction = (action, details = {}) => {
  console.log('👤 User Action:', action, details);
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.addBreadcrumb({
      message: action,
      data: details,
      level: 'info',
    });
  }
};

// Wrap async functions with error handling
export const withErrorHandling = (asyncFunction, context = '') => {
  return async (...args) => {
    try {
      return await asyncFunction(...args);
    } catch (error) {
      logError(error, {
        extra: { context, args },
        tags: { function: asyncFunction.name }
      });
      throw error; // Re-throw to maintain normal error flow
    }
  };
};

// React Error Boundary component
export const ErrorBoundary = Sentry.withErrorBoundary(
  ({ children }) => children,
  {
    fallback: ({ error, resetError }) => (
      <div style={errorBoundaryStyles.container}>
        <div style={errorBoundaryStyles.content}>
          <h2 style={errorBoundaryStyles.title}>Something went wrong</h2>
          <p style={errorBoundaryStyles.message}>
            We've been notified about this error. Please try refreshing the page.
          </p>
          <button 
            onClick={resetError}
            style={errorBoundaryStyles.button}
          >
            Try Again
          </button>
        </div>
      </div>
    ),
    beforeCapture: (scope) => {
      scope.setTag("errorBoundary", true);
    },
  }
);

const errorBoundaryStyles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    padding: '20px',
  },
  content: {
    textAlign: 'center',
    maxWidth: '400px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#262626',
    marginBottom: '12px',
  },
  message: {
    fontSize: '16px',
    color: '#8E8E93',
    lineHeight: '1.4',
    marginBottom: '24px',
  },
  button: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
