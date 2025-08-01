// src/App.js
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
  const [currentTab, setCurrentTab] = useState('create');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    
    return unsubscribe; // Cleanup subscription
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Show loading while checking auth state
  if (loading) {
    return (
      <div style={styles.loading}>
        <h2>Loading...</h2>
      </div>
    );
  }

  // If no user, show login/signup form
  if (!user) {
    return <Auth />;
  }

  // Extract username from email (everything before @)
  const getUserHandle = (email) => {
    return email ? email.split('@')[0] : '';
  };

  const userHandle = getUserHandle(user.email);

  // If user is logged in, show main app
  return (
    <div style={styles.container}>
      <UserMigration />
      <header style={styles.header}>
        <h1 style={styles.title}>🗣️ Vouch</h1>
        <div style={styles.userInfo}>
          <span style={styles.welcomeText}>
            Welcome, @{userHandle}!
          </span>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </header>
      
      <main style={styles.main}>
        <nav style={styles.nav}>
          <button 
            onClick={() => setCurrentTab('create')}
            style={{
              ...styles.navButton,
              backgroundColor: currentTab === 'create' ? '#007bff' : '#f8f9fa',
              color: currentTab === 'create' ? 'white' : '#333'
            }}
          >
            ✨ Share
          </button>
          <button 
            onClick={() => setCurrentTab('search')}
            style={{
              ...styles.navButton,
              backgroundColor: currentTab === 'search' ? '#007bff' : '#f8f9fa',
              color: currentTab === 'search' ? 'white' : '#333'
            }}
          >
            🔍 Search
          </button>
          <button 
            onClick={() => setCurrentTab('ask')}
            style={{
              ...styles.navButton,
              backgroundColor: currentTab === 'ask' ? '#007bff' : '#f8f9fa',
              color: currentTab === 'ask' ? 'white' : '#333'
            }}
          >
            🤔 Ask
          </button>
          <button 
            onClick={() => setCurrentTab('feed')}
            style={{
              ...styles.navButton,
              backgroundColor: currentTab === 'feed' ? '#007bff' : '#f8f9fa',
              color: currentTab === 'feed' ? 'white' : '#333'
            }}
          >
            📱 Feed
          </button>
          <button 
            onClick={() => setCurrentTab('friends')}
            style={{
              ...styles.navButton,
              backgroundColor: currentTab === 'friends' ? '#007bff' : '#f8f9fa',
              color: currentTab === 'friends' ? 'white' : '#333'
            }}
          >
            👥 Friends
          </button>
        </nav>

        {currentTab === 'create' && <CreateRecommendation />}
        {currentTab === 'search' && <SearchRecommendations />}
        {currentTab === 'ask' && <AskRecommendation />}
        {currentTab === 'feed' && <RecommendationsFeed />}
        {currentTab === 'friends' && <Friends />}
      </main>
    </div>
  );
}

const styles = {
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px'
  },
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa'
  },
  header: {
    backgroundColor: 'white',
    padding: '15px 20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    color: '#333',
    fontSize: '24px'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  welcomeText: {
    color: '#666',
    fontSize: '14px'
  },
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  main: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto'
  },
  nav: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    justifyContent: 'center'
  },
  navButton: {
    padding: '12px 24px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s'
  },
  comingSoon: {
    textAlign: 'center',
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  userDetails: {
    textAlign: 'left',
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '4px',
    marginTop: '20px'
  }
};

export default App;
