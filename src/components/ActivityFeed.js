// src/components/ActivityFeed.js - Unified inbox for all recommendation activity
import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import CommentsSystem from './CommentsSystem';
import RespondToRequest from './RespondToRequest';

export default function ActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedCommentContext, setSelectedCommentContext] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [success, setSuccess] = useState('');

  const currentUser = auth.currentUser;
  const userHandle = currentUser?.email.split('@')[0];

  useEffect(() => {
    if (!currentUser) return;

    console.log('Loading unified activity feed for:', userHandle);

    // Listen for all recommendation requests
    const requestsQuery = query(
      collection(db, 'recommendation_requests'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeRequests = onSnapshot(requestsQuery, async (requestsSnapshot) => {
      const allRequests = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get all comments
      const commentsSnapshot = await getDocs(query(
        collection(db, 'recommendation_comments'),
        orderBy('timestamp', 'desc')
      ));
      const allComments = commentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get friends list to filter relevant activities
      const friendsSnapshot = await getDocs(query(
        collection(db, 'friendships'),
        where('status', '==', 'accepted')
      ));
      
      const friendEmails = [currentUser.email];
      friendsSnapshot.docs.forEach(doc => {
        const friendship = doc.data();
        if (friendship.user1 === currentUser.email) {
          friendEmails.push(friendship.user2);
        } else if (friendship.user2 === currentUser.email) {
          friendEmails.push(friendship.user1);
        }
      });

      // Build unified activity feed
      const userActivities = [];

      for (const request of allRequests) {
        // Only include requests involving current user or friends
        const isMyRequest = request.requesterEmail === currentUser.email;
        const isFriendRequest = friendEmails.includes(request.requesterEmail);
        const hasMyResponse = request.responses?.some(r => r.responderEmail === currentUser.email);

        if (!isMyRequest && !isFriendRequest && !hasMyResponse) continue;

        // Get comments for this request
        const requestComments = allComments.filter(c => c.requestId === request.id);

        // Determine activity type and latest timestamp
        let activityType = 'unknown';
        let latestTimestamp = request.timestamp;
        let unreadCount = 0;

        if (isMyRequest) {
          // My requests - show responses and comments
          if (!request.responses || request.responses.length === 0) {
            activityType = 'my_open_request';
          } else {
            activityType = 'my_request_with_responses';
            // Count unread comments (comments not from me)
            unreadCount = requestComments.filter(c => c.authorEmail !== currentUser.email).length;
          }
          
          if (request.responses?.length > 0) {
            latestTimestamp = Math.max(latestTimestamp, ...request.responses.map(r => r.timestamp));
          }
          if (requestComments.length > 0) {
            latestTimestamp = Math.max(latestTimestamp, ...requestComments.map(c => c.timestamp));
          }

        } else if (hasMyResponse) {
          // I responded to this - show follow-up questions
          activityType = 'my_response_with_followups';
          unreadCount = requestComments.filter(c => c.authorEmail !== currentUser.email).length;
          
          if (request.responses?.length > 0) {
            latestTimestamp = Math.max(latestTimestamp, ...request.responses.map(r => r.timestamp));
          }
          if (requestComments.length > 0) {
            latestTimestamp = Math.max(latestTimestamp, ...requestComments.map(c => c.timestamp));
          }

        } else if (isFriendRequest && request.status === 'open') {
          // Friend's open request - needs my response
          activityType = 'friend_needs_help';
        }

        if (activityType !== 'unknown') {
          userActivities.push({
            type: activityType,
            request,
            comments: requestComments,
            timestamp: latestTimestamp,
            unreadCount,
            id: `activity_${request.id}`
          });
        }
      }

      // Sort by timestamp (newest first)
      userActivities.sort((a, b) => b.timestamp - a.timestamp);

      console.log('Unified activities found:', userActivities.length);
      setActivities(userActivities);
      setLoading(false);
    });

    return unsubscribeRequests;
  }, [currentUser, userHandle]);

  const handleOpenComments = (requestId, responseIndex) => {
    setSelectedCommentContext({ requestId, responseIndex });
    setShowCommentsModal(true);
  };

  const handleCloseComments = () => {
    setShowCommentsModal(false);
    setSelectedCommentContext(null);
  };

  const handleOpenResponse = (request) => {
    setSelectedRequest(request);
    setShowResponseModal(true);
  };

  const handleCloseResponse = () => {
    setShowResponseModal(false);
    setSelectedRequest(null);
  };

  const getCategoryEmoji = (category) => {
    switch (category) {
      case 'products': return '🛍️';
      case 'services': return '🔧';
      case 'movies': return '🎬';
      default: return '❓';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderActivity = (activity) => {
    const { type, request, comments, unreadCount } = activity;

    switch (type) {
      case 'friend_needs_help':
        return (
          <div key={activity.id} style={styles.activityCard}>
            <div style={styles.activityHeader}>
              <div style={styles.activityInfo}>
                <div style={styles.helpAvatar}>
                  {request.requesterHandle.charAt(0).toUpperCase()}
                </div>
                <div style={styles.activityDetails}>
                  <div style={styles.activityText}>
                    <strong>@{request.requesterHandle}</strong> needs help
                  </div>
                  <div style={styles.activityMeta}>
                    <span>{getCategoryEmoji(request.category)} {request.category}</span>
                    <span>•</span>
                    <span>{formatDate(activity.timestamp)}</span>
                  </div>
                </div>
              </div>
              <div style={styles.helpBadge}>Help</div>
            </div>

            <div style={styles.activityContent}>
              <h4 style={styles.requestQuestion}>{request.question}</h4>
              {request.description && (
                <p style={styles.requestDescription}>"{request.description}"</p>
              )}
            </div>

            <div style={styles.activityActions}>
              <button 
                style={styles.helpButton}
                onClick={() => handleOpenResponse(request)}
              >
                💡 Help with recommendation
              </button>
            </div>
          </div>
        );

      case 'my_open_request':
        return (
          <div key={activity.id} style={styles.activityCard}>
            <div style={styles.activityHeader}>
              <div style={styles.activityInfo}>
                <div style={styles.waitingAvatar}>
                  {userHandle.charAt(0).toUpperCase()}
                </div>
                <div style={styles.activityDetails}>
                  <div style={styles.activityText}>
                    Your request • <strong>Waiting for responses</strong>
                  </div>
                  <div style={styles.activityMeta}>
                    <span>{getCategoryEmoji(request.category)} {request.category}</span>
                    <span>•</span>
                    <span>{formatDate(activity.timestamp)}</span>
                  </div>
                </div>
              </div>
              <div style={styles.waitingBadge}>Waiting</div>
            </div>

            <div style={styles.activityContent}>
              <h4 style={styles.requestQuestion}>{request.question}</h4>
              {request.description && (
                <p style={styles.requestDescription}>"{request.description}"</p>
              )}
            </div>
          </div>
        );

      case 'my_request_with_responses':
      case 'my_response_with_followups':
        const isMyRequest = type === 'my_request_with_responses';
        const latestComment = comments.length > 0 ? comments[comments.length - 1] : null;
        
        return (
          <div key={activity.id} style={styles.activityCard}>
            <div style={styles.activityHeader}>
              <div style={styles.activityInfo}>
                <div style={isMyRequest ? styles.conversationAvatar : styles.responseAvatar}>
                  {isMyRequest ? userHandle.charAt(0).toUpperCase() : request.requesterHandle.charAt(0).toUpperCase()}
                </div>
                <div style={styles.activityDetails}>
                  <div style={styles.activityText}>
                    {isMyRequest ? (
                      <>Your request • <strong>{request.responses?.length || 0} responses</strong></>
                    ) : (
                      <>Your recommendation for <strong>@{request.requesterHandle}</strong></>
                    )}
                    {unreadCount > 0 && (
                      <span style={styles.unreadBadge}>{unreadCount} new</span>
                    )}
                  </div>
                  <div style={styles.activityMeta}>
                    <span>{getCategoryEmoji(request.category)} {request.category}</span>
                    <span>•</span>
                    <span>{formatDate(activity.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.activityContent}>
              <h4 style={styles.requestQuestion}>{request.question}</h4>
              
              {/* Show latest activity */}
              {latestComment && (
                <div style={styles.latestActivity}>
                  <div style={styles.commentPreview}>
                    <strong>@{latestComment.authorHandle}:</strong> {latestComment.comment}
                  </div>
                </div>
              )}

              {/* Show responses summary */}
              {request.responses && request.responses.length > 0 && (
                <div style={styles.responsesSummary}>
                  <div style={styles.responsesCount}>
                    {request.responses.length} recommendation{request.responses.length !== 1 ? 's' : ''}
                  </div>
                  <div style={styles.responsesList}>
                    {request.responses.map((response, index) => (
                      <div key={index} style={styles.responseSummary}>
                        <span style={styles.responseAuthor}>@{response.responderHandle}</span>
                        <span style={styles.responseTitle}>{response.recommendation}</span>
                        <span style={styles.responseRating}>
                          {'⭐'.repeat(response.rating)}
                        </span>
                        <button 
                          style={styles.viewChatButton}
                          onClick={() => handleOpenComments(request.id, index)}
                        >
                          💬 {comments.filter(c => c.responseIndex === index).length > 0 ? 'View chat' : 'Ask follow-up'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.loadingSpinner}></div>
          <p style={styles.loadingText}>Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🔔 Activity</h2>
        <p style={styles.subtitle}>
          All your recommendation activity
        </p>
      </div>

      {success && (
        <div style={styles.success}>
          {success}
        </div>
      )}

      {activities.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📭</div>
          <h3 style={styles.emptyTitle}>No activity yet</h3>
          <p style={styles.emptyText}>
            Friend requests, recommendations, and conversations will appear here.
          </p>
        </div>
      ) : (
        <div style={styles.feed}>
          {activities.map(renderActivity)}
        </div>
      )}

      {/* Response Modal */}
      {showResponseModal && selectedRequest && (
        <RespondToRequest 
          request={selectedRequest}
          onClose={handleCloseResponse}
          onSuccess={() => {
            setSuccess('✅ Your recommendation has been sent!');
            setTimeout(() => setSuccess(''), 3000);
            handleCloseResponse();
          }}
        />
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
  
  success: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '12px 20px',
    marginBottom: '1px',
    textAlign: 'center',
    border: '1px solid #c3e6cb'
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
  
  activityCard: {
    backgroundColor: '#FFFFFF',
    padding: '20px',
    transition: 'all 0.2s ease',
  },
  
  activityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  
  activityInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  
  // Different avatar styles for different activity types
  helpAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#FF6B35',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
    flexShrink: 0,
  },
  
  waitingAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#FFC107',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
    flexShrink: 0,
  },
  
  conversationAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#28A745',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
    flexShrink: 0,
  },
  
  responseAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#007AFF',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
    flexShrink: 0,
  },
  
  activityDetails: {
    flex: 1,
  },
  
  activityText: {
    fontSize: '16px',
    color: '#262626',
    marginBottom: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  
  activityMeta: {
    fontSize: '13px',
    color: '#8E8E93',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  
  unreadBadge: {
    backgroundColor: '#FF3B30',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
  },
  
  helpBadge: {
    backgroundColor: '#FF6B35',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  
  waitingBadge: {
    backgroundColor: '#FFC107',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  
  activityContent: {
    marginBottom: '16px',
  },
  
  requestQuestion: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#262626',
    margin: '0 0 8px 0',
    lineHeight: '1.3',
  },
  
  requestDescription: {
    fontSize: '14px',
    color: '#8E8E93',
    margin: '0 0 12px 0',
    fontStyle: 'italic',
  },
  
  latestActivity: {
    backgroundColor: '#F0F8FF',
    borderRadius: '8px',
    padding: '8px 12px',
    marginBottom: '12px',
    border: '1px solid #E3F2FD',
  },
  
  commentPreview: {
    fontSize: '14px',
    color: '#262626',
  },
  
  responsesSummary: {
    marginTop: '12px',
  },
  
  responsesCount: {
    fontSize: '13px',
    color: '#8E8E93',
    marginBottom: '8px',
    fontWeight: '500',
  },
  
  responsesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  
  responseSummary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#F8F9FA',
    borderRadius: '8px',
    gap: '8px',
  },
  
  responseAuthor: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#007AFF',
    flexShrink: 0,
  },
  
  responseTitle: {
    fontSize: '13px',
    color: '#262626',
    flex: 1,
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  
  responseRating: {
    fontSize: '11px',
    flexShrink: 0,
  },
  
  viewChatButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: '500',
    cursor: 'pointer',
    flexShrink: 0,
  },
  
  activityActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  
  helpButton: {
    backgroundColor: '#28A745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
