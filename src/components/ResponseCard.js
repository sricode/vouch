// src/components/ResponseCard.js - Reusable response card with comments
import { useState } from 'react';
import { auth } from '../firebase';
import CommentsSystem from './CommentsSystem';

export default function ResponseCard({ 
  response, 
  responseIndex, 
  requestId, 
  requesterHandle,
  showCommentsButton = true 
}) {
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const currentUser = auth.currentUser;
  const userHandle = currentUser?.email.split('@')[0];

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

  const canParticipateInComments = () => {
    // User can comment if they are either:
    // 1. The person who asked for the recommendation (requesterHandle)
    // 2. The person who gave the recommendation (response.responderHandle)
    return userHandle === requesterHandle || userHandle === response.responderHandle;
  };

  const getCommentButtonText = () => {
    if (userHandle === requesterHandle) {
      return '💬 Ask follow-up';
    } else if (userHandle === response.responderHandle) {
      return '💬 Reply';
    } else {
      return '💬 View chat';
    }
  };

  return (
    <>
      <div style={styles.responseCard}>
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
        
        <div style={styles.responseActions}>
          <div style={styles.responseDate}>
            {formatDate(response.timestamp)}
          </div>
          
          {showCommentsButton && (
            <button 
              style={{
                ...styles.commentButton,
                backgroundColor: canParticipateInComments() ? '#007AFF' : '#8E8E93',
              }}
              onClick={() => setShowCommentsModal(true)}
            >
              {getCommentButtonText()}
            </button>
          )}
        </div>
      </div>

      {/* Comments Modal */}
      {showCommentsModal && (
        <CommentsSystem
          requestId={requestId}
          responseIndex={responseIndex}
          onClose={() => setShowCommentsModal(false)}
        />
      )}
    </>
  );
}

const styles = {
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
  
  responseActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #f0f0f0',
  },
  
  responseDate: {
    fontSize: '11px',
    color: '#999'
  },
  
  commentButton: {
    padding: '4px 12px',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
};
