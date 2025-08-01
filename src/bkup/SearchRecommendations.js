// src/components/SearchRecommendations.js
import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';

export default function SearchRecommendations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [allRecommendations, setAllRecommendations] = useState([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);

  const currentUser = auth.currentUser;

  // Load friends list to show friend indicators
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

  // Load all recommendations
  useEffect(() => {
    const q = query(
      collection(db, 'recommendations'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllRecommendations(recs);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Filter recommendations based on search and filters
  useEffect(() => {
    let filtered = [...allRecommendations];

    // Text search - search in title, notes, and user handle
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(rec => 
        rec.title.toLowerCase().includes(search) ||
        rec.notes.toLowerCase().includes(search) ||
        rec.userHandle.toLowerCase().includes(search)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(rec => rec.category === categoryFilter);
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      const minRating = parseInt(ratingFilter);
      filtered = filtered.filter(rec => rec.rating >= minRating);
    }

    setFilteredRecommendations(filtered);
  }, [allRecommendations, searchTerm, categoryFilter, ratingFilter]);

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

  const isFriend = (userEmail) => {
    return friends.includes(userEmail);
  };

  const isMyRecommendation = (userEmail) => {
    return userEmail === currentUser?.email;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setRatingFilter('all');
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
        <h2 style={styles.title}>🔍 Search Recommendations</h2>
        <p style={styles.subtitle}>
          Discover what others have recommended
        </p>
      </div>

      {/* Search and Filters */}
      <div style={styles.searchSection}>
        <div style={styles.searchBar}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for recommendations, users, or keywords..."
            style={styles.searchInput}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              style={styles.clearButton}
            >
              ✕
            </button>
          )}
        </div>

        <div style={styles.filters}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Category:</label>
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">🌟 All Categories</option>
              <option value="products">🛍️ Products</option>
              <option value="services">🔧 Services</option>
              <option value="movies">🎬 Movies & TV</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Min Rating:</label>
            <select 
              value={ratingFilter} 
              onChange={(e) => setRatingFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">⭐ Any Rating</option>
              <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
              <option value="4">⭐⭐⭐⭐ 4+ Stars</option>
              <option value="3">⭐⭐⭐ 3+ Stars</option>
            </select>
          </div>

          {(searchTerm || categoryFilter !== 'all' || ratingFilter !== 'all') && (
            <button onClick={clearFilters} style={styles.clearFiltersButton}>
              🗑️ Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div style={styles.resultsHeader}>
        <span style={styles.resultsCount}>
          {filteredRecommendations.length} recommendation{filteredRecommendations.length !== 1 ? 's' : ''} found
        </span>
        {searchTerm && (
          <span style={styles.searchQuery}>
            for "{searchTerm}"
          </span>
        )}
      </div>

      {/* Recommendations List */}
      {filteredRecommendations.length === 0 ? (
        <div style={styles.empty}>
          <h3>No recommendations found</h3>
          <p>Try adjusting your search terms or filters</p>
          {allRecommendations.length === 0 && (
            <p>Be the first to share some recommendations!</p>
          )}
        </div>
      ) : (
        <div style={styles.results}>
          {filteredRecommendations.map(rec => (
            <div key={rec.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.userInfo}>
                  <span style={styles.username}>@{rec.userHandle}</span>
                  {isMyRecommendation(rec.userEmail) && (
                    <span style={styles.myBadge}>You</span>
                  )}
                  {!isMyRecommendation(rec.userEmail) && isFriend(rec.userEmail) && (
                    <span style={styles.friendBadge}>Friend</span>
                  )}
                  {!isMyRecommendation(rec.userEmail) && !isFriend(rec.userEmail) && (
                    <span style={styles.publicBadge}>Public</span>
                  )}
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

      {/* Search Tips */}
      {!searchTerm && categoryFilter === 'all' && ratingFilter === 'all' && (
        <div style={styles.tips}>
          <h4>💡 Search Tips:</h4>
          <ul>
            <li><strong>Search by product name:</strong> "iPhone", "Netflix", "Pizza"</li>
            <li><strong>Search by username:</strong> "@testmail" to see their recommendations</li>
            <li><strong>Use filters:</strong> Narrow down by category or rating</li>
            <li><strong>Browse all:</strong> Scroll to discover new recommendations</li>
          </ul>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '700px',
    margin: '0 auto'
  },
  header: {
    textAlign: 'center',
    marginBottom: '25px'
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
  searchSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  searchBar: {
    position: 'relative',
    marginBottom: '15px'
  },
  searchInput: {
    width: '100%',
    padding: '12px 40px 12px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '16px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  clearButton: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '5px'
  },
  filters: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  filterLabel: {
    fontSize: '12px',
    color: '#666',
    fontWeight: 'bold'
  },
  filterSelect: {
    padding: '6px 10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    outline: 'none',
    backgroundColor: 'white'
  },
  clearFiltersButton: {
    padding: '6px 12px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px'
  },
  resultsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '15px',
    fontSize: '14px'
  },
  resultsCount: {
    color: '#333',
    fontWeight: 'bold'
  },
  searchQuery: {
    color: '#666',
    fontStyle: 'italic'
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    color: '#666'
  },
  results: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #f0f0f0'
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
    gap: '8px',
    flexWrap: 'wrap'
  },
  username: {
    fontWeight: 'bold',
    color: '#007bff',
    fontSize: '14px'
  },
  myBadge: {
    backgroundColor: '#28a745',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: 'bold'
  },
  friendBadge: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: 'bold'
  },
  publicBadge: {
    backgroundColor: '#6c757d',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: 'bold'
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
  },
  tips: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginTop: '20px',
    fontSize: '14px',
    lineHeight: '1.5'
  }
};
