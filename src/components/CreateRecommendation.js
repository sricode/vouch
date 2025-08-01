// src/components/CreateRecommendation.js
import { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function CreateRecommendation() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('products');
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    try {
      // Get current user info
      const user = auth.currentUser;
      const userHandle = user.email.split('@')[0];

      // Add recommendation to Firestore
      await addDoc(collection(db, 'recommendations'), {
        title: title.trim(),
        category,
        rating: Number(rating),
        notes: notes.trim(),
        userId: user.uid,
        userEmail: user.email,
        userHandle: userHandle,
        createdAt: new Date(),
        timestamp: Date.now() // For easy sorting
      });

      // Reset form and show success
      setTitle('');
      setNotes('');
      setRating(5);
      setSuccess('✅ Recommendation added successfully!');
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      console.error('Error adding recommendation:', error);
      alert('Error adding recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStarDisplay = (num) => {
    return '⭐'.repeat(num);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>✨ Create Recommendation</h2>
      
      {success && (
        <div style={styles.success}>
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>What are you recommending?</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., iPhone 15 Pro, Joe's Pizza, The Bear TV Show"
            style={styles.input}
            required
            maxLength={100}
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
            placeholder="Share your experience... What made this great?"
            style={styles.textarea}
            rows={4}
            maxLength={500}
          />
          <div style={styles.charCount}>
            {notes.length}/500 characters
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading || !title.trim()}
          style={{
            ...styles.button,
            backgroundColor: (loading || !title.trim()) ? '#ccc' : '#28a745',
            cursor: (loading || !title.trim()) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Adding...' : '🗣️ Share Recommendation'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    maxWidth: '600px',
    margin: '0 auto'
  },
  title: {
    color: '#333',
    marginBottom: '25px',
    textAlign: 'center',
    fontSize: '24px'
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
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  select: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
    outline: 'none',
    backgroundColor: 'white'
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
  button: {
    padding: '15px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'background-color 0.2s'
  }
};
