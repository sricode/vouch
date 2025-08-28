// src/utils/featureFlags.js - Feature flags system
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

// Default feature flags (fallback values)
const DEFAULT_FLAGS = {
  // UI Features
  enableNewUI: true,
  enableDarkMode: false,
  enablePushNotifications: false,
  
  // Social Features
  enableGroupRecommendations: false,
  enableRecommendationLikes: false,
  enableComments: false,
  enableStories: false,
  
  // Discovery Features
  enableTrendingSection: false,
  enableAIRecommendations: false,
  enableLocationBasedRecs: false,
  
  // Monetization
  enablePremiumFeatures: false,
  enableAds: false,
  
  // Experimental
  enableVideoRecommendations: false,
  enableVoiceNotes: false,
  enableLiveRecommendations: false,
  
  // Admin/Debug
  enableDebugMode: process.env.NODE_ENV === 'development',
  enableAnalyticsLogging: true,
};

// Feature flags cache
let flagsCache = { ...DEFAULT_FLAGS };
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch feature flags from Firestore
export const fetchFeatureFlags = async () => {
  try {
    const now = Date.now();
    
    // Return cached flags if still fresh
    if (now - lastFetchTime < CACHE_DURATION) {
      return flagsCache;
    }
    
    console.log('🎚️ Fetching feature flags...');
    
    const flagsDoc = await getDoc(doc(db, 'config', 'featureFlags'));
    
    if (flagsDoc.exists()) {
      const remoteFlags = flagsDoc.data();
      flagsCache = { ...DEFAULT_FLAGS, ...remoteFlags };
      lastFetchTime = now;
      console.log('✅ Feature flags updated:', flagsCache);
    } else {
      console.log('📝 No remote flags found, using defaults');
    }
    
    return flagsCache;
  } catch (error) {
    console.error('❌ Error fetching feature flags:', error);
    return flagsCache; // Return cached/default flags on error
  }
};

// Get a specific feature flag
export const getFeatureFlag = (flagName) => {
  const flag = flagsCache[flagName];
  if (flag === undefined) {
    console.warn(`⚠️ Unknown feature flag: ${flagName}`);
    return false;
  }
  return flag;
};

// Check if feature is enabled
export const isFeatureEnabled = (flagName) => {
  return getFeatureFlag(flagName) === true;
};

// Get environment-specific flags
export const getEnvironmentFlags = () => {
  const env = process.env.NODE_ENV;
  const envFlags = {
    development: {
      enableDebugMode: true,
      enableAnalyticsLogging: false,
    },
    production: {
      enableDebugMode: false,
      enableAnalyticsLogging: true,
    }
  };
  
  return envFlags[env] || {};
};

// React hook for feature flags
import { useState, useEffect } from 'react';

export const useFeatureFlag = (flagName) => {
  const [isEnabled, setIsEnabled] = useState(getFeatureFlag(flagName));
  
  useEffect(() => {
    fetchFeatureFlags().then(() => {
      setIsEnabled(getFeatureFlag(flagName));
    });
  }, [flagName]);
  
  return isEnabled;
};

// React hook for multiple feature flags
export const useFeatureFlags = (flagNames) => {
  const [flags, setFlags] = useState(
    flagNames.reduce((acc, name) => {
      acc[name] = getFeatureFlag(name);
      return acc;
    }, {})
  );
  
  useEffect(() => {
    fetchFeatureFlags().then(() => {
      const updatedFlags = flagNames.reduce((acc, name) => {
        acc[name] = getFeatureFlag(name);
        return acc;
      }, {});
      setFlags(updatedFlags);
    });
  }, [flagNames]);
  
  return flags;
};

// Feature flag component wrapper
export const FeatureFlag = ({ flag, children, fallback = null }) => {
  const isEnabled = useFeatureFlag(flag);
  
  if (isEnabled) {
    return children;
  }
  
  return fallback;
};

// Debug component to show all flags (development only)
export const FeatureFlagsDebug = () => {
  const [flags, setFlags] = useState(flagsCache);
  
  useEffect(() => {
    fetchFeatureFlags().then(setFlags);
  }, []);
  
  if (!isFeatureEnabled('enableDebugMode')) {
    return null;
  }
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      backgroundColor: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 9999,
      maxHeight: '200px',
      overflowY: 'auto',
    }}>
      <h4>🎚️ Feature Flags</h4>
      {Object.entries(flags).map(([name, value]) => (
        <div key={name} style={{ margin: '2px 0' }}>
          <span style={{ color: value ? '#4CAF50' : '#F44336' }}>
            {value ? '✅' : '❌'}
          </span>
          {' '}{name}
        </div>
      ))}
    </div>
  );
};
