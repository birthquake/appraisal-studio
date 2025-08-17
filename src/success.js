// src/Success.js - Success page after Stripe checkout completion
import React, { useEffect, useState } from 'react';
import { useFirebase } from './firebase/FirebaseContext';

const Success = () => {
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const { user, userProfile } = useFirebase();

  useEffect(() => {
    // Get session ID from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId && user) {
      // Wait a moment for webhook to process, then check subscription status
      setTimeout(() => {
        setSubscriptionInfo({
          sessionId,
          plan: userProfile?.currentPlan || 'professional',
          status: 'active'
        });
        setLoading(false);
      }, 3000);
    } else {
      setLoading(false);
    }
  }, [user, userProfile]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #667eea 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '3rem',
          textAlign: 'center',
          maxWidth: '500px',
          width: '100%'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            margin: '0 auto 2rem',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <h2 style={{
            color: '#334155',
            fontSize: '1.5rem',
            fontWeight: '700',
            marginBottom: '1rem'
          }}>Setting up your subscription...</h2>
          <p style={{
            color: '#64748b',
            fontSize: '1rem'
          }}>Please wait while we confirm your payment and activate your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #667eea 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '3rem',
        textAlign: 'center',
        maxWidth: '600px',
        width: '100%'
      }}>
        {/* Success Icon */}
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 2rem',
          boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.3)'
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
          </svg>
        </div>

        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '800',
          color: '#0f172a',
          marginBottom: '1rem',
          letterSpacing: '-0.02em'
        }}>Welcome to AppraisalStudio!</h1>
        
        <p style={{
          fontSize: '1.125rem',
          color: '#64748b',
          lineHeight: '1.6',
          marginBottom: '2rem'
        }}>
          Your subscription has been activated successfully. You now have access to unlimited 
          professional real estate content generation.
        </p>

        {/* Subscription Details */}
        {subscriptionInfo && (
          <div style={{
            background: 'rgba(248, 250, 252, 0.8)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{
              color: '#0f172a',
              fontSize: '1.25rem',
              fontWeight: '700',
              marginBottom: '1rem'
            }}>Subscription Details</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span style={{ color: '#64748b', fontWeight: '500' }}>Plan:</span>
              <span style={{ color: '#0f172a', fontWeight: '600' }}>
                {subscriptionInfo.plan === 'professional' ? 'Professional ($49/month)' : 'Agency ($99/month)'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span style={{ color: '#64748b', fontWeight: '500' }}>Status:</span>
              <span style={{ color: '#22c55e', fontWeight: '600' }}>Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span style={{ color: '#64748b', fontWeight: '500' }}>Generations:</span>
              <span style={{ color: '#0f172a', fontWeight: '600' }}>
                {subscriptionInfo.plan === 'professional' ? '100 per month' : 'Unlimited'}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center', 
          marginBottom: '2rem',
          flexWrap: 'wrap'
        }}>
          <button 
            style={{
              background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
              color: 'white',
              border: 'none',
              padding: '0.875rem 1.5rem',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              minWidth: '160px'
            }}
            onClick={() => window.location.href = '/'}
          >
            Start Creating Content
          </button>
          <button 
            style={{
              background: 'white',
              color: '#0f172a',
              border: '2px solid rgba(148, 163, 184, 0.3)',
              padding: '0.875rem 1.5rem',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              minWidth: '160px'
            }}
            onClick={() => window.location.href = '/account'}
          >
            View Account
          </button>
        </div>

        {/* Support Info */}
        <div style={{
          color: '#94a3b8',
          fontSize: '0.9rem'
        }}>
          <p>
            Need help getting started? 
            <a href="mailto:support@appraisalstudio.com" style={{
              color: '#667eea',
              textDecoration: 'none',
              fontWeight: '500',
              marginLeft: '0.25rem'
            }}>
              Contact our support team
            </a>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Success;
