import rateLimit from 'express-rate-limit';

// General API rate limiter - 100 requests per 15 minutes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limiter - stricter for auth endpoints
// 10 requests per 15 minutes to prevent brute force
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Email sending rate limiter - prevent email spam
// 20 emails per hour per IP
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { message: 'Too many emails sent, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public endpoint rate limiter - for unauthenticated routes
// 30 requests per 15 minutes
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stripe operations limiter - prevent abuse of payment endpoints
// 10 requests per 15 minutes
export const stripeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: 'Too many payment requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin authentication rate limiter - strict to prevent brute force
// 5 attempts per 15 minutes
export const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests
});

// Admin API rate limiter - prevent abuse of admin endpoints
// 60 requests per minute
export const adminApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { message: 'Too many admin requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

