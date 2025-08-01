// src/components/RecommendationsFeed.js
import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';

export default function RecommendationsFeed() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [friends, setFriends] = useState([]);

  const currentUser = auth.currentUser;

  // Load friends first
  useEffect(() => {
    if (!currentUser) return;

    const friendsQuery = query(
      collection(db, 'friendships'),
      where('status', '==', 'accepted')
    );

    const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
      const friendEmails = [currentUser.email]; // Include own recommendations
      
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

  // Load recommendations from friends
  useEffect(() => {
    if (friends.length === 0) return;

    // Simplified query - just get all recommendations and filter in JavaScript
    const q = query(
      collection(db, 'recommendations'),
      orderBy('timestamp', 'desc')
    );

    // Listen for real-time updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allRecs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter to only show recommendations from friends (including yourself)
      let filteredRecs = allRecs.filter(rec => 
        friends.includes(rec.userEmail)
      );

      // Apply category filter if not 'all'
      if (filter !== 'all') {
        filteredRecs = filteredRecs.filter(rec => rec.category === filter);
      }

      setRecommendations(filteredRecs);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching recommendations:', error);
      setLoading(false);
    });

    return unsubscribe; // Cleanup subscription
  }, [friends, filter]);

  const getStarDisplay = (rating) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const getCategoryEmoji = (category) => {
    switch (category) {
      case 'products': return '🛍️';
      case 'services': return '🔧';
      case 'movies': return '🎬';
      default: return '📝';
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
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <h3>Loading recommendations...</h3>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📱 Recommendations Feed</h2>
        <p style={styles.subtitle}>
          {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''} from you and your friends
        </p>
      </div>

      {/* Filter Buttons */}
      <div style={styles.filters}>
        <button 
          onClick={() => setFilter('all')}
          style={{
            ...styles.filterButton,
            backgroundColor: filter === 'all' ? '#007bff' : '#f8f9fa',
            color: filter === 'all' ? 'white' : '#333'
          }}
        >
          🌟 All
        </button>
        <button 
          onClick={() => setFilter('products')}
          style={{
            ...styles.filterButton,
            backgroundColor: filter === 'products' ? '#007bff' : '#f8f9fa',
            color: filter === 'products' ? 'white' : '#333'
          }}
        >
          🛍️ Products
        </button>
        <button 
          onClick={() => setFilter('services')}
          style={{
            ...styles.filterButton,
            backgroundColor: filter === 'services' ? '#007bff' : '#f8f9fa',
            color: filter === 'services' ? 'white' : '#333'
          }}
        >
          🔧 Services
        </button>
        <button 
          onClick={() => setFilter('movies')}
          style={{
            ...styles.filterButton,
            backgroundColor: filter === 'movies' ? '#007bff' : '#f8f9fa',
            color: filter === 'movies' ? 'white' : '#333'
          }}
        >
          🎬 Movies & TV
        </button>
      </div>

      {/* Recommendations List */}
      {recommendations.length === 0 ? (
        <div style={styles.empty}>
          <h3>No recommendations yet</h3>
          <p>Be the first to share a recommendation!</p>
        </div>
      ) : (
        <div style={styles.feed}>
          {recommendations.map(rec => (
            <div key={rec.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.userInfo}>
                  <span style={styles.username}>@{rec.userHandle}</span>
                  <span style={styles.category}>
                    {getCategoryEmoji(rec.category)} {rec.category}
                  </span>
                </div>
                <span style={styles.date}>
                  {formatDate(rec.timestamp)}
                </span>
              </div>
              
              <div style={styles.cardBody}>
                <h3 style={styles.recTitle}>{rec.title}</h3>
                <div style={styles.rating}>
                  {getStarDisplay(rec.rating)} ({rec.rating}/5)
                </div>
                {rec.notes && (
                  <p style={styles.notes}>"{rec.notes}"</p>
                )}
              </div>
              
              <div style={styles.cardFooter}>
                <span style={styles.vouchBadge}>
                  🗣️ Vouched by @{rec.userHandle}
                </span>
              </div>
            </div>
          ))}
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
  header: {
    textAlign: 'center',
    marginBottom: '20px'
  },
  title: {
    color: '#333',
    fontSize: '24px',
    marginBottom: '5px'
  },
  subtitle: {
    color: '#666',
    fontSize: '14px',
    margin: 0
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  filters: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  filterButton: {
    padding: '8px 16px',
    border: '1px solid #ddd',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'all 0.2s'
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    color: '#666'
  },
  feed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #f0f0f0',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  userInfo: {
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
  cardBody: {
    marginBottom: '15px'
  },
  recTitle: {
    color: '#333',
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px',
    margin: '0 0 8px 0'
  },
  rating: {
    fontSize: '16px',
    marginBottom: '10px',
    color: '#666'
  },
  notes: {
    color: '#555',
    fontSize: '14px',
    lineHeight: '1.4',
    fontStyle: 'italic',
    margin: 0,
    backgroundColor: '#f8f9fa',
    padding: '10px',
    borderRadius: '6px',
    borderLeft: '3px solid #007bff'
  },
  cardFooter: {
    borderTop: '1px solid #f0f0f0',
    paddingTop: '12px'
  },
  vouchBadge: {
    fontSize: '12px',
    color: '#28a745',
    fontWeight: 'bold',
    backgroundColor: '#d4edda',
    padding: '4px 8px',
    borderRadius: '12px'
  }
};
