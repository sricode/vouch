// src/components/Auth.js - Modern Mobile-First Design
import { useState } from 'react';
import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        if (username) {
          await updateProfile(userCredential.user, {
            displayName: username
          });
        }
      }
    } catch (error) {
      let errorMessage = 'Something went wrong';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email';
          break;
        default:
          errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setEmail('');
    setPassword('');
    setUsername('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Hero Section */}
        <div style={styles.hero}>
          <div style={styles.logoContainer}>
            <div style={styles.logo}>💬</div>
            <h1 style={styles.title}>Vouch</h1>
          </div>
          <p style={styles.subtitle}>
            Get recommendations from friends, not strangers
          </p>
          <div style={styles.features}>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>🔍</span>
              <span>Discover</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>👥</span>
              <span>Connect</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>💡</span>
              <span>Share</span>
            </div>
          </div>
        </div>
        
        {/* Auth Card */}
        <div style={styles.authCard}>
          <div style={styles.authHeader}>
            <h2 style={styles.authTitle}>
              {isLogin ? 'Welcome back' : 'Join Vouch'}
            </h2>
            <p style={styles.authSubtitle}>
              {isLogin ? 'Sign in to your account' : 'Create your account'}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} style={styles.form}>
            {!isLogin && (
              <div style={styles.inputGroup}>
                <label style={styles.label}>Display Name</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your name"
                  style={styles.input}
                  required={!isLogin}
                />
              </div>
            )}
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={styles.input}
                required
              />
            </div>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={styles.input}
                required
              />
            </div>
            
            {error && (
              <div style={styles.error}>
                <span style={styles.errorIcon}>⚠️</span>
                <span>{error}</span>
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={loading}
              style={{
                ...styles.submitButton,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <div style={styles.loadingContent}>
                  <div style={styles.spinner}></div>
                  <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                </div>
              ) : (
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>
          
          <div style={styles.switchSection}>
            <p style={styles.switchText}>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </p>
            <button 
              type="button" 
              onClick={switchMode}
              style={styles.switchButton}
            >
              {isLogin ? 'Create Account' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#FAFAFA',
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  
  content: {
    width: '100%',
    maxWidth: '400px',
    margin: '0 auto',
  },
  
  hero: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  
  logo: {
    fontSize: '40px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    borderRadius: '20px',
    width: '60px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
  },
  
  title: {
    fontSize: '36px',
    fontWeight: '800',
    color: '#262626',
    margin: 0,
    letterSpacing: '-1px',
  },
  
  subtitle: {
    fontSize: '18px',
    color: '#8E8E93',
    margin: '0 0 32px 0',
    fontWeight: '400',
    lineHeight: '1.4',
  },
  
  features: {
    display: 'flex',
    justifyContent: 'center',
    gap: '32px',
    marginBottom: '20px',
  },
  
  feature: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  
  featureIcon: {
    fontSize: '24px',
    marginBottom: '4px',
  },
  
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '32px 24px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
    border: '1px solid #F0F0F0',
  },
  
  authHeader: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  
  authTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#262626',
    margin: '0 0 8px 0',
  },
  
  authSubtitle: {
    fontSize: '16px',
    color: '#8E8E93',
    margin: 0,
  },
  
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '24px',
  },
  
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#262626',
  },
  
  input: {
    padding: '16px',
    border: '2px solid #F0F0F0',
    borderRadius: '12px',
    fontSize: '16px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: '#FAFAFA',
    fontFamily: 'inherit',
  },
  
  submitButton: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
    marginTop: '8px',
  },
  
  loadingContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  
  error: {
    color: '#FF3B30',
    fontSize: '14px',
    padding: '12px 16px',
    backgroundColor: '#FFF5F5',
    border: '1px solid #FFEBEE',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  
  errorIcon: {
    fontSize: '16px',
  },
  
  switchSection: {
    textAlign: 'center',
    paddingTop: '20px',
    borderTop: '1px solid #F0F0F0',
  },
  
  switchText: {
    color: '#8E8E93',
    fontSize: '14px',
    margin: '0 0 12px 0',
  },
  
  switchButton: {
    background: 'none',
    border: 'none',
    color: '#007AFF',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'color 0.2s ease',
  },
};

// Add input focus styles
const inputStyleSheet = document.createElement("style");
inputStyleSheet.innerText = `
  input:focus {
    border-color: #007AFF !important;
    background-color: #FFFFFF !important;
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1) !important;
  }
  
  button:active {
    transform: scale(0.98);
  }
  
  @media (max-width: 480px) {
    .auth-card {
      margin: 0 -4px;
    }
  }
`;
document.head.appendChild(inputStyleSheet);
