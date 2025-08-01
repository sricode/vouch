// src/components/RespondToRequest.js
import { useState } from 'react';
import { db, auth } from '../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function RespondToRequest({ request, onClose, onSuccess }) {
  const [recommendation, setRecommendation] = useState('');
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const currentUser = auth.currentUser;
  const userHandle = currentUser?.email.split('@')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = {
        responderEmail: currentUser.email,
        responderHandle: userHandle,
        recommendation: recommendation.trim(),
        rating: Number(rating),
        notes: notes.trim(),
        createdAt: new Date(),
        timestamp: Date.now()
      };

      // Add response to the request's responses array
      const requestRef = doc(db, 'recommendation_requests', request.id);
      await updateDoc(requestRef, {
        responses: arrayUnion(response)
      });

      onSuccess && onSuccess();
      onClose && onClose();

    } catch (error) {
      console.error('Error adding response:', error);
      alert('Error adding response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStarDisplay = (num) => {
    return '⭐'.repeat(num);
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
        <div style={styles.header}>
          <h3 style={styles.title}>💡 Help @{request.requesterHandle}</h3>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>

        {/* Request Summary */}
        <div style={styles.requestSummary}>
          <div style={styles.requestHeader}>
            <span style={styles.category}>
              {getCategoryEmoji(request.category)} {request.category}
            </span>
          </div>
          <h4 style={styles.requestQuestion}>{request.question}</h4>
          {request.description && (
            <p style={styles.requestDescription}>"{request.description}"</p>
          )}
        </div>

        {/* Response Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>What do you recommend?</label>
            <input
              type="text"
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              placeholder="e.g., Sony A7IV, Joe's Swimming Academy, The Bear on Hulu"
              style={styles.input}
              required
              maxLength={100}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Rating: {getStarDisplay(rating)} ({rating}/5)
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              style={styles.slider}
            />
            <div style={styles.ratingLabels}>
              <span>1⭐</span>
              <span>2⭐</span>
              <span>3⭐</span>
              <span>4⭐</span>
              <span>5⭐</span>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Why do you recommend this?</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Share your experience and why this would be perfect for their needs..."
              style={styles.textarea}
              rows={3}
              maxLength={300}
            />
            <div style={styles.charCount}>
              {notes.length}/300 characters
            </div>
          </div>

          <div style={styles.actions}>
            <button 
              type="button" 
              onClick={onClose}
              style={styles.cancelButton}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || !recommendation.trim()}
              style={{
                ...styles.submitButton,
                backgroundColor: (loading || !recommendation.trim()) ? '#ccc' : '#28a745',
                cursor: (loading || !recommendation.trim()) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '⏳ Sending...' : '💡 Send Recommendation'}
            </button>
          </div>
        </form>
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
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 25px 15px 25px',
    borderBottom: '1px solid #e9ecef'
  },
  title: {
    color: '#333',
    fontSize: '18px',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#666',
    padding: '0',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  requestSummary: {
    padding: '20px 25px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e9ecef'
  },
  requestHeader: {
    marginBottom: '10px'
  },
  category: {
    backgroundColor: '#e7f3ff',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#0066cc',
    textTransform: 'capitalize',
    fontWeight: 'bold'
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
  form: {
    padding: '25px',
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
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: '#ddd',
    outline: 'none'
  },
  ratingLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#666',
    marginTop: '5px'
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
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '10px'
  },
  cancelButton: {
    padding: '12px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  submitButton: {
    padding: '12px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  }
};
