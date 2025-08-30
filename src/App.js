// src/App.js - Updated with UnifiedFeed
import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Auth from './components/Auth';
import CreateRecommendation from './components/CreateRecommendation';
import RecommendationsFeed from './components/RecommendationsFeed';
import Friends from './components/Friends';
import AskRecommendation from './components/AskRecommendation';
import SearchRecommendations from './components/SearchRecommendations';
import UserMigration from './components/UserMigration';
import ActivityFeed from './components/ActivityFeed';
import UnifiedFeed from './components/UnifiedFeed'; // ADD THIS LINE

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('feed');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getUserHandle = (email) => {
    return email ? email.split('@')[0] : '';
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading Vouch...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const userHandle = getUserHandle(user.email);

  // Updated tabs - Activity is now merged into Home
  const tabs = [
    { id: 'feed', icon: '🏠', label: 'Home' },
    { id: 'search', icon: '🔍', label: 'Discover' },
    { id: 'create', icon: '➕', label: 'Share' },
    { id: 'ask', icon: '💭', label: 'Ask' },
    { id: 'friends', icon: '👥', label: 'Friends' },
  ];

  return (
    <div style={styles.app}>
      <UserMigration />
      
      {/* Modern Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logoSection}>
            <h1 style={styles.appTitle}>Vouch</h1>
            <span style={styles.tagline}>friend recommendations</span>
          </div>
          
          <div style={styles.userSection}>
            <span style={styles.userHandle}>@{userHandle}</span>
            <div style={styles.userAvatar}>
              {userHandle.charAt(0).toUpperCase()}
            </div>
            <button onClick={handleLogout} style={styles.logoutButton}>
              <span>⚪</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.mainContent}>
        <div style={styles.contentWrapper}>
          {currentTab === 'feed' && <UnifiedFeed />}
          {currentTab === 'search' && <SearchRecommendations />}
          {currentTab === 'create' && <CreateRecommendation />}
          {currentTab === 'ask' && <AskRecommendation />}
          {currentTab === 'friends' && <Friends />}
        </div>
      </main>

      {/* Modern Bottom Navigation */}
      <nav style={styles.bottomNav}>
        <div style={styles.navContainer}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              style={{
                ...styles.navButton,
                color: currentTab === tab.id ? '#000' : '#8E8E93',
              }}
            >
              <span 
                style={{
                  ...styles.navIcon,
                  transform: currentTab === tab.id ? 'scale(1.2)' : 'scale(1)',
                  filter: currentTab === tab.id ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))' : 'none',
                }}
              >
                {tab.icon}
              </span>
              <span 
                style={{
                  ...styles.navLabel,
                  fontWeight: currentTab === tab.id ? '600' : '400',
                  opacity: currentTab === tab.id ? 1 : 0.7,
                }}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#FAFAFA',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: '#262626',
  },
  
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#FAFAFA',
    gap: '20px',
  },
  
  loadingSpinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #F3F3F3',
    borderTop: '3px solid #262626',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  
  loadingText: {
    color: '#8E8E93',
    fontSize: '16px',
    fontWeight: '500',
    margin: 0,
  },
  
  header: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #DBDBDB',
    padding: '12px 20px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '600px',
    margin: '0 auto',
  },
  
  logoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  
  appTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#262626',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  
  tagline: {
    fontSize: '11px',
    color: '#8E8E93',
    fontWeight: '400',
    letterSpacing: '0.5px',
  },
  
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  
  userHandle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#262626',
  },
  
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#262626',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
  },
  
  logoutButton: {
    background: 'none',
    border: 'none',
    padding: '6px',
    cursor: 'pointer',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
    fontSize: '16px',
    color: '#8E8E93',
  },
  
  mainContent: {
    flex: 1,
    padding: '0 0 80px 0',
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  
  contentWrapper: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '0',
  },
  
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid #DBDBDB',
    paddingBottom: 'env(safe-area-inset-bottom)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    zIndex: 100,
  },
  
  navContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    maxWidth: '600px',
    margin: '0 auto',
    padding: '8px 20px 12px 20px',
  },
  
  navButton: {
    background: 'none',
    border: 'none',
    padding: '8px 4px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease',
    minWidth: '52px',
    borderRadius: '12px',
  },
  
  navIcon: {
    fontSize: '22px',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    lineHeight: 1,
  },
  
  navLabel: {
    fontSize: '10px',
    fontWeight: '400',
    transition: 'all 0.2s ease',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
};

// Add CSS animation
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* iOS-style tap highlights */
  * {
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
  
  input, textarea {
    -webkit-user-select: text;
    user-select: text;
  }
  
  /* Smooth scrolling */
  html {
    scroll-behavior: smooth;
  }
  
  /* Hide scrollbars but keep functionality */
  ::-webkit-scrollbar {
    width: 0px;
    background: transparent;
  }
  
  /* Safe area support for iOS */
  @supports (padding: max(0px)) {
    .bottom-nav {
      padding-bottom: max(12px, env(safe-area-inset-bottom));
    }
  }
`;
document.head.appendChild(styleSheet);

export default App;
