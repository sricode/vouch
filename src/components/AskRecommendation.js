// src/components/AskRecommendation.js
import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import RespondToRequest from './RespondToRequest';

export default function AskRecommendation() {
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('products');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [myRequests, setMyRequests] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);

  const currentUser = auth.currentUser;
  const userHandle = currentUser?.email.split('@')[0];

  // Load friends list
  useEffect(() => {
    if (!currentUser) return;

    const friendsQuery = query(
      collection(db, 'friendships'),
      where('status', '==', 'accepted')
    );

    const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
      const friendEmails = [];
      
      snapshot.docs.forEach(doc => {
        const friendship = doc.data();
        if (friendship.user1 === currentUser.email) {
          friendEmails.push({
            email: friendship.user2,
            handle: friendship.user2.split('@')[0]
          });
        } else if (friendship.user2 === currentUser.email) {
          friendEmails.push({
            email: friendship.user1,
            handle: friendship.user1.split('@')[0]
          });
        }
      });
      
      setFriends(friendEmails);
    });

    return unsubscribeFriends;
  }, [currentUser]);

  // Load my requests
  useEffect(() => {
    if (!currentUser) return;

    // Simplified query - get all requests, filter in JavaScript
    const myRequestsQuery = query(
      collection(db, 'recommendation_requests'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeMyRequests = onSnapshot(myRequestsQuery, (snapshot) => {
      const allRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter to only my requests
      const myRequests = allRequests.filter(req => 
        req.requesterEmail === currentUser.email
      );
      
      setMyRequests(myRequests);
    });

    return unsubscribeMyRequests;
  }, [currentUser]);

  // Load incoming requests (from friends)
  useEffect(() => {
    if (!currentUser || friends.length === 0) return;

    const friendEmails = friends.map(f => f.email);
    
    // Simplified query - get all requests, filter in JavaScript
    const incomingQuery = query(
      collection(db, 'recommendation_requests'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeIncoming = onSnapshot(incomingQuery, (snapshot) => {
      const allRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        requesterHandle: doc.data().requesterEmail.split('@')[0]
      }));
      
      // Filter to only requests from friends that are still open
      const friendRequests = allRequests.filter(req => 
        friendEmails.includes(req.requesterEmail) && req.status === 'open'
      );
      
      setIncomingRequests(friendRequests);
    });

    return unsubscribeIncoming;
  }, [currentUser, friends]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    try {
      await addDoc(collection(db, 'recommendation_requests'), {
        question: question.trim(),
        category,
        description: description.trim(),
        requesterEmail: currentUser.email,
        requesterHandle: userHandle,
        status: 'open', // open, closed
        responses: [], // Will store friend responses
        createdAt: new Date(),
        timestamp: Date.now()
      });

      // Reset form
      setQuestion('');
      setDescription('');
      setCategory('products');
      setSuccess('✅ Request sent to your friends!');
      
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      console.error('Error creating request:', error);
      alert('Error creating request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryEmoji = (category) => {
    switch (category) {
      case 'products': return '🛍️';
      case 'services': return '🔧';
      case 'movies': return '🎬';
      default: return '❓';
    }
  };

  const getStatusColor = (status) => {
    return status === 'open' ? '#28a745' : '#6c757d';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  if (friends.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.noFriends}>
          <h2>🤔 Ask for Recommendations</h2>
          <p>You need friends to ask for recommendations!</p>
          <p>Go to the Friends tab to add some friends first.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🤔 Ask for Recommendations</h2>
      
      {/* Create Request Form */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>💭 Ask Your Friends</h3>
        
        {success && (
          <div style={styles.success}>
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>What do you need recommendations for?</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Best mirrorless camera under $1000, Swimming instructor in downtown"
              style={styles.input}
              required
              maxLength={150}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Category</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              style={styles.select}
            >
              <option value="products">🛍️ Products</option>
              <option value="services">🔧 Services</option>
              <option value="movies">🎬 Movies & TV</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Additional details (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any specific requirements, budget, preferences..."
              style={styles.textarea}
              rows={3}
              maxLength={300}
            />
            <div style={styles.charCount}>
              {description.length}/300 characters
            </div>
          </div>

          <div style={styles.friendsInfo}>
            <p>📢 This will be visible to your {friends.length} friend{friends.length !== 1 ? 's' : ''}:</p>
            <div style={styles.friendsList}>
              {friends.map((friend, index) => (
                <span key={index} style={styles.friendTag}>@{friend.handle}</span>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || !question.trim()}
            style={{
              ...styles.button,
              backgroundColor: (loading || !question.trim()) ? '#ccc' : '#007bff',
              cursor: (loading || !question.trim()) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '⏳ Asking...' : '🤔 Ask Friends'}
          </button>
        </form>
      </div>

      {/* Friends' Requests */}
      {incomingRequests.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>💬 Friends Need Your Help ({incomingRequests.length})</h3>
          {incomingRequests.map(request => (
            <div key={request.id} style={styles.requestCard}>
              <div style={styles.requestHeader}>
                <div style={styles.requestInfo}>
                  <span style={styles.username}>@{request.requesterHandle} asks:</span>
                  <span style={styles.category}>
                    {getCategoryEmoji(request.category)} {request.category}
                  </span>
                </div>
                <span style={styles.date}>
                  {formatDate(request.timestamp)}
                </span>
              </div>
              
              <div style={styles.requestBody}>
                <h4 style={styles.requestQuestion}>{request.question}</h4>
                {request.description && (
                  <p style={styles.requestDescription}>{request.description}</p>
                )}
              </div>
              
              <div style={styles.requestActions}>
                <button 
                  style={styles.helpButton}
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowResponseModal(true);
                  }}
                >
                  💡 Help with recommendation
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My Requests */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📋 My Requests ({myRequests.length})</h3>
        {myRequests.length === 0 ? (
          <div style={styles.empty}>
            <p>You haven't asked for any recommendations yet.</p>
          </div>
        ) : (
          <div style={styles.requestsList}>
            {myRequests.map(request => (
              <div key={request.id} style={styles.myRequestCard}>
                <div style={styles.requestHeader}>
                  <span style={styles.category}>
                    {getCategoryEmoji(request.category)} {request.category}
                  </span>
                  <div style={styles.statusBadge}>
                    <span 
                      style={{
                        ...styles.status,
                        color: getStatusColor(request.status)
                      }}
                    >
                      {request.status === 'open' ? '🔵 Open' : '⭕ Closed'}
                    </span>
                    <span style={styles.date}>
                      {formatDate(request.timestamp)}
                    </span>
                  </div>
                </div>
                
                <h4 style={styles.requestQuestion}>{request.question}</h4>
                {request.description && (
                  <p style={styles.requestDescription}>{request.description}</p>
                )}
                
                <div style={styles.responseCount}>
                  📬 {request.responses?.length || 0} response{(request.responses?.length || 0) !== 1 ? 's' : ''} from friends
                </div>
                
                {/* Show responses if any */}
                {request.responses && request.responses.length > 0 && (
                  <div style={styles.responsesSection}>
                    <h5 style={styles.responsesTitle}>💡 Friend Recommendations:</h5>
                    {request.responses.map((response, index) => (
                      <div key={index} style={styles.responseCard}>
                        <div style={styles.responseHeader}>
                          <span style={styles.responderName}>@{response.responderHandle}</span>
                          <div style={styles.responseRating}>
                            {'⭐'.repeat(response.rating)} ({response.rating}/5)
                          </div>
                        </div>
                        <h6 style={styles.responseRecommendation}>{response.recommendation}</h6>
                        {response.notes && (
                          <p style={styles.responseNotes}>"{response.notes}"</p>
                        )}
                        <div style={styles.responseDate}>
                          {formatDate(response.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Response Modal */}
      {showResponseModal && selectedRequest && (
        <RespondToRequest 
          request={selectedRequest}
          onClose={() => {
            setShowResponseModal(false);
            setSelectedRequest(null);
          }}
          onSuccess={() => {
            setSuccess('✅ Your recommendation has been sent!');
            setTimeout(() => setSuccess(''), 3000);
          }}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '700px',
    margin: '0 auto'
  },
  title: {
    color: '#333',
    fontSize: '24px',
    textAlign: 'center',
    marginBottom: '25px'
  },
  noFriends: {
    textAlign: 'center',
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    color: '#666'
  },
  section: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  sectionTitle: {
    color: '#333',
    fontSize: '18px',
    marginBottom: '20px',
    margin: '0 0 20px 0'
  },
  success: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '20px',
    textAlign: 'center',
    border: '1px solid #c3e6cb'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: '14px'
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
    outline: 'none'
  },
  select: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
    outline: 'none',
    backgroundColor: 'white'
  },
  textarea: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  charCount: {
    fontSize: '12px',
    color: '#666',
    textAlign: 'right'
  },
  friendsInfo: {
    backgroundColor: '#e7f3ff',
    padding: '15px',
    borderRadius: '6px',
    border: '1px solid #b8daff'
  },
  friendsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '8px'
  },
  friendTag: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  button: {
    padding: '15px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px'
  },
  requestCard: {
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '15px',
    backgroundColor: '#fff9e6'
  },
  myRequestCard: {
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '15px',
    backgroundColor: '#f8f9fa'
  },
  requestHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  requestInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  username: {
    fontWeight: 'bold',
    color: '#007bff',
    fontSize: '14px'
  },
  category: {
    backgroundColor: '#f8f9fa',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    color: '#666',
    textTransform: 'capitalize'
  },
  date: {
    fontSize: '12px',
    color: '#999'
  },
  requestBody: {
    marginBottom: '15px'
  },
  requestQuestion: {
    color: '#333',
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '8px',
    margin: '0 0 8px 0'
  },
  requestDescription: {
    color: '#555',
    fontSize: '14px',
    lineHeight: '1.4',
    margin: 0,
    fontStyle: 'italic'
  },
  requestActions: {
    borderTop: '1px solid #e9ecef',
    paddingTop: '12px'
  },
  helpButton: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  statusBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px'
  },
  status: {
    fontSize: '12px',
    fontWeight: 'bold'
  },
  responseCount: {
    fontSize: '12px',
    color: '#666',
    backgroundColor: '#e9ecef',
    padding: '6px 10px',
    borderRadius: '12px',
    display: 'inline-block',
    marginBottom: '15px'
  },
  responsesSection: {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #e9ecef'
  },
  responsesTitle: {
    color: '#333',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '10px',
    margin: '0 0 10px 0'
  },
  responseCard: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '10px'
  },
  responseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  responderName: {
    fontWeight: 'bold',
    color: '#007bff',
    fontSize: '13px'
  },
  responseRating: {
    fontSize: '12px',
    color: '#666'
  },
  responseRecommendation: {
    color: '#333',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '6px',
    margin: '0 0 6px 0'
  },
  responseNotes: {
    color: '#555',
    fontSize: '12px',
    lineHeight: '1.4',
    fontStyle: 'italic',
    margin: '0 0 6px 0'
  },
  responseDate: {
    fontSize: '11px',
    color: '#999'
  },
  empty: {
    textAlign: 'center',
    color: '#666',
    padding: '20px'
  },
  requestsList: {
    display: 'flex',
    flexDirection: 'column'
  }
};
