// src/components/Friends.js
import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot,
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';
import InviteFriends from './InviteFriends';

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentView, setCurrentView] = useState('manage'); // 'manage' or 'invite'

  const currentUser = auth.currentUser;
  const currentUserHandle = currentUser?.email.split('@')[0];

  // Load friends and friend requests
  useEffect(() => {
    if (!currentUser) return;

    // Listen for friends (where current user is user1 or user2)
    const friendsQuery = query(
      collection(db, 'friendships'),
      where('status', '==', 'accepted')
    );

    const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
      const friendsList = [];
      snapshot.docs.forEach(doc => {
        const friendship = doc.data();
        // Add friend if current user is part of this friendship
        if (friendship.user1 === currentUser.email) {
          friendsList.push({
            id: doc.id,
            email: friendship.user2,
            handle: friendship.user2.split('@')[0],
            since: friendship.createdAt
          });
        } else if (friendship.user2 === currentUser.email) {
          friendsList.push({
            id: doc.id,
            email: friendship.user1,
            handle: friendship.user1.split('@')[0],
            since: friendship.createdAt
          });
        }
      });
      setFriends(friendsList);
    });

    // Listen for incoming friend requests
    const requestsQuery = query(
      collection(db, 'friendships'),
      where('user2', '==', currentUser.email),
      where('status', '==', 'pending')
    );

    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fromHandle: doc.data().user1.split('@')[0]
      }));
      setFriendRequests(requests);
    });

    return () => {
      unsubscribeFriends();
      unsubscribeRequests();
    };
  }, [currentUser]);

  const searchForUser = async () => {
    if (!searchUsername.trim()) return;

    setLoading(true);
    setMessage('');
    setSearchResult(null);

    try {
      // Clean the search input (remove @ if present)
      const cleanUsername = searchUsername.replace('@', '').toLowerCase().trim();
      const searchEmail = `${cleanUsername}@gmail.com`;

      // Check if user exists in users collection
      const userQuery = query(
        collection(db, 'users'),
        where('email', '==', searchEmail)
      );

      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        setMessage(`❌ User @${cleanUsername} not found`);
      } else if (searchEmail === currentUser.email) {
        setMessage(`❌ You can't add yourself as a friend!`);
      } else {
        // Check if already friends
        const friendshipQuery = query(
          collection(db, 'friendships'),
          where('user1', 'in', [currentUser.email, searchEmail]),
          where('user2', 'in', [currentUser.email, searchEmail])
        );

        const friendshipSnapshot = await getDocs(friendshipQuery);

        if (!friendshipSnapshot.empty) {
          const friendship = friendshipSnapshot.docs[0].data();
          if (friendship.status === 'accepted') {
            setMessage(`✅ Already friends with @${cleanUsername}`);
          } else {
            setMessage(`⏳ Friend request pending with @${cleanUsername}`);
          }
        } else {
          setSearchResult({
            email: searchEmail,
            handle: cleanUsername
          });
          setMessage(`✅ Found @${cleanUsername}!`);
        }
      }
    } catch (error) {
      console.error('Error searching for user:', error);
      setMessage('❌ Error searching for user');
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (targetEmail) => {
    try {
      await addDoc(collection(db, 'friendships'), {
        user1: currentUser.email,
        user2: targetEmail,
        status: 'pending',
        createdAt: new Date(),
        timestamp: Date.now()
      });

      setMessage(`✅ Friend request sent to @${targetEmail.split('@')[0]}!`);
      setSearchResult(null);
      setSearchUsername('');
    } catch (error) {
      console.error('Error sending friend request:', error);
      setMessage('❌ Error sending friend request');
    }
  };

  const acceptFriendRequest = async (requestId) => {
    try {
      const friendshipRef = doc(db, 'friendships', requestId);
      await deleteDoc(friendshipRef);

      // Create new accepted friendship
      const request = friendRequests.find(req => req.id === requestId);
      await addDoc(collection(db, 'friendships'), {
        user1: request.user1,
        user2: request.user2,
        status: 'accepted',
        createdAt: new Date(),
        timestamp: Date.now()
      });

      setMessage('✅ Friend request accepted!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      setMessage('❌ Error accepting friend request');
    }
  };

  const declineFriendRequest = async (requestId) => {
    try {
      const friendshipRef = doc(db, 'friendships', requestId);
      await deleteDoc(friendshipRef);
      setMessage('❌ Friend request declined');
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>👥 Friends</h2>

      {/* Tab Navigation */}
      <div style={styles.tabNavigation}>
        <button 
          onClick={() => setCurrentView('manage')}
          style={{
            ...styles.tabButton,
            backgroundColor: currentView === 'manage' ? '#007bff' : '#f8f9fa',
            color: currentView === 'manage' ? 'white' : '#333'
          }}
        >
          🔍 Manage Friends
        </button>
        <button 
          onClick={() => setCurrentView('invite')}
          style={{
            ...styles.tabButton,
            backgroundColor: currentView === 'invite' ? '#007bff' : '#f8f9fa',
            color: currentView === 'invite' ? 'white' : '#333'
          }}
        >
          📤 Invite Friends
        </button>
      </div>

      {currentView === 'invite' ? (
        <InviteFriends />
      ) : (
        <div>
          {/* Existing Friends Management Content */}

      {/* Add Friend Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🔍 Find Friends</h3>
        <div style={styles.searchContainer}>
          <input
            type="text"
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            placeholder="Enter username (e.g., testmail)"
            style={styles.searchInput}
            onKeyPress={(e) => e.key === 'Enter' && searchForUser()}
          />
          <button 
            onClick={searchForUser}
            disabled={loading || !searchUsername.trim()}
            style={{
              ...styles.searchButton,
              backgroundColor: (loading || !searchUsername.trim()) ? '#ccc' : '#007bff'
            }}
          >
            {loading ? '⏳' : '🔍'}
          </button>
        </div>

        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

        {searchResult && (
          <div style={styles.searchResult}>
            <div style={styles.userCard}>
              <span style={styles.username}>@{searchResult.handle}</span>
              <button 
                onClick={() => sendFriendRequest(searchResult.email)}
                style={styles.addButton}
              >
                ➕ Add Friend
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Friend Requests Section */}
      {friendRequests.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>📬 Friend Requests</h3>
          {friendRequests.map(request => (
            <div key={request.id} style={styles.requestCard}>
              <span style={styles.username}>@{request.fromHandle}</span>
              <div style={styles.requestButtons}>
                <button 
                  onClick={() => acceptFriendRequest(request.id)}
                  style={styles.acceptButton}
                >
                  ✅ Accept
                </button>
                <button 
                  onClick={() => declineFriendRequest(request.id)}
                  style={styles.declineButton}
                >
                  ❌ Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends List Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          ✅ Your Friends ({friends.length})
        </h3>
        {friends.length === 0 ? (
          <div style={styles.empty}>
            <p>No friends yet. Start by adding some friends above!</p>
            <p style={styles.hint}>
              💡 Tell your friends to sign up and you can find them by their username
            </p>
          </div>
        ) : (
          <div style={styles.friendsList}>
            {friends.map(friend => (
              <div key={friend.id} style={styles.friendCard}>
                <div style={styles.friendInfo}>
                  <span style={styles.username}>@{friend.handle}</span>
                  <span style={styles.friendSince}>
                    Friends since {new Date(friend.since?.seconds * 1000 || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <span style={styles.status}>🟢 Connected</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div style={styles.instructions}>
        <h4>How to add friends:</h4>
        <ol>
          <li>Ask your friend to sign up for Vouch</li>
          <li>Get their username (the part before @ in their email)</li>
          <li>Search for them above and send a friend request</li>
          <li>Once connected, you'll see each other's recommendations!</li>
        </ol>
      </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto'
  },
  title: {
    color: '#333',
    fontSize: '24px',
    textAlign: 'center',
    marginBottom: '30px'
  },
  section: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  sectionTitle: {
    color: '#333',
    fontSize: '16px',
    marginBottom: '15px',
    margin: '0 0 15px 0'
  },
  searchContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px'
  },
  searchInput: {
    flex: 1,
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
    outline: 'none'
  },
  searchButton: {
    padding: '12px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  message: {
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '10px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #ddd',
    fontSize: '14px'
  },
  searchResult: {
    marginTop: '10px'
  },
  userCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #e9ecef'
  },
  username: {
    fontWeight: 'bold',
    color: '#007bff',
    fontSize: '16px'
  },
  addButton: {
    padding: '6px 12px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  requestCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#fff3cd',
    borderRadius: '6px',
    border: '1px solid #ffeaa7',
    marginBottom: '10px'
  },
  requestButtons: {
    display: 'flex',
    gap: '8px'
  },
  acceptButton: {
    padding: '6px 12px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  declineButton: {
    padding: '6px 12px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  empty: {
    textAlign: 'center',
    color: '#666',
    padding: '20px'
  },
  hint: {
    fontSize: '12px',
    color: '#999'
  },
  friendsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  friendCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#d4edda',
    borderRadius: '6px',
    border: '1px solid #c3e6cb'
  },
  friendInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  friendSince: {
    fontSize: '11px',
    color: '#666'
  },
  status: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#28a745'
  },
  instructions: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: '1.5'
  },
  tabNavigation: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    justifyContent: 'center'
  },
  tabButton: {
    padding: '10px 20px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s'
  }
};
