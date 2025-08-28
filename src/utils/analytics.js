// src/utils/analytics.js - Analytics tracking
import { analytics } from '../firebase';
import { logEvent } from 'firebase/analytics';

// Track key user actions
export const trackEvent = (eventName, parameters = {}) => {
  if (analytics) {
    logEvent(analytics, eventName, parameters);
    console.log(`📊 Analytics: ${eventName}`, parameters);
  }
};

// Specific tracking functions for your app
export const trackUserSignup = (method = 'email') => {
  trackEvent('sign_up', {
    method: method
  });
};

export const trackUserLogin = (method = 'email') => {
  trackEvent('login', {
    method: method
  });
};

export const trackRecommendationCreated = (category, rating) => {
  trackEvent('recommendation_created', {
    category: category,
    rating: rating
  });
};

export const trackRecommendationViewed = (category, source) => {
  trackEvent('recommendation_viewed', {
    category: category,
    source: source // 'feed', 'search', etc.
  });
};

export const trackFriendRequestSent = () => {
  trackEvent('friend_request_sent');
};

export const trackFriendRequestAccepted = () => {
  trackEvent('friend_request_accepted');
};

export const trackRecommendationRequestCreated = (category) => {
  trackEvent('recommendation_request_created', {
    category: category
  });
};

export const trackRecommendationRequestResponded = (category) => {
  trackEvent('recommendation_request_responded', {
    category: category
  });
};

export const trackSearch = (searchType, query) => {
  trackEvent('search', {
    search_term: query,
    search_type: searchType // 'recommendations', 'users'
  });
};

export const trackPageView = (pageName) => {
  trackEvent('page_view', {
    page_title: pageName
  });
};

// Track user engagement
export const trackUserEngagement = (action, target) => {
  trackEvent('user_engagement', {
    engagement_type: action,
    target: target
  });
};
