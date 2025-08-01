// src/App.js - Beautiful Modern UI Version
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
        <h2 style={styles.loadingText}>Loading Vouch...</h2>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const userHandle = getUserHandle(user.email);

  const tabs = [
    { id: 'feed', icon: '🏠', label: 'Feed', color: '#007bff' },
    { id: 'search', icon: '🔍', label: 'Search', color: '#28a745' },
    { id: 'create', icon: '✨', label: 'Share', color: '#17a2b8' },
    { id: 'ask', icon: '🤔', label: 'Ask', color: '#ffc107' },
    { id: 'friends', icon: '👥', label: 'Friends', color: '#6f42c1' },
  ];

  return (
    <div style={styles.app}>
      <UserMigration />
      
      {/* Beautiful Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logoSection}>
            <div style={styles.logo}>🗣️</div>
            <h1 style={styles.appTitle}>Vouch</h1>
          </div>
          
          <div style={styles.userSection}>
            <div style={styles.userInfo}>
              <div style={styles.userAvatar}>
                {userHandle.charAt(0).toUpperCase()}
              </div>
              <div style={styles.userDetails}>
                <span style={styles.userName}>@{userHandle}</span>
                <span style={styles.userEmail}>{user.email}</span>
              </div>
            </div>
            <button onClick={handleLogout} style={styles.logoutButton}>
              <span style={styles.logoutIcon}>🚪</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={styles.mainContent}>
        <div style={styles.contentWrapper}>
          {currentTab === 'feed' && <RecommendationsFeed />}
          {currentTab === 'search' && <SearchRecommendations />}
          {currentTab === 'create' && <CreateRecommendation />}
          {currentTab === 'ask' && <AskRecommendation />}
          {currentTab === 'friends' && <Friends />}
        </div>
      </main>

      {/* Beautiful Bottom Navigation */}
      <nav style={styles.bottomNav}>
        <div style={styles.navContainer}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              style={{
                ...styles.navButton,
                backgroundColor: currentTab === tab.id ? `${tab.color}15` : 'transparent',
                borderTop: currentTab === tab.id ? `3px solid ${tab.color}` : '3px solid transparent',
              }}
            >
              <span 
                style={{
                  ...styles.navIcon,
                  transform: currentTab === tab.id ? 'scale(1.2)' : 'scale(1)',
                }}
              >
                {tab.icon}
              </span>
              <span 
                style={{
                  ...styles.navLabel,
                  color: currentTab === tab.id ? tab.color : '#6c757d',
                  fontWeight: currentTab === tab.id ? 'bold' : 'normal',
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
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f8fafc',
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '18px',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '12px 0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    fontSize: '28px',
    background: 'linear-gradient(135deg, #007bff, #0056b3)',
    borderRadius: '12px',
    width: '45px',
    height: '45px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)',
  },
  appTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #007bff, #0056b3)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#007bff',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 'bold',
    boxShadow: '0 2px 8px rgba(0, 123, 255, 0.3)',
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1e293b',
  },
  userEmail: {
    fontSize: '12px',
    color: '#64748b',
  },
  logoutButton: {
    background: 'linear-gradient(135deg, #dc3545, #c82333)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)',
  },
  logoutIcon: {
    fontSize: '16px',
  },
  mainContent: {
    flex: 1,
    padding: '20px 0 100px 0', // Bottom padding for nav
    overflow: 'auto',
  },
  contentWrapper: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 20px',
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0',
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
    zIndex: 100,
  },
  navContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    maxWidth: '600px',
    margin: '0 auto',
    padding: '8px 0',
  },
  navButton: {
    background: 'none',
    border: 'none',
    padding: '8px 12px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    borderRadius: '12px',
    transition: 'all 0.3s ease',
    minWidth: '70px',
    position: 'relative',
  },
  navIcon: {
    fontSize: '20px',
    transition: 'transform 0.3s ease',
    marginBottom: '2px',
  },
  navLabel: {
    fontSize: '11px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  },
};

// Add CSS animation for loading spinner
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Mobile responsiveness */
  @media (max-width: 768px) {
    .app-title {
      font-size: 20px !important;
    }
    .user-email {
      display: none !important;
    }
    .nav-label {
      font-size: 10px !important;
    }
  }
`;
document.head.appendChild(styleSheet);

export default App;
