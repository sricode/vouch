// src/components/RecommendationComments.js - Comments on vouches/recommendations
import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';

export default function RecommendationComments({ recommendationId, onClose }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);
  const [recommendationData, setRecommendationData] = useState(null);

  const currentUser = auth.currentUser;
  const userHandle = currentUser?.email.split('@')[0];

  // Load recommendation data for context
  useEffect(() => {
    if (!recommendationId) return;
    
    const loadRecommendation = async () => {
      try {
        const recsQuery = query(
          collection(db, 'recommendations'),
          where('__name__', '==', recommendationId)
        );
        const recsSnapshot = await getDocs(recsQuery);
        
        if (!recsSnapshot.empty) {
          setRecommendationData(recsSnapshot.docs[0].data());
        }
      } catch (error) {
        console.error('Error loading recommendation:', error);
      }
    };
    
    loadRecommendation();
  }, [recommendationId]);

  // Load comments for this recommendation
  useEffect(() => {
    if (!recommendationId) return;

    const commentsQuery = query(
      collection(db, 'recommendation_vouch_comments'),
      where('recommendationId', '==', recommendationId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const commentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setComments(commentsData);
        setLoadingComments(false);
      },
      (error) => {
        console.error('Error loading comments:', error);
        setLoadingComments(false);
      }
    );

    return unsubscribe;
  }, [recommendationId]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'recommendation_vouch_comments'), {
        recommendationId,
        comment: newComment.trim(),
        authorEmail: currentUser.email,
        authorHandle: userHandle,
        timestamp: Date.now(),
        createdAt: serverTimestamp()
      });

      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`;
    const diffDays = Math.ceil((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const getCategoryEmoji = (category) => {
    switch (category) {
      case 'products': return '🛍️';
      case 'services': return '🔧';
      case 'movies': return '🎬';
      default: return '❓';
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerInfo}>
            <h3 style={styles.title}>💬 Comments</h3>
            {recommendationData && (
              <p style={styles.subtitle}>on @{recommendationData.userHandle}'s recommendation</p>
            )}
          </div>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>

        {/* Recommendation Context */}
        {recommendationData && (
          <div style={styles.recommendationContext}>
            <div style={styles.contextHeader}>
              <span style={styles.contextCategory}>
                {getCategoryEmoji(recommendationData.category)} {recommendationData.category}
              </span>
              <div style={styles.contextRating}>
                {'⭐'.repeat(recommendationData.rating)} ({recommendationData.rating}/5)
              </div>
            </div>
            <h4 style={styles.contextTitle}>{recommendationData.title}</h4>
            {recommendationData.notes && (
              <p style={styles.contextNotes}>"{recommendationData.notes}"</p>
            )}
          </div>
        )}

        {/* Comments List */}
        <div style={styles.commentsContainer}>
          {loadingComments ? (
            <div style={styles.loading}>
              <div style={styles.loadingSpinner}></div>
              <p style={styles.loadingText}>Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>💭</div>
              <p style={styles.emptyText}>
                Be the first to comment on this recommendation!
              </p>
            </div>
          ) : (
            <div style={styles.commentsList}>
              {comments.map(comment => {
                const isMyComment = comment.authorEmail === currentUser.email;
                return (
                  <div 
                    key={comment.id} 
                    style={{
                      ...styles.commentCard,
                      alignSelf: isMyComment ? 'flex-end' : 'flex-start',
                      backgroundColor: isMyComment ? '#007AFF' : '#F0F0F0',
                      color: isMyComment ? '#FFFFFF' : '#262626',
                      maxWidth: '85%',
                    }}
                  >
                    <div style={styles.commentHeader}>
                      <span 
                        style={{
                          ...styles.commentAuthor,
                          color: isMyComment ? '#FFFFFF' : '#007AFF'
                        }}
                      >
                        {isMyComment ? 'You' : `@${comment.authorHandle}`}
                      </span>
                      <span 
                        style={{
                          ...styles.commentTime,
                          color: isMyComment ? 'rgba(255,255,255,0.8)' : '#8E8E93'
                        }}
                      >
                        {formatTime(comment.timestamp)}
                      </span>
                    </div>
                    <p style={styles.commentText}>{comment.comment}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Comment Form */}
        <div style={styles.commentForm}>
          <form onSubmit={handleSubmitComment} style={styles.form}>
            <div style={styles.inputContainer}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                style={styles.textarea}
                rows={2}
                maxLength={300}
                disabled={loading}
              />
              <div style={styles.inputFooter}>
                <span style={styles.charCount}>
                  {newComment.length}/300
                </span>
                <button 
                  type="submit" 
                  disabled={loading || !newComment.trim()}
                  style={{
                    ...styles.submitButton,
                    opacity: (loading || !newComment.trim()) ? 0.5 : 1,
                    cursor: (loading || !newComment.trim()) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? '💬 Posting...' : '💬 Comment'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 1000,
    padding: 0,
  },
  
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: '20px',
    borderTopRightRadius: '20px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #F2F2F7',
    flexShrink: 0,
  },
  
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#262626',
    margin: 0,
  },
  
  subtitle: {
    fontSize: '12px',
    color: '#8E8E93',
    margin: 0,
  },
  
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    color: '#8E8E93',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  recommendationContext: {
    padding: '12px 20px',
    backgroundColor: '#F8F9FA',
    borderBottom: '1px solid #F2F2F7',
    flexShrink: 0,
  },
  
  contextHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  
  contextCategory: {
    backgroundColor: '#E7F3FF',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    color: '#0066CC',
    textTransform: 'capitalize',
    fontWeight: 'bold',
  },
  
  contextRating: {
    fontSize: '12px',
    color: '#666',
  },
  
  contextTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#262626',
    margin: '0 0 6px 0',
  },
  
  contextNotes: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
    fontStyle: 'italic',
  },
  
  commentsContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 20px',
    minHeight: '200px',
    maxHeight: '400px',
  },
  
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: '12px',
  },
  
  loadingSpinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #F3F3F3',
    borderTop: '2px solid #007AFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  
  loadingText: {
    color: '#8E8E93',
    fontSize: '14px',
    margin: 0,
  },
  
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
  },
  
  emptyIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  
  emptyText: {
    color: '#8E8E93',
    fontSize: '14px',
    margin: 0,
    lineHeight: '1.4',
  },
  
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px 0',
  },
  
  commentCard: {
    borderRadius: '16px',
    padding: '12px 16px',
    maxWidth: '85%',
    wordBreak: 'break-word',
  },
  
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
    gap: '8px',
  },
  
  commentAuthor: {
    fontSize: '11px',
    fontWeight: '600',
    opacity: 0.8,
  },
  
  commentTime: {
    fontSize: '10px',
    opacity: 0.7,
    flexShrink: 0,
  },
  
  commentText: {
    fontSize: '14px',
    margin: 0,
    lineHeight: '1.3',
  },
  
  commentForm: {
    padding: '12px 20px 20px 20px',
    borderTop: '1px solid #F2F2F7',
    flexShrink: 0,
  },
  
  form: {
    width: '100%',
  },
  
  inputContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #E5E5EA',
    borderRadius: '12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'none',
    outline: 'none',
    backgroundColor: '#F8F9FA',
    boxSizing: 'border-box',
  },
  
  inputFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  charCount: {
    fontSize: '11px',
    color: '#8E8E93',
  },
  
  submitButton: {
    backgroundColor: '#007AFF',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '16px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
};
