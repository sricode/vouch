// src/components/VotingButtons.js - Improved thumbs up/down voting system
import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot,
  deleteDoc,
  doc,
  getDocs
} from 'firebase/firestore';

export default function VotingButtons({ 
  itemId, 
  itemType, // 'recommendation' or 'request'
  compact = false 
}) {
  const [votes, setVotes] = useState({ up: 0, down: 0 });
  const [userVote, setUserVote] = useState(null); // 'up', 'down', or null
  const [loading, setLoading] = useState(false);

  const currentUser = auth.currentUser;
  const userHandle = currentUser?.email.split('@')[0];

  // Load votes for this item
  useEffect(() => {
    if (!itemId || !currentUser) return;

    const votesQuery = query(
      collection(db, 'votes'),
      where('itemId', '==', itemId),
      where('itemType', '==', itemType)
    );

    const unsubscribe = onSnapshot(votesQuery, (snapshot) => {
      const allVotes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Count votes
      const upVotes = allVotes.filter(vote => vote.voteType === 'up').length;
      const downVotes = allVotes.filter(vote => vote.voteType === 'down').length;
      
      setVotes({ up: upVotes, down: downVotes });

      // Check current user's vote
      const myVote = allVotes.find(vote => vote.voterEmail === currentUser.email);
      setUserVote(myVote ? myVote.voteType : null);
    });

    return unsubscribe;
  }, [itemId, itemType, currentUser]);

  const handleVote = async (voteType) => {
    if (!currentUser || loading) return;

    setLoading(true);
    try {
      // Check if user already voted
      const existingVoteQuery = query(
        collection(db, 'votes'),
        where('itemId', '==', itemId),
        where('itemType', '==', itemType),
        where('voterEmail', '==', currentUser.email)
      );

      const existingVoteSnapshot = await getDocs(existingVoteQuery);

      // Remove existing vote if any
      if (!existingVoteSnapshot.empty) {
        const existingVoteDoc = existingVoteSnapshot.docs[0];
        await deleteDoc(doc(db, 'votes', existingVoteDoc.id));
        
        // If clicking the same vote type, just remove it (toggle off)
        if (existingVoteDoc.data().voteType === voteType) {
          setLoading(false);
          return;
        }
      }

      // Add new vote
      await addDoc(collection(db, 'votes'), {
        itemId,
        itemType,
        voteType, // 'up' or 'down'
        voterEmail: currentUser.email,
        voterHandle: userHandle,
        timestamp: Date.now(),
        createdAt: new Date()
      });

    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVoteButtonStyle = (type) => {
    const isActive = userVote === type;
    const baseStyle = compact ? styles.compactVoteButton : styles.voteButton;
    
    return {
      ...baseStyle,
      backgroundColor: isActive 
        ? (type === 'up' ? '#34C759' : '#FF3B30')
        : '#F8F9FA',
      color: isActive ? '#FFFFFF' : '#666666',
      transform: loading ? 'scale(0.95)' : 'scale(1)',
      border: isActive ? 'none' : '2px solid #E5E5EA',
      boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
      cursor: loading ? 'not-allowed' : 'pointer',
      opacity: loading ? 0.7 : 1,
    };
  };

  const getTotalScore = () => {
    return votes.up - votes.down;
  };

  if (compact) {
    return (
      <div style={styles.compactContainer}>
        <button
          onClick={() => handleVote('up')}
          disabled={loading}
          style={getVoteButtonStyle('up')}
          title={`${votes.up} people found this helpful`}
        >
          <span style={styles.voteEmoji}>👍</span>
        </button>
        
        <span style={styles.voteCount}>{votes.up}</span>
        
        <div style={styles.voteSeparator}></div>
        
        <span style={styles.voteCount}>{votes.down}</span>
        
        <button
          onClick={() => handleVote('down')}
          disabled={loading}
          style={getVoteButtonStyle('down')}
          title={`${votes.down} people didn't find this helpful`}
        >
          <span style={styles.voteEmoji}>👎</span>
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.votingButtons}>
        <button
          onClick={() => handleVote('up')}
          disabled={loading}
          style={getVoteButtonStyle('up')}
        >
          <span style={styles.voteIcon}>👍</span>
          <span style={styles.voteText}>Helpful</span>
        </button>
        
        <div style={styles.voteCountsContainer}>
          <span style={styles.fullVoteCount}>{votes.up}</span>
          <div style={styles.fullVoteSeparator}></div>
          <span style={styles.fullVoteCount}>{votes.down}</span>
        </div>
        
        <button
          onClick={() => handleVote('down')}
          disabled={loading}
          style={getVoteButtonStyle('down')}
        >
          <span style={styles.voteIcon}>👎</span>
          <span style={styles.voteText}>Not helpful</span>
        </button>
      </div>

      {(votes.up > 0 || votes.down > 0) && (
        <div style={styles.scoreDisplay}>
          <span style={styles.scoreLabel}>Net Score:</span>
          <span 
            style={{
              ...styles.scoreValue,
              color: getTotalScore() >= 0 ? '#34C759' : '#FF3B30'
            }}
          >
            {getTotalScore() > 0 ? `+${getTotalScore()}` : getTotalScore()}
          </span>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'flex-start',
  },
  
  votingButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  voteButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    background: '#F8F9FA',
    minWidth: '100px',
    justifyContent: 'center',
  },
  
  voteIcon: {
    fontSize: '16px',
  },
  
  voteText: {
    fontSize: '13px',
  },
  
  voteCountsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0 8px',
  },
  
  fullVoteCount: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#262626',
    minWidth: '20px',
    textAlign: 'center',
  },
  
  fullVoteSeparator: {
    width: '2px',
    height: '16px',
    backgroundColor: '#E5E5EA',
  },
  
  scoreDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#8E8E93',
  },
  
  scoreLabel: {
    fontWeight: '500',
  },
  
  scoreValue: {
    fontWeight: '600',
    fontSize: '13px',
  },
  
  // Compact version styles
  compactContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  
  compactVoteButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    background: '#F8F9FA',
    width: '32px',
    height: '32px',
  },
  
  voteEmoji: {
    fontSize: '16px',
  },
  
  voteCount: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#262626',
    minWidth: '20px',
    textAlign: 'center',
  },
  
  voteSeparator: {
    width: '2px',
    height: '16px',
    backgroundColor: '#E5E5EA',
  },
};
