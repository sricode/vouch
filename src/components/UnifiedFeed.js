// src/components/UnifiedFeed.js - Complete version with comment counts
import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import CommentsSystem from './CommentsSystem';
import RespondToRequest from './RespondToRequest';
import RecommendationComments from './RecommendationComments';
import VotingButtons from './VotingButtons';

export default function UnifiedFeed() {
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showRecommendationCommentsModal, setShowRecommendationCommentsModal] = useState(false);
  const [selectedCommentContext, setSelectedCommentContext] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState(null);
  const [success, setSuccess] = useState('');
  const [recommendationComments, setRecommendationComments] = useState({});

  const currentUser = auth.currentUser;
  const userHandle = currentUser?.email.split('@')[0];

  useEffect(() => {
    if (!currentUser) return;

    console.log('Loading unified feed for:', userHandle);

    const loadUnifiedFeed = async () => {
      try {
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

        // Listen for recommendation comments in real-time
        const recCommentsQuery = query(
          collection(db, 'recommendation_vouch_comments'),
          orderBy('timestamp', 'desc')
        );

        const unsubscribeRecComments = onSnapshot(recCommentsQuery, (snapshot) => {
          const allRecComments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          const commentsMap = {};
          allRecComments.forEach(comment => {
            if (!commentsMap[comment.recommendationId]) {
              commentsMap[comment.recommendationId] = [];
            }
            commentsMap[comment.recommendationId].push(comment);
          });
          
          setRecommendationComments(commentsMap);
        });

        const recommendationsQuery = query(
          collection(db, 'recommendations'),
          orderBy('timestamp', 'desc')
        );

        const unsubscribeRecs = onSnapshot(recommendationsQuery, async (recsSnapshot) => {
          const allRecommendations = recsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })).filter(rec => friendEmails.includes(rec.userEmail));

          const requestsQuery = query(
            collection(db, 'recommendation_requests'),
            orderBy('timestamp', 'desc')
          );

          const unsubscribeRequests = onSnapshot(requestsQuery, async (requestsSnapshot) => {
            const allRequests = requestsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            const commentsSnapshot = await getDocs(query(
              collection(db, 'recommendation_comments'),
              orderBy('timestamp', 'desc')
            ));
            const allComments = commentsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            const unifiedItems = [];

            allRecommendations.forEach(rec => {
              const context = findRecommendationContext(rec, allRequests);
              
              unifiedItems.push({
                type: 'recommendation',
                id: `rec_${rec.id}`,
                data: rec,
                context,
                timestamp: rec.timestamp,
                category: rec.category,
                userEmail: rec.userEmail
              });
            });

            for (const request of allRequests) {
              const isMyRequest = request.requesterEmail === currentUser.email;
              const isFriendRequest = friendEmails.includes(request.requesterEmail);
              const hasMyResponse = request.responses?.some(r => r.responderEmail === currentUser.email);

              if (!isMyRequest && !isFriendRequest && !hasMyResponse) continue;

              const requestComments = allComments.filter(c => c.requestId === request.id);
              let activityType = 'unknown';
              let latestTimestamp = request.timestamp;
              let unreadCount = 0;

              if (isMyRequest) {
                if (!request.responses || request.responses.length === 0) {
                  activityType = 'my_open_request';
                } else {
                  activityType = 'my_request_with_responses';
                  unreadCount = requestComments.filter(c => c.authorEmail !== currentUser.email).length;
                }
                
                if (request.responses?.length > 0) {
                  latestTimestamp = Math.max(latestTimestamp, ...request.responses.map(r => r.timestamp));
                }
                if (requestComments.length > 0) {
                  latestTimestamp = Math.max(latestTimestamp, ...requestComments.map(c => c.timestamp));
                }

              } else if (hasMyResponse) {
                activityType = 'my_response_with_followups';
                unreadCount = requestComments.filter(c => c.authorEmail !== currentUser.email).length;
                
                if (request.responses?.length > 0) {
                  latestTimestamp = Math.max(latestTimestamp, ...request.responses.map(r => r.timestamp));
                }
                if (requestComments.length > 0) {
                  latestTimestamp = Math.max(latestTimestamp, ...requestComments.map(c => c.timestamp));
                }

              } else if (isFriendRequest && request.status === 'open') {
                activityType = 'friend_needs_help';
              }

              if (activityType !== 'unknown') {
                unifiedItems.push({
                  type: 'activity',
                  subtype: activityType,
                  id: `activity_${request.id}`,
                  data: request,
                  comments: requestComments,
                  timestamp: latestTimestamp,
                  unreadCount,
                  category: request.category
                });
              }
            }

            unifiedItems.sort((a, b) => b.timestamp - a.timestamp);
            console.log('Unified feed items:', unifiedItems.length);
            setFeedItems(unifiedItems);
            setLoading(false);
          });

          return () => {
            unsubscribeRequests();
            unsubscribeRecComments();
          };
        });

        return unsubscribeRecs;
      } catch (error) {
        console.error('Error loading unified feed:', error);
        setLoading(false);
      }
    };

    const unsubscribe = loadUnifiedFeed();
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [currentUser, userHandle]);

  // Helper function to get comment button info
  const getCommentButtonInfo = (recommendationId) => {
    const comments = recommendationComments[recommendationId] || [];
    const commentCount = comments.length;
    
    if (commentCount === 0) {
      return {
        text: 'Comment',
        style: styles.commentButton
      };
    } else if (commentCount === 1) {
      return {
        text: 'View 1 comment',
        style: styles.commentButtonWithComments
      };
    } else {
      return {
        text: `View ${commentCount} comments`,
        style: styles.commentButtonWithComments
      };
    }
  };

  const findRecommendationContext = (recommendation, requests) => {
    for (const request of requests) {
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

  const getFilteredItems = () => {
    if (filter === 'all') return feedItems;
    if (filter === 'recommendations') return feedItems.filter(item => item.type === 'recommendation');
    if (filter === 'activity') return feedItems.filter(item => item.type === 'activity');
    return feedItems.filter(item => item.category === filter);
  };

  const handleOpenComments = (requestId, responseIndex) => {
    setSelectedCommentContext({ requestId, responseIndex });
    setShowCommentsModal(true);
  };

  const handleCloseComments = () => {
    setShowCommentsModal(false);
    setSelectedCommentContext(null);
  };

  const handleOpenRecommendationComments = (recommendationId) => {
    setSelectedRecommendationId(recommendationId);
    setShowRecommendationCommentsModal(true);
  };

  const handleCloseRecommendationComments = () => {
    setShowRecommendationCommentsModal(false);
    setSelectedRecommendationId(null);
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

  const renderRecommendationItem = (item) => {
    const rec = item.data;
    const context = item.context;
    const isMyRecommendation = rec.userEmail === currentUser?.email;
    const commentButtonInfo = getCommentButtonInfo(rec.id);

    return (
      <div key={item.id} style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.userInfo}>
            <div style={styles.recAvatar}>
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
        
        <div style={styles.cardContent}>
          <h3 style={styles.recTitle}>{rec.title}</h3>
          
          <div style={styles.rating}>
            <span style={styles.stars}>{'⭐'.repeat(rec.rating)}</span>
            <span style={styles.ratingText}>({rec.rating}/5)</span>
          </div>
          
          {rec.notes && (
            <p style={styles.notes}>{rec.notes}</p>
          )}
        </div>
        
        <div style={styles.cardFooter}>
          <div style={styles.vouchBadge}>
            <span style={styles.vouchIcon}>✨</span>
            <span style={styles.vouchText}>Vouched by @{rec.userHandle}</span>
          </div>
          
          <div style={styles.interactionButtons}>
            <VotingButtons 
              itemId={rec.id} 
              itemType="recommendation" 
              compact={true}
            />
            
            <button 
              style={commentButtonInfo.style}
              onClick={() => handleOpenRecommendationComments(rec.id)}
            >
              💬 {commentButtonInfo.text}
            </button>
            
            {context && isMyRecommendation && (
              <button 
                style={styles.replyButton}
                onClick={() => handleOpenComments(context.requestId, context.responseIndex)}
              >
                🗨️ Response chat
              </button>
            )}
          </div>
        </div>
        
        {context && !isMyRecommendation && (
          <div style={styles.responseContextFooter}>
            <span style={styles.responseContext}>
              Response to @{context.requesterHandle}'s request
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderActivityItem = (item) => {
    const { subtype, data: request, comments, unreadCount } = item;

    return (
      <div key={item.id} style={styles.activityCard}>
        <div style={styles.activityHeader}>
          <div style={styles.activityInfo}>
            <div style={getActivityAvatarStyle(subtype)}>
              {getActivityAvatarText(subtype, request)}
            </div>
            <div style={styles.activityDetails}>
              <div style={styles.activityText}>
                {getActivityText(subtype, request, unreadCount)}
              </div>
              <div style={styles.activityMeta}>
                <span>{getCategoryEmoji(request.category)} {request.category}</span>
                <span>•</span>
                <span>{formatDate(item.timestamp)}</span>
              </div>
            </div>
          </div>
          {getActivityBadge(subtype)}
        </div>

        <div style={styles.activityContent}>
          <h4 style={styles.requestQuestion}>{request.question}</h4>
          {request.description && (
            <p style={styles.requestDescription}>"{request.description}"</p>
          )}
          
          {renderLatestActivity(subtype, request, comments)}
          {renderResponsesSummary(subtype, request, comments)}
        </div>

        <div style={styles.activityFooter}>
          <div style={styles.activityVoting}>
            <VotingButtons 
              itemId={request.id} 
              itemType="request" 
              compact={true}
            />
          </div>
          
          {renderActivityActions(subtype, request)}
        </div>
      </div>
    );
  };

  const getActivityAvatarStyle = (subtype) => {
    switch (subtype) {
      case 'friend_needs_help': return styles.helpAvatar;
      case 'my_open_request': return styles.waitingAvatar;
      case 'my_request_with_responses': return styles.conversationAvatar;
      case 'my_response_with_followups': return styles.responseAvatar;
      default: return styles.helpAvatar;
    }
  };

  const getActivityAvatarText = (subtype, request) => {
    switch (subtype) {
      case 'friend_needs_help': return request.requesterHandle.charAt(0).toUpperCase();
      case 'my_open_request': return userHandle.charAt(0).toUpperCase();
      case 'my_request_with_responses': return userHandle.charAt(0).toUpperCase();
      case 'my_response_with_followups': return request.requesterHandle.charAt(0).toUpperCase();
      default: return '?';
    }
  };

  const getActivityText = (subtype, request, unreadCount) => {
    switch (subtype) {
      case 'friend_needs_help':
        return <><strong>@{request.requesterHandle}</strong> needs help</>;
      case 'my_open_request':
        return <>Your request • <strong>Waiting for responses</strong></>;
      case 'my_request_with_responses':
        return (
          <>Your request • <strong>{request.responses?.length || 0} responses</strong>
          {unreadCount > 0 && <span style={styles.unreadBadge}>{unreadCount} new</span>}</>
        );
      case 'my_response_with_followups':
        return (
          <>Your recommendation for <strong>@{request.requesterHandle}</strong>
          {unreadCount > 0 && <span style={styles.unreadBadge}>{unreadCount} new</span>}</>
        );
      default:
        return 'Unknown activity';
    }
  };

  const getActivityBadge = (subtype) => {
    switch (subtype) {
      case 'friend_needs_help':
        return <div style={styles.helpBadge}>Help</div>;
      case 'my_open_request':
        return <div style={styles.waitingBadge}>Waiting</div>;
      case 'my_request_with_responses':
      case 'my_response_with_followups':
        return null;
      default:
        return null;
    }
  };

  const renderLatestActivity = (subtype, request, comments) => {
    const latestComment = comments.length > 0 ? comments[comments.length - 1] : null;
    
    if (latestComment && (subtype === 'my_request_with_responses' || subtype === 'my_response_with_followups')) {
      return (
        <div style={styles.latestActivity}>
          <div style={styles.commentPreview}>
            <strong>@{latestComment.authorHandle}:</strong> {latestComment.comment}
          </div>
        </div>
      );
    }
    return null;
  };

// Updated renderResponsesSummary function for UnifiedFeed.js
// Replace the existing renderResponsesSummary function with this:

  const renderResponsesSummary = (subtype, request, comments) => {
    if (request.responses && request.responses.length > 0 && 
      (subtype === 'my_request_with_responses' || subtype === 'my_response_with_followups')) {
      return (
        <div style={styles.responsesSummary}>
          <div style={styles.responsesCount}>
            {request.responses.length} recommendation{request.responses.length !== 1 ? 's' : ''}
          </div>
          <div style={styles.responsesList}>
            {request.responses.map((response, index) => {
              // Count comments for this specific response thread
              const responseComments = comments.filter(c => c.responseIndex === index);
              const commentCount = responseComments.length;
            
              // Determine button text and style based on comment count
              let buttonText, buttonStyle;
              if (commentCount === 0) {
                buttonText = 'Ask follow-up';
                buttonStyle = styles.viewChatButton;
              } else if (commentCount === 1) {
                buttonText = 'View 1 comment';
                buttonStyle = styles.viewChatButtonWithComments;
              } else {
                buttonText = `View ${commentCount} comments`;
                buttonStyle = styles.viewChatButtonWithComments;
              }
            
              return (
                <div key={index} style={styles.responseSummary}>
                  <span style={styles.responseAuthor}>@{response.responderHandle}</span>
                  <span style={styles.responseTitle}>{response.recommendation}</span>
                  <span style={styles.responseRating}>
                    {'⭐'.repeat(response.rating)}
                  </span>
                  <button 
                    style={buttonStyle}
                    onClick={() => handleOpenComments(request.id, index)}
                  >
                    💬 {buttonText}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderActivityActions = (subtype, request) => {
    if (subtype === 'friend_needs_help') {
      return (
        <div style={styles.activityActions}>
          <button 
            style={styles.helpButton}
            onClick={() => handleOpenResponse(request)}
          >
            💡 Help with recommendation
          </button>
        </div>
      );
    }
    return null;
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'products': return '#FF6B6B';
      case 'services': return '#4ECDC4';
      case 'movies': return '#45B7D1';
      default: return '#96CEB4';
    }
  };

  const filters = [
    { id: 'all', label: 'All', emoji: '🌟', description: 'Everything' },
    { id: 'recommendations', label: 'Recommendations', emoji: '✨', description: 'Friend vouches' },
    { id: 'activity', label: 'Activity', emoji: '📱', description: 'Conversations' },
    { id: 'products', label: 'Products', emoji: '🛍️', description: 'Product recs' },
    { id: 'services', label: 'Services', emoji: '🔧', description: 'Service recs' },
    { id: 'movies', label: 'Movies', emoji: '🎬', description: 'Entertainment' },
  ];

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.loadingSpinner}></div>
          <p style={styles.loadingText}>Loading your feed...</p>
        </div>
      </div>
    );
  }

  const filteredItems = getFilteredItems();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🏠 Home</h2>
        <p style={styles.subtitle}>
          Your recommendations and conversations
        </p>
      </div>

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
              title={filterItem.description}
            >
              <span style={styles.filterEmoji}>{filterItem.emoji}</span>
              <span style={styles.filterLabel}>{filterItem.label}</span>
            </button>
          ))}
        </div>
      </div>

      {success && (
        <div style={styles.success}>
          {success}
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>
            {filter === 'all' ? '🔭' : 
             filter === 'recommendations' ? '✨' : 
             filter === 'activity' ? '📱' : getCategoryEmoji(filter)}
          </div>
          <h3 style={styles.emptyTitle}>
            {filter === 'all' ? 'Your feed is empty' :
             filter === 'recommendations' ? 'No recommendations yet' :
             filter === 'activity' ? 'No activity yet' :
             `No ${filter} recommendations`}
          </h3>
          <p style={styles.emptyText}>
            {filter === 'all' ? 'Connect with friends and start sharing recommendations!' :
             filter === 'recommendations' ? 'Be the first to share a recommendation!' :
             filter === 'activity' ? 'Friend requests and conversations will appear here.' :
             `No ${filter} recommendations found. Try a different category!`}
          </p>
        </div>
      ) : (
        <div style={styles.feed}>
          {filteredItems.map(item => 
            item.type === 'recommendation' 
              ? renderRecommendationItem(item)
              : renderActivityItem(item)
          )}
        </div>
      )}

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

      {showCommentsModal && selectedCommentContext && (
        <CommentsSystem
          requestId={selectedCommentContext.requestId}
          responseIndex={selectedCommentContext.responseIndex}
          onClose={handleCloseComments}
        />
      )}

      {showRecommendationCommentsModal && selectedRecommendationId && (
        <RecommendationComments
          recommendationId={selectedRecommendationId}
          onClose={handleCloseRecommendationComments}
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
    flexWrap: 'wrap',
    paddingBottom: '4px',
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
  },
  
  filterEmoji: {
    fontSize: '16px',
  },
  
  filterLabel: {
    fontSize: '14px',
    fontWeight: '600',
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
  
  recAvatar: {
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
    gap: '12px',
  },
  
  vouchBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: 1,
  },
  
  vouchIcon: {
    fontSize: '14px',
  },
  
  vouchText: {
    fontSize: '13px',
    color: '#8E8E93',
    fontWeight: '500',
  },
  
  interactionButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  
  commentButton: {
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
  
  // NEW: Style for comment button when there are existing comments
  commentButtonWithComments: {
    padding: '6px 12px',
    backgroundColor: '#34C759',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(52, 199, 89, 0.3)',
  },
  
  replyButton: {
    padding: '6px 12px',
    backgroundColor: '#34C759',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  
  responseContextFooter: {
    paddingTop: '8px',
    borderTop: '1px solid #F2F2F7',
    marginTop: '8px',
  },
  
  responseContext: {
    fontSize: '11px',
    color: '#8E8E93',
    fontStyle: 'italic',
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

  viewChatButtonWithComments: {
    backgroundColor: '#34C759',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: '500',
    cursor: 'pointer',
    flexShrink: 0,
    boxShadow: '0 2px 4px rgba(52, 199, 89, 0.3)',
  },
  
  activityFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid #F2F2F7',
  },
  
  activityVoting: {
    display: 'flex',
    alignItems: 'center',
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
