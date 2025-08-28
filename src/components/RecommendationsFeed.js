// src/components/RecommendationsFeed.js - With comments support
import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, where, getDocs } from 'firebase/firestore';
import CommentsSystem from './CommentsSystem';

export default function RecommendationsFeed() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [friends, setFriends] = useState([]);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedCommentContext, setSelectedCommentContext] = useState(null);
  const [recommendationRequests, setRecommendationRequests] = useState([]);

  const currentUser = auth.currentUser;
  const getUserHandle = (email) => email ? email.split('@')[0] : '';

  // Load friends first
  useEffect(() => {
    if (!currentUser) return;

    const friendsQuery = query(
      collection(db, 'friendships'),
      where('status', '==', 'accepted')
    );

    const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
      const friendEmails = [currentUser.email];
      
      snapshot.docs.forEach(doc => {
        const friendship = doc.data();
        if (friendship.user1 === currentUser.email) {
          friendEmails.push(friendship.user2);
        } else if (friendship.user2 === currentUser.email) {
          friendEmails.push(friendship.user1);
        }
      });
      
      setFriends(friendEmails);
    });

    return unsubscribeFriends;
  }, [currentUser]);

  // Load recommendation requests to match responses with comments
  useEffect(() => {
    if (!currentUser) return;

    const requestsQuery = query(
      collection(db, 'recommendation_requests'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecommendationRequests(requests);
    });

    return unsubscribeRequests;
  }, [currentUser]);

  // Load recommendations
  useEffect(() => {
    if (friends.length === 0) return;

    const q = query(
      collection(db, 'recommendations'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allRecs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      let filteredRecs = allRecs.filter(rec => 
        friends.includes(rec.userEmail)
      );

      if (filter !== 'all') {
        filteredRecs = filteredRecs.filter(rec => rec.category === filter);
      }

      setRecommendations(filteredRecs);
      setLoading(false);
    });

    return unsubscribe;
  }, [friends, filter]);

  // Find if a recommendation was given in response to a request
  const findRecommendationContext = (recommendation) => {
    for (const request of recommendationRequests) {
      if (request.responses) {
        for (let i = 0; i < request.responses.length; i++) {
          const response = request.responses[i];
          if (response.responderEmail === recommendation.userEmail && 
              response.recommendation === recommendation.title) {
            return {
              requestId: request.id,
              responseIndex: i,
              requesterHandle: request.requesterHandle
            };
          }
        }
      }
    }
    return null;
  };

  const handleOpenComments = (requestId, responseIndex) => {
    setSelectedCommentContext({ requestId, responseIndex });
    setShowCommentsModal(true);
  };

  const handleCloseComments = () => {
    setShowCommentsModal(false);
    setSelectedCommentContext(null);
  };

  const getStarDisplay = (rating) => {
    return '⭐'.repeat(rating);
  };

  const getCategoryEmoji = (category) => {
    switch (category) {
      case 'products': return '🛍️';
      case 'services': return '🔧';
      case 'movies': return '🎬';
      default: return '📝';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'products': return '#FF6B6B';
      case 'services': return '#4ECDC4';
      case 'movies': return '#45B7D1';
      default: return '#96CEB4';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1}d`;
    return date.toLocaleDateString();
  };

  const filters = [
    { id: 'all', label: 'All', emoji: '🌟' },
    { id: 'products', label: 'Products', emoji: '🛍️' },
    { id: 'services', label: 'Services', emoji: '🔧' },
    { id: 'movies', label: 'Movies', emoji: '🎬' },
  ];

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.loadingSpinner}></div>
          <p style={styles.loadingText}>Loading recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Recommendations</h2>
        <p style={styles.subtitle}>
          {recommendations.length} from you and friends
        </p>
      </div>

      {/* Filter Pills */}
      <div style={styles.filtersContainer}>
        <div style={styles.filters}>
          {filters.map((filterItem) => (
            <button
              key={filterItem.id}
              onClick={() => setFilter(filterItem.id)}
              style={{
                ...styles.filterPill,
                backgroundColor: filter === filterItem.id ? '#000' : '#F2F2F7',
                color: filter === filterItem.id ? '#FFF' : '#8E8E93',
              }}
            >
              <span style={styles.filterEmoji}>{filterItem.emoji}</span>
              <span style={styles.filterLabel}>{filterItem.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      {recommendations.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📭</div>
          <h3 style={styles.emptyTitle}>No recommendations yet</h3>
          <p style={styles.emptyText}>
            Start by sharing something you love or connect with friends!
          </p>
        </div>
      ) : (
        <div style={styles.feed}>
          {recommendations.map(rec => {
            const context = findRecommendationContext(rec);
            const isMyRecommendation = rec.userEmail === currentUser?.email;
            
            return (
              <div key={rec.id} style={styles.card}>
                {/* Card Header */}
                <div style={styles.cardHeader}>
                  <div style={styles.userInfo}>
                    <div style={styles.avatar}>
                      {rec.userHandle.charAt(0).toUpperCase()}
                    </div>
                    <div style={styles.userDetails}>
                      <span style={styles.username}>@{rec.userHandle}</span>
                      <span style={styles.timestamp}>{formatDate(rec.timestamp)}</span>
                    </div>
                  </div>
                  
                  <div 
                    style={{
                      ...styles.categoryBadge,
                      backgroundColor: getCategoryColor(rec.category) + '20',
                      color: getCategoryColor(rec.category),
                    }}
                  >
                    <span>{getCategoryEmoji(rec.category)}</span>
                    <span style={styles.categoryText}>{rec.category}</span>
                  </div>
                </div>
                
                {/* Card Content */}
                <div style={styles.cardContent}>
                  <h3 style={styles.recTitle}>{rec.title}</h3>
                  
                  <div style={styles.rating}>
                    <span style={styles.stars}>{getStarDisplay(rec.rating)}</span>
                    <span style={styles.ratingText}>({rec.rating}/5)</span>
                  </div>
                  
                  {rec.notes && (
                    <p style={styles.notes}>{rec.notes}</p>
                  )}
                </div>
                
                {/* Card Footer with Enhanced Actions */}
                <div style={styles.cardFooter}>
                  <div style={styles.vouchBadge}>
                    <span style={styles.vouchIcon}>✨</span>
                    <span style={styles.vouchText}>Vouched by @{rec.userHandle}</span>
                  </div>
                  
                  {/* NEW: Comment Access for Recommendations given in response to requests */}
                  {context && (
                    <div style={styles.commentSection}>
                      {isMyRecommendation ? (
                        <button 
                          style={styles.replyButton}
                          onClick={() => handleOpenComments(context.requestId, context.responseIndex)}
                        >
                          💬 View chat
                        </button>
                      ) : (
                        <span style={styles.responseContext}>
                          Response to @{context.requesterHandle}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comments Modal */}
      {showCommentsModal && selectedCommentContext && (
        <CommentsSystem
          requestId={selectedCommentContext.requestId}
          responseIndex={selectedCommentContext.responseIndex}
          onClose={handleCloseComments}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '0',
    minHeight: '100vh',
    backgroundColor: '#FAFAFA',
  },
  
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
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
    margin: 0,
  },
  
  header: {
    padding: '20px 20px 16px 20px',
    backgroundColor: '#FAFAFA',
  },
  
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#262626',
    margin: '0 0 4px 0',
    letterSpacing: '-0.5px',
  },
  
  subtitle: {
    fontSize: '16px',
    color: '#8E8E93',
    margin: 0,
    fontWeight: '400',
  },
  
  filtersContainer: {
    padding: '0 20px 20px 20px',
    backgroundColor: '#FAFAFA',
  },
  
  filters: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '4px',
    WebkitOverflowScrolling: 'touch',
  },
  
  filterPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  
  filterEmoji: {
    fontSize: '16px',
  },
  
  filterLabel: {
    fontSize: '14px',
    fontWeight: '600',
  },
  
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#262626',
    margin: '0 0 8px 0',
  },
  
  emptyText: {
    fontSize: '16px',
    color: '#8E8E93',
    margin: 0,
    lineHeight: '1.4',
  },
  
  feed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    backgroundColor: '#DBDBDB',
  },
  
  card: {
    backgroundColor: '#FFFFFF',
    padding: '16px 20px',
    transition: 'all 0.2s ease',
  },
  
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#262626',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
  },
  
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  
  username: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#262626',
  },
  
  timestamp: {
    fontSize: '13px',
    color: '#8E8E93',
  },
  
  categoryBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
  },
  
  categoryText: {
    textTransform: 'capitalize',
    fontSize: '12px',
  },
  
  cardContent: {
    marginBottom: '16px',
  },
  
  recTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#262626',
    margin: '0 0 8px 0',
    lineHeight: '1.3',
  },
  
  rating: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '12px',
  },
  
  stars: {
    fontSize: '16px',
    lineHeight: 1,
  },
  
  ratingText: {
    fontSize: '14px',
    color: '#8E8E93',
    fontWeight: '500',
  },
  
  notes: {
    fontSize: '15px',
    color: '#3C3C43',
    lineHeight: '1.4',
    margin: 0,
    fontStyle: 'italic',
  },
  
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid #F2F2F7',
  },
  
  vouchBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  
  vouchIcon: {
    fontSize: '14px',
  },
  
  vouchText: {
    fontSize: '13px',
    color: '#8E8E93',
    fontWeight: '500',
  },
  
  // NEW: Comment-related styles
  commentSection: {
    display: 'flex',
    alignItems: 'center',
  },
  
  replyButton: {
    padding: '6px 12px',
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  
  responseContext: {
    fontSize: '11px',
    color: '#8E8E93',
    fontStyle: 'italic',
  },
};

const feedStyleSheet = document.createElement("style");
feedStyleSheet.innerText = `
  /* Hide scrollbar for filter pills */
  .filters::-webkit-scrollbar {
    display: none;
  }
  
  .filters {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  /* Card hover effect on desktop */
  @media (hover: hover) {
    .card:hover {
      background-color: #F8F8F8;
    }
  }
  
  /* Touch feedback */
  .card:active {
    background-color: #F2F2F7;
  }
`;
document.head.appendChild(feedStyleSheet);
