// src/components/CommentsSystem.js - Complete fixed version
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

export default function CommentsSystem({ requestId, responseIndex, onClose }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);
  const [requestData, setRequestData] = useState(null);
  const [responseData, setResponseData] = useState(null);

  const currentUser = auth.currentUser;
  const userHandle = currentUser?.email.split('@')[0];

  // Load request data to get context
  useEffect(() => {
    const loadRequestData = async () => {
      try {
        const requestQuery = query(
          collection(db, 'recommendation_requests'),
          where('__name__', '==', requestId)
        );
        const requestSnapshot = await getDocs(requestQuery);
        
        if (!requestSnapshot.empty) {
          const request = requestSnapshot.docs[0].data();
          const response = request.responses?.[responseIndex];
          
          setRequestData(request);
          setResponseData(response);
          
          console.log('📋 Request context loaded:', {
            requester: request.requesterHandle,
            responder: response?.responderHandle,
            currentUser: userHandle
          });
        }
      } catch (error) {
        console.error('Error loading request data:', error);
      }
    };

    if (requestId && responseIndex !== undefined) {
      loadRequestData();
    }
  }, [requestId, responseIndex, userHandle]);

  // Load comments for this specific response thread
  useEffect(() => {
    if (!requestId || responseIndex === undefined) return;

    console.log('Loading comments for thread:', requestId, 'response:', responseIndex);

    const commentsQuery = query(
      collection(db, 'recommendation_comments'),
      where('requestId', '==', requestId),
      where('responseIndex', '==', responseIndex),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const commentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('💬 Comments loaded:', commentsData.length);
        setComments(commentsData);
        setLoadingComments(false);
      },
      (error) => {
        console.error('Error loading comments:', error);
        setLoadingComments(false);
      }
    );

    return unsubscribe;
  }, [requestId, responseIndex]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'recommendation_comments'), {
        requestId,
        responseIndex,
        comment: newComment.trim(),
        authorEmail: currentUser.email,
        authorHandle: userHandle,
        timestamp: Date.now(),
        createdAt: serverTimestamp()
      });

      setNewComment('');
      console.log('💬 Comment added successfully');
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
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const isCurrentUserInThread = () => {
    if (!requestData || !responseData) return false;
    
    const isRequester = currentUser.email === requestData.requesterEmail;
    const isResponder = currentUser.email === responseData.responderEmail;
    
    return isRequester || isResponder;
  };

  const getThreadParticipants = () => {
    if (!requestData || !responseData) return '';
    
    const requester = requestData.requesterHandle;
    const responder = responseData.responderHandle;
    
    if (currentUser.email === requestData.requesterEmail) {
      return `You and @${responder}`;
    } else if (currentUser.email === responseData.responderEmail) {
      return `You and @${requester}`;
    } else {
      return `@${requester} and @${responder}`;
    }
  };

  // Check if user can participate in this thread
  if (!isCurrentUserInThread() && !loadingComments) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.header}>
            <h3 style={styles.title}>💬 Discussion</h3>
            <button onClick={onClose} style={styles.closeButton}>✕</button>
          </div>
          <div style={styles.accessDenied}>
            <div style={styles.accessIcon}>🔒</div>
            <p style={styles.accessText}>
              This conversation is between the person who asked for the recommendation 
              and the person who provided it.
            </p>
            <button onClick={onClose} style={styles.accessButton}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header with thread context */}
        <div style={styles.header}>
          <div style={styles.headerInfo}>
            <h3 style={styles.title}>💬 Discussion</h3>
            <p style={styles.threadInfo}>{getThreadParticipants()}</p>
          </div>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>

        {/* Thread context */}
        {requestData && responseData && (
          <div style={styles.threadContext}>
            <div style={styles.contextQuestion}>
              <strong>Question:</strong> {requestData.question}
            </div>
            <div style={styles.contextResponse}>
              <strong>@{responseData.responderHandle} recommended:</strong> {responseData.recommendation}
              <div style={styles.contextRating}>
                {'⭐'.repeat(responseData.rating)} ({responseData.rating}/5)
              </div>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div style={styles.commentsContainer}>
          {loadingComments ? (
            <div style={styles.loading}>
              <div style={styles.loadingSpinner}></div>
              <p style={styles.loadingText}>Loading conversation...</p>
            </div>
          ) : comments.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>💭</div>
              <p style={styles.emptyText}>Start the conversation! Ask a follow-up question.</p>
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
                      maxWidth: '80%',
                      marginLeft: isMyComment ? 'auto' : '0',
                      marginRight: isMyComment ? '0' : 'auto',
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
                placeholder={`Message @${responseData?.responderHandle || 'them'}...`}
                style={styles.textarea}
                rows={2}
                maxLength={500}
                disabled={loading}
              />
              <div style={styles.inputFooter}>
                <span style={styles.charCount}>
                  {newComment.length}/500
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
                  {loading ? (
                    <div style={styles.buttonLoading}>
                      <div style={styles.buttonSpinner}></div>
                      <span>Sending...</span>
                    </div>
                  ) : (
                    <>
                      <span style={styles.buttonIcon}>💬</span>
                      <span>Send</span>
                    </>
                  )}
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
    maxHeight: '85vh',
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
  
  threadInfo: {
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
  
  threadContext: {
    padding: '12px 20px',
    backgroundColor: '#F8F9FA',
    borderBottom: '1px solid #F2F2F7',
    flexShrink: 0,
  },
  
  contextQuestion: {
    fontSize: '13px',
    color: '#262626',
    marginBottom: '8px',
    lineHeight: '1.3',
  },
  
  contextResponse: {
    fontSize: '13px',
    color: '#262626',
    lineHeight: '1.3',
  },
  
  contextRating: {
    fontSize: '11px',
    color: '#8E8E93',
    marginTop: '4px',
  },
  
  accessDenied: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
    flex: 1,
  },
  
  accessIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  
  accessText: {
    color: '#8E8E93',
    fontSize: '16px',
    lineHeight: '1.4',
    marginBottom: '24px',
    margin: '0 0 24px 0',
  },
  
  accessButton: {
    backgroundColor: '#8E8E93',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    cursor: 'pointer',
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
    maxWidth: '80%',
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
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'opacity 0.2s ease',
  },
  
  buttonLoading: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  
  buttonSpinner: {
    width: '12px',
    height: '12px',
    border: '1px solid rgba(255,255,255,0.3)',
    borderTop: '1px solid white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  
  buttonIcon: {
    fontSize: '12px',
  },
};

// CSS for animations
const commentStyleSheet = document.createElement("style");
commentStyleSheet.innerText = `
  textarea:focus {
    border-color: #007AFF !important;
    background-color: #FFFFFF !important;
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1) !important;
  }
  
  @media (min-width: 768px) {
    .modal {
      border-radius: 20px !important;
      align-self: center !important;
      max-height: 70vh !important;
      margin: 40px !important;
    }
  }
`;
document.head.appendChild(commentStyleSheet);
