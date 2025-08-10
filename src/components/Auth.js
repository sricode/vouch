// src/components/AuthDebug.js - Debug authentication state
import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

export default function AuthDebug() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [authState, setAuthState] = useState('unknown');
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthState('authenticated');
        addLog(`🟢 User authenticated: ${user.email}`, 'success');
        addLog(`🔑 User UID: ${user.uid}`, 'info');
        addLog(`📧 Email verified: ${user.emailVerified}`, 'info');
      } else {
        setAuthState('unauthenticated');
        addLog('🔴 No user authenticated', 'error');
      }
    });

    return unsubscribe;
  }, []);

  const createAccount = async () => {
    try {
      addLog('🚀 Starting account creation...', 'info');
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      addLog(`✅ Account created successfully: ${userCredential.user.uid}`, 'success');
      
      // Test immediate Firestore write
      setTimeout(async () => {
        try {
          addLog('🔥 Testing Firestore write...', 'info');
          
          const testDoc = {
            email: userCredential.user.email,
            uid: userCredential.user.uid,
            timestamp: new Date(),
            test: 'debug'
          };
          
          // Try using setDoc with a specific document ID
          await setDoc(doc(db, 'users', userCredential.user.uid), testDoc);
          addLog('✅ Firestore write successful!', 'success');
          
        } catch (firestoreError) {
          addLog(`❌ Firestore write failed: ${firestoreError.message}`, 'error');
          addLog(`❌ Firestore error code: ${firestoreError.code}`, 'error');
        }
      }, 1000);
      
    } catch (error) {
      addLog(`❌ Account creation failed: ${error.message}`, 'error');
      addLog(`❌ Error code: ${error.code}`, 'error');
    }
  };

  const signIn = async () => {
    try {
      addLog('🔐 Signing in...', 'info');
      await signInWithEmailAndPassword(auth, email, password);
      addLog('✅ Sign in successful', 'success');
    } catch (error) {
      addLog(`❌ Sign in failed: ${error.message}`, 'error');
    }
  };

  const testFirestore = async () => {
    if (!auth.currentUser) {
      addLog('❌ No authenticated user for Firestore test', 'error');
      return;
    }

    try {
      addLog('🧪 Testing Firestore with current user...', 'info');
      
      const testData = {
        message: 'Hello from debug test',
        timestamp: new Date(),
        userEmail: auth.currentUser.email,
        userUID: auth.currentUser.uid
      };

      // Test 1: addDoc to users collection
      addLog('📝 Test 1: Adding document to users collection...', 'info');
      const docRef = await addDoc(collection(db, 'users'), testData);
      addLog(`✅ Test 1 SUCCESS: Document ID ${docRef.id}`, 'success');

      // Test 2: setDoc to specific document
      addLog('📝 Test 2: Setting document with specific ID...', 'info');
      await setDoc(doc(db, 'test', auth.currentUser.uid), testData);
      addLog('✅ Test 2 SUCCESS: Document set with user UID', 'success');

    } catch (error) {
      addLog(`❌ Firestore test failed: ${error.message}`, 'error');
      addLog(`❌ Error code: ${error.code}`, 'error');
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      addLog('🚪 Signed out successfully', 'info');
      setLogs([]);
    } catch (error) {
      addLog(`❌ Sign out failed: ${error.message}`, 'error');
    }
  };

  return (
    <div style={styles.container}>
      <h1>🐛 Firebase Auth & Firestore Debug</h1>
      
      <div style={styles.status}>
        <h3>Current Status: 
          <span style={authState === 'authenticated' ? styles.success : styles.error}>
            {authState}
          </span>
        </h3>
        {auth.currentUser && (
          <div>
            <p>Email: {auth.currentUser.email}</p>
            <p>UID: {auth.currentUser.uid}</p>
          </div>
        )}
      </div>

      <div style={styles.controls}>
        <div style={styles.inputGroup}>
          <label>Email:</label>
          <input 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
        </div>
        
        <div style={styles.inputGroup}>
          <label>Password:</label>
          <input 
            type="password"
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.buttons}>
          <button onClick={createAccount} style={styles.button}>
            🆕 Create Account
          </button>
          <button onClick={signIn} style={styles.button}>
            🔐 Sign In
          </button>
          <button onClick={testFirestore} style={styles.button}>
            🧪 Test Firestore
          </button>
          <button onClick={signOutUser} style={styles.button}>
            🚪 Sign Out
          </button>
        </div>
      </div>

      <div style={styles.logs}>
        <h3>Debug Logs:</h3>
        <div style={styles.logContainer}>
          {logs.map((log, index) => (
            <div 
              key={index} 
              style={{
                ...styles.logEntry,
                color: log.type === 'success' ? 'green' : log.type === 'error' ? 'red' : 'black'
              }}
            >
              <span style={styles.timestamp}>{log.timestamp}</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
    fontFamily: 'monospace',
  },
  status: {
    backgroundColor: '#f5f5f5',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  success: {
    color: 'green',
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    fontWeight: 'bold',
  },
  controls: {
    backgroundColor: '#f9f9f9',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  inputGroup: {
    marginBottom: '10px',
  },
  input: {
    marginLeft: '10px',
    padding: '5px',
    width: '200px',
  },
  buttons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '15px',
  },
  button: {
    padding: '8px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  logs: {
    backgroundColor: '#f0f0f0',
    padding: '15px',
    borderRadius: '8px',
  },
  logContainer: {
    maxHeight: '400px',
    overflowY: 'auto',
    backgroundColor: 'white',
    padding: '10px',
    borderRadius: '4px',
  },
  logEntry: {
    padding: '2px 0',
    fontSize: '12px',
  },
  timestamp: {
    color: '#666',
    marginRight: '10px',
  },
};
