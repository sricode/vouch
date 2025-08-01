// src/components/InviteFriends.js
import { useState } from 'react';
import { auth } from '../firebase';


// Update src/components/InviteFriends.js
const appUrl = 'https://vouch-81f77.web.app';

export default function InviteFriends() {
  const [customMessage, setCustomMessage] = useState('');
  const currentUser = auth.currentUser;
  const userHandle = currentUser?.email.split('@')[0];

  // Your app URL (you'll replace this with your actual deployed URL)
  const appUrl = window.location.origin;
  
  const defaultMessage = `Hey! I'm using Vouch - a cool app where friends share recommendations instead of relying on random reviews. 

Want to join me? I'd love to see what you recommend!

Sign up here: ${appUrl}

My username is @${userHandle} - you can add me as a friend once you join! 🚀`;

  const finalMessage = customMessage.trim() || defaultMessage;

  const shareViaWhatsApp = () => {
    const encodedMessage = encodeURIComponent(finalMessage);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaWhatsAppContact = (phoneNumber) => {
    const encodedMessage = encodeURIComponent(finalMessage);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(finalMessage);
      alert('✅ Message copied to clipboard!');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = finalMessage;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('✅ Message copied to clipboard!');
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Join me on Vouch - Friend Recommendations App');
    const body = encodeURIComponent(finalMessage);
    const emailUrl = `mailto:?subject=${subject}&body=${body}`;
    window.open(emailUrl);
  };

  const shareViaSMS = () => {
    const encodedMessage = encodeURIComponent(finalMessage);
    const smsUrl = `sms:?body=${encodedMessage}`;
    window.open(smsUrl);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📤 Invite Friends to Vouch</h2>
        <p style={styles.subtitle}>
          The more friends you have, the better your recommendations get!
        </p>
      </div>

      {/* Preview Message */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📝 Your Invitation Message</h3>
        <div style={styles.messagePreview}>
          <div style={styles.messageContent}>
            {finalMessage.split('\n').map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        </div>
        
        <div style={styles.customizeSection}>
          <label style={styles.label}>
            ✏️ Customize your message (optional):
          </label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Write your own personal invitation message..."
            style={styles.customTextarea}
            rows={4}
            maxLength={500}
          />
          <div style={styles.charCount}>
            {customMessage.length}/500 characters
          </div>
          {customMessage && (
            <button 
              onClick={() => setCustomMessage('')}
              style={styles.resetButton}
            >
              🔄 Use Default Message
            </button>
          )}
        </div>
      </div>

      {/* Sharing Options */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🚀 Share With Friends</h3>
        
        <div style={styles.shareButtons}>
          <button 
            onClick={shareViaWhatsApp}
            style={{...styles.shareButton, backgroundColor: '#25d366'}}
          >
            📱 Share on WhatsApp
          </button>
          
          <button 
            onClick={copyToClipboard}
            style={{...styles.shareButton, backgroundColor: '#6c757d'}}
          >
            📋 Copy Message
          </button>
          
          <button 
            onClick={shareViaEmail}
            style={{...styles.shareButton, backgroundColor: '#007bff'}}
          >
            ✉️ Send via Email
          </button>
          
          <button 
            onClick={shareViaSMS}
            style={{...styles.shareButton, backgroundColor: '#17a2b8'}}
          >
            💬 Send via SMS
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📊 Your Profile</h3>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>@{userHandle}</div>
            <div style={styles.statLabel}>Your Username</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{appUrl}</div>
            <div style={styles.statLabel}>App Link</div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={styles.instructions}>
        <h4>💡 How to get friends to join:</h4>
        <ol>
          <li><strong>Share the link</strong> - Use any of the sharing options above</li>
          <li><strong>Tell them your username</strong> - @{userHandle} so they can find you</li>
          <li><strong>Ask them to add you</strong> - Once they sign up, they can search for you in the Friends tab</li>
          <li><strong>Start sharing recommendations</strong> - The more friends, the better the experience!</li>
        </ol>
        
        <div style={styles.tip}>
          <strong>💡 Pro Tip:</strong> Start with 2-3 close friends who you regularly ask for recommendations from. 
          Once they see how useful it is, they'll naturally invite more people!
        </div>
      </div>

      {/* Incentive Ideas */}
      <div style={styles.incentiveSection}>
        <h4>🎯 Make it irresistible:</h4>
        <div style={styles.incentiveGrid}>
          <div style={styles.incentiveCard}>
            <div style={styles.incentiveIcon}>🍕</div>
            <div style={styles.incentiveText}>
              "I found this amazing pizza place - want to see my other recommendations?"
            </div>
          </div>
          <div style={styles.incentiveCard}>
            <div style={styles.incentiveIcon}>🎬</div>
            <div style={styles.incentiveText}>
              "Instead of asking me for movie recommendations, just check my Vouch profile!"
            </div>
          </div>
          <div style={styles.incentiveCard}>
            <div style={styles.incentiveIcon}>🛍️</div>
            <div style={styles.incentiveText}>
              "This app has all my favorite products - you'll love the stuff I recommend!"
            </div>
          </div>
        </div>
      </div>
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
  section: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  sectionTitle: {
    color: '#333',
    fontSize: '16px',
    marginBottom: '15px',
    margin: '0 0 15px 0'
  },
  messagePreview: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '6px',
    padding: '15px',
    marginBottom: '15px',
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#333'
  },
  messageContent: {
    whiteSpace: 'pre-line'
  },
  customizeSection: {
    paddingTop: '15px',
    borderTop: '1px solid #e9ecef'
  },
  label: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: '14px',
    display: 'block',
    marginBottom: '8px'
  },
  customTextarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  charCount: {
    fontSize: '12px',
    color: '#666',
    textAlign: 'right',
    marginTop: '5px'
  },
  resetButton: {
    padding: '6px 12px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    marginTop: '10px'
  },
  shareButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px'
  },
  shareButton: {
    padding: '12px 16px',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'opacity 0.2s'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px'
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '6px',
    textAlign: 'center'
  },
  statNumber: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: '5px',
    wordBreak: 'break-all'
  },
  statLabel: {
    fontSize: '12px',
    color: '#666'
  },
  instructions: {
    backgroundColor: '#e7f3ff',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    lineHeight: '1.5'
  },
  tip: {
    backgroundColor: '#fff3cd',
    padding: '12px',
    borderRadius: '4px',
    marginTop: '15px',
    fontSize: '13px',
    border: '1px solid #ffeaa7'
  },
  incentiveSection: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    fontSize: '14px'
  },
  incentiveGrid: {
    display: 'grid',
    gap: '12px',
    marginTop: '15px'
  },
  incentiveCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'white',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #e9ecef'
  },
  incentiveIcon: {
    fontSize: '20px'
  },
  incentiveText: {
    fontStyle: 'italic',
    color: '#555',
    fontSize: '13px'
  }
};
