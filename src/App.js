import React, { useState, useEffect, useRef } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import './App.css';

function App() {
  // Core state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState('generator');

  // Form state
  const [propertyType, setPropertyType] = useState('Single Family Home');
  const [address, setAddress] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [squareFootage, setSquareFootage] = useState('');
  const [listingPrice, setListingPrice] = useState('');
  const [propertyFeatures, setPropertyFeatures] = useState([]);
  const [keyFeatures, setKeyFeatures] = useState('');
  const [localMarket, setLocalMarket] = useState('');

  // Content generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [lastContentType, setLastContentType] = useState('');

  // UI state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');

  // History state
  const [contentHistory, setContentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Expanded content state for history
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Ref for auto-scrolling to generated content
  const resultSectionRef = useRef(null);

  // Account state - Updated for 5 free generations for new users with active status
  const [accountData, setAccountData] = useState({
    accountType: 'Free Trial',
    plan: 'free',
    usageCount: 0,
    usageLimit: 5,
    remainingCredits: 5,
    subscriptionStatus: 'active',
    hasActiveSubscription: false
  });
  const [accountLoading, setAccountLoading] = useState(false);

  // Available property features
  const availableFeatures = [
    'Pool', 'Fireplace', 'Hardwood Floors', 'Updated Kitchen', 'New Roof', 
    'Energy Efficient', 'Gourmet Kitchen', 'Master Suite', 'Walk In Closet',
    'Deck', 'Patio', 'Fenced Yard', 'Two Car Garage', 'Basement', 'Attic', 'Laundry Room'
  ];

  // Property type options
  const propertyTypeOptions = [
    'Single Family Home',
    'Condo',
    'Townhouse',
    'Multi-Family',
    'Duplex',
    'Commercial Building',
    'Office Space',
    'Retail Space',
    'Warehouse',
    'Land',
    'Mobile Home',
    'Cooperative',
    'Manufactured Home'
  ];

  // Content type options with descriptions and colors
  const contentTypes = [
    {
      key: 'description',
      label: 'Property Description',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      ),
      color: 'linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%)',
      textColor: '#0277bd'
    },
    {
      key: 'social_listing',
      label: 'Social Media Post',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
        </svg>
      ),
      color: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
      textColor: '#7b1fa2'
    },
    {
      key: 'email_alert',
      label: 'Email Alert',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect width="20" height="16" x="2" y="4" rx="2"/>
          <path d="M6 8l6 5 6-5"/>
        </svg>
      ),
      color: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
      textColor: '#388e3c'
    },
    {
      key: 'marketing_flyer',
      label: 'Marketing Flyer',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      ),
      color: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
      textColor: '#f57c00'
    },
    {
      key: 'just_listed',
      label: 'Just Listed',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
      ),
      color: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)',
      textColor: '#00838f'
    },
    {
      key: 'open_house',
      label: 'Open House',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 6l-2-6L0 6v9l12 4 12-4V6z"/>
          <path d="M12 22v-9"/>
          <path d="M6 15v4"/>
          <path d="M18 15v4"/>
        </svg>
      ),
      color: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)',
      textColor: '#c2185b'
    }
  ];

  // Authentication effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Account data effect - load when user signs in or view changes
  useEffect(() => {
    if (user) {
      loadAccountData();
    }
  }, [user]);

  useEffect(() => {
    if (user && currentView === 'account') {
      loadAccountData();
    }
  }, [currentView]);

  // History effect
  useEffect(() => {
    if (user && currentView === 'history') {
      loadContentHistory();
    }
  }, [user, currentView]);

  // Load real account data from API
  const loadAccountData = async () => {
    if (!user) return;
    
    setAccountLoading(true);
    try {
      const response = await fetch(`/api/user/account?userId=${user.uid}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔄 Account data loaded:', {
          plan: data.plan,
          usageCount: data.usageCount,
          usageLimit: data.usageLimit,
          remainingCredits: data.remainingCredits
        });
        setAccountData(data);
      } else {
        console.error('Error loading account data:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading account data:', error);
    } finally {
      setAccountLoading(false);
    }
  };

  // Load content history
  const loadContentHistory = async () => {
    if (!user) return;
    
    setHistoryLoading(true);
    try {
      const q = query(
        collection(db, 'generations'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      
      const querySnapshot = await getDocs(q);
      const history = [];
      querySnapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() });
      });
      
      setContentHistory(history);
    } catch (error) {
      console.error('Error loading content history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Authentication functions
  const handleSignUp = async (email, password) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setShowAuthModal(false);
      setAuthError('');
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogin = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShowAuthModal(false);
      setAuthError('');
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentView('generator');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Fixed Stripe integration functions
  const handleUpgrade = async (planId) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          priceId: planId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL returned from API');
        alert('Unable to start checkout. Please try again.');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Error starting checkout. Please try again.');
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          returnUrl: window.location.origin
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        console.error('No portalUrl returned from customer portal API');
        alert('Unable to access customer portal. Please try again.');
      }
    } catch (error) {
      console.error('Error accessing customer portal:', error);
      alert('Error accessing customer portal. Please try again.');
    }
  };

  // Property features handling
  const handleFeatureToggle = (feature) => {
    setPropertyFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  // Content generation - updated to handle different content types
  const handleContentGeneration = async (contentType) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Check required fields
    if (!address || !listingPrice) {
      alert('Please fill in at least the address and price to generate content.');
      return;
    }

    // Check usage limits for free users
    if (accountData.plan === 'free' && accountData.usageCount >= accountData.usageLimit) {
      alert(`You've used all ${accountData.usageLimit} free generations. Upgrade to continue creating content!`);
      return;
    }

    setIsGenerating(true);
    setGeneratingType(contentType);
    setGeneratedContent('');

    try {
      const propertyData = {
        propertyType,
        address,
        bedrooms,
        bathrooms,
        sqft: squareFootage,
        price: listingPrice,
        features: keyFeatures,
        specialFeatures: propertyFeatures.reduce((acc, feature) => {
          acc[feature.replace(/\s+/g, '').toLowerCase()] = true;
          return acc;
        }, {}),
        neighborhood: localMarket
      };

      const response = await fetch('/api/property', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyData,
          contentType,
          userId: user.uid
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setGeneratedContent(data.content);
      setLastContentType(contentType);

      // Auto-scroll to generated content
      setTimeout(() => {
        resultSectionRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);

      // Save to Firebase
      await addDoc(collection(db, 'generations'), {
        userId: user.uid,
        content: data.content,
        contentType,
        propertyData,
        timestamp: new Date()
      });
      
      // Refresh account data after generation to update remaining credits
      loadAccountData();
      
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Error generating content. Please try again.');
    } finally {
      setIsGenerating(false);
      setGeneratingType('');
    }
  };

  // Clear form for new property
  const clearForm = () => {
    setPropertyType('Single Family Home');
    setAddress('');
    setBedrooms('');
    setBathrooms('');
    setSquareFootage('');
    setListingPrice('');
    setPropertyFeatures([]);
    setKeyFeatures('');
    setLocalMarket('');
    setGeneratedContent('');
    setLastContentType('');
  };

  // Toggle expanded content in history
  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Filter history
  const filteredHistory = contentHistory.filter(item => {
    const matchesSearch = item.propertyData?.address?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || 
                         item.contentType === filterType ||
                         item.propertyData?.propertyType === filterType;
    return matchesSearch && matchesFilter;
  });

  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
              <span className="logo-text">AppraisalStudio</span>
            </div>
          </div>
          <div className="header-right">
            <nav className="nav-menu">
              {user && (
                <>
                  <button 
                    className={currentView === 'generator' ? 'nav-button active' : 'nav-button'}
                    onClick={() => setCurrentView('generator')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                    <span>Generate</span>
                  </button>
                  <button 
                    className={currentView === 'history' ? 'nav-button active' : 'nav-button'}
                    onClick={() => setCurrentView('history')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3v5h5"/>
                      <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
                      <path d="M12 7v5l4 2"/>
                    </svg>
                    <span>History</span>
                  </button>
                  <button 
                    className={currentView === 'account' ? 'nav-button active' : 'nav-button'}
                    onClick={() => setCurrentView('account')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span>Account</span>
                  </button>
                </>
              )}
            </nav>
            {user ? (
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                {/* Usage counter */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                  </svg>
                  <span>
                    {accountData.plan === 'free' 
                      ? `${accountData.usageCount || 0}/${accountData.usageLimit || 5}` 
                      : `${accountData.usageCount || 0} generated`
                    }
                  </span>
                </div>
                <button onClick={handleLogout} className="sign-out-button">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Logout</span>
              </button>
              </div>
            ) : (
              <button onClick={() => {
                setAuthMode('login');
                setShowAuthModal(true);
              }} className="sign-in-button">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10,17 15,12 10,7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="main-content" style={{
        background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 20%, #f8fafc 60%, #f0f4f8 100%)',
        minHeight: '100vh',
        position: 'relative'
      }}>
        {/* Subtle geometric pattern overlay with warm tones */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.05,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23475569' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          pointerEvents: 'none',
          zIndex: 0
        }} />
        <div style={{position: 'relative', zIndex: 1}}>
        {currentView === 'generator' && (
          <div>
            {!user ? (
              // Clean, minimalist landing page for signed-out users - leading with value
              <div style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 40%, rgba(241,245,249,0.9) 100%)',
                borderRadius: '1.5rem',
                padding: '3rem 2rem',
                boxShadow: '0 20px 40px -10px rgba(71, 85, 105, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)'
              }}>
                <div className="features-section">
                  <div style={{textAlign: 'center', marginBottom: '3rem'}}>
                    <h1 style={{fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--gray-900)'}}>AI-Powered Real Estate Content</h1>
                    <p style={{fontSize: '1.25rem', color: 'var(--gray-600)', maxWidth: '600px', margin: '0 auto 2rem'}}>Generate professional property descriptions, social media posts, and marketing content in seconds</p>
                  </div>
                  
                  <div className="features-grid">
                    <div className="feature-card" style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 40%, rgba(241,245,249,0.85) 100%)',
                      boxShadow: '0 10px 25px -5px rgba(71, 85, 105, 0.15)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.3)'
                    }}>
                      <div className="feature-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                      </div>
                      <h3>Property Descriptions</h3>
                      <p>MLS-ready descriptions that highlight key features and selling points</p>
                    </div>

                    <div className="feature-card" style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 40%, rgba(241,245,249,0.85) 100%)',
                      boxShadow: '0 10px 25px -5px rgba(71, 85, 105, 0.15)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.3)'
                    }}>
                      <div className="feature-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect width="20" height="16" x="2" y="4" rx="2"/>
                          <path d="M6 8l6 5 6-5"/>
                        </svg>
                      </div>
                      <h3>Email Marketing</h3>
                      <p>Professional email alerts and templates to reach potential buyers</p>
                    </div>

                    <div className="feature-card" style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 40%, rgba(241,245,249,0.85) 100%)',
                      boxShadow: '0 10px 25px -5px rgba(71, 85, 105, 0.15)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.3)'
                    }}>
                      <div className="feature-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                        </svg>
                      </div>
                      <h3>Marketing Flyers</h3>
                      <p>Print-ready content for flyers and promotional materials</p>
                    </div>

                    <div className="feature-card" style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 40%, rgba(241,245,249,0.85) 100%)',
                      boxShadow: '0 10px 25px -5px rgba(71, 85, 105, 0.15)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.3)'
                    }}>
                      <div className="feature-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                        </svg>
                      </div>
                      <h3>Social Media</h3>
                      <p>Engaging posts and announcements for social platforms</p>
                    </div>

                    <div className="feature-card" style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 40%, rgba(241,245,249,0.85) 100%)',
                      boxShadow: '0 10px 25px -5px rgba(71, 85, 105, 0.15)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.3)'
                    }}>
                      <div className="feature-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"/>
                          <polyline points="9,22 9,12 15,12 15,22"/>
                        </svg>
                      </div>
                      <h3>Open House</h3>
                      <p>Invitations and announcements for open house events</p>
                    </div>

                    <div className="feature-card" style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 40%, rgba(241,245,249,0.85) 100%)',
                      boxShadow: '0 10px 25px -5px rgba(71, 85, 105, 0.15)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.3)'
                    }}>
                      <div className="feature-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      </div>
                      <h3>Just Listed</h3>
                      <p>Quick announcement posts for new listings</p>
                    </div>
                  </div>
                </div>

                <div style={{marginTop: '4rem'}}>
                  <div style={{textAlign: 'center', marginBottom: '3rem'}}>
                    <h2 style={{fontSize: '2.25rem', fontWeight: '700', marginBottom: '1rem'}}>Simple, transparent pricing</h2>
                    <p style={{fontSize: '1.125rem', color: 'var(--gray-600)'}}>Start free, upgrade when you need more</p>
                  </div>

                  <div style={{
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                    gap: '2rem', 
                    maxWidth: '1000px', 
                    margin: '0 auto'
                  }}>
                    <div className="feature-card" style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 40%, rgba(241,245,249,0.85) 100%)',
                      boxShadow: '0 10px 25px -5px rgba(71, 85, 105, 0.15)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.3)'
                    }}>
                      <div style={{marginBottom: '1.5rem'}}>
                        <h3 style={{fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem'}}>Free Trial</h3>
                        <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'center', marginBottom: '0.5rem'}}>
                          <span style={{fontSize: '0.875rem', color: 'var(--gray-500)'}}>$</span>
                          <span style={{fontSize: '3rem', fontWeight: '700', color: 'var(--gray-900)'}}>0</span>
                        </div>
                        <p style={{color: 'var(--gray-600)', fontSize: '0.875rem'}}>Get started with 5 free generations</p>
                      </div>
                      <ul style={{listStyle: 'none', padding: 0, marginBottom: '1.5rem'}}>
                        <li style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                          <span style={{fontSize: '0.875rem'}}>5 content generations</span>
                        </li>
                        <li style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                          <span style={{fontSize: '0.875rem'}}>All content types</span>
                        </li>
                        <li style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                          <span style={{fontSize: '0.875rem'}}>Content history</span>
                        </li>
                      </ul>
                      <button 
                        onClick={() => {
                          setAuthMode('signup');
                          setShowAuthModal(true);
                        }}
                        className="action-btn secondary"
                        style={{width: '100%'}}
                      >
                        <span>Start Free</span>
                      </button>
                    </div>

                    <div className="feature-card" style={{
                      border: '2px solid var(--primary-500)', 
                      position: 'relative',
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.95) 40%, rgba(241,245,249,0.9) 100%)',
                      boxShadow: '0 15px 35px -5px rgba(14, 165, 233, 0.2)',
                      backdropFilter: 'blur(15px)'
                    }}>
                      <div style={{position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary-500)', color: 'white', padding: '0.25rem 1rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600'}}>Most Popular</div>
                      <div style={{marginBottom: '1.5rem'}}>
                        <h3 style={{fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem'}}>Professional</h3>
                        <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'center', marginBottom: '0.5rem'}}>
                          <span style={{fontSize: '0.875rem', color: 'var(--gray-500)'}}>$</span>
                          <span style={{fontSize: '3rem', fontWeight: '700', color: 'var(--gray-900)'}}>49</span>
                          <span style={{fontSize: '0.875rem', color: 'var(--gray-500)', marginLeft: '0.25rem'}}>/month</span>
                        </div>
                        <p style={{color: 'var(--gray-600)', fontSize: '0.875rem'}}>Perfect for individual agents</p>
                      </div>
                      <ul style={{listStyle: 'none', padding: 0, marginBottom: '1.5rem'}}>
                        <li style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                          <span style={{fontSize: '0.875rem'}}>100 generations per month</span>
                        </li>
                        <li style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                          <span style={{fontSize: '0.875rem'}}>All content types</span>
                        </li>
                        <li style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                          <span style={{fontSize: '0.875rem'}}>Content history & search</span>
                        </li>
                        <li style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                          <span style={{fontSize: '0.875rem'}}>Priority support</span>
                        </li>
                      </ul>
                      <button 
                        onClick={() => {
                          setAuthMode('signup');
                          setShowAuthModal(true);
                        }}
                        className="cta-button"
                        style={{width: '100%'}}
                      >
                        <span>Get Started</span>
                      </button>
                    </div>

                    <div className="feature-card" style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 40%, rgba(241,245,249,0.85) 100%)',
                      boxShadow: '0 10px 25px -5px rgba(71, 85, 105, 0.15)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.3)'
                    }}>
                      <div style={{marginBottom: '1.5rem'}}>
                        <h3 style={{fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem'}}>Agency</h3>
                        <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'center', marginBottom: '0.5rem'}}>
                          <span style={{fontSize: '0.875rem', color: 'var(--gray-500)'}}>$</span>
                          <span style={{fontSize: '3rem', fontWeight: '700', color: 'var(--gray-900)'}}>99</span>
                          <span style={{fontSize: '0.875rem', color: 'var(--gray-500)', marginLeft: '0.25rem'}}>/month</span>
                        </div>
                        <p style={{color: 'var(--gray-600)', fontSize: '0.875rem'}}>For teams and agencies</p>
                      </div>
                      <ul style={{listStyle: 'none', padding: 0, marginBottom: '1.5rem'}}>
                        <li style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                          <span style={{fontSize: '0.875rem'}}>Unlimited generations</span>
                        </li>
                        <li style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                          <span style={{fontSize: '0.875rem'}}>Team collaboration</span>
                        </li>
                        <li style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                          <span style={{fontSize: '0.875rem'}}>Advanced analytics</span>
                        </li>
                        <li style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                          <span style={{fontSize: '0.875rem'}}>Custom templates</span>
                        </li>
                      </ul>
                      <button 
                        onClick={() => {
                          setAuthMode('signup');
                          setShowAuthModal(true);
                        }}
                        className="action-btn secondary"
                        style={{width: '100%'}}
                      >
                        <span>Get Started</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Form for signed-in users
              <div style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 40%, rgba(241,245,249,0.9) 100%)',
                borderRadius: '1.5rem',
                padding: '2rem',
                boxShadow: '0 20px 40px -10px rgba(71, 85, 105, 0.12)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.4)'
              }}>
                <div className="hero-section">
                  <h1 className="hero-title">Generate Content For Your Property</h1>
                </div>

                <div className="form-section">
                  {accountData.plan === 'free' && accountData.usageCount >= accountData.usageLimit ? (
                    // Upgrade prompt when free generations are exhausted
                    <div className="upgrade-content">
                      <div className="upgrade-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
                        </svg>
                      </div>
                      <h2>You've Used All Your Free Generations!</h2>
                      <p>Great job exploring AppraisalStudio! You've used all 5 free content generations. Upgrade now to continue creating unlimited professional real estate content.</p>
                      
                      <div className="upgrade-actions">
                        <button 
                          onClick={() => handleUpgrade('price_1RxaJb4F171I65zZX74WoXNK')}
                          className="upgrade-btn primary"
                        >
                          <span>Professional - $49/month</span>
                        </button>
                        
                        <button 
                          onClick={() => handleUpgrade('price_1RxaKC4F171I65zZmhLiCcZF')}
                          className="upgrade-btn primary"
                        >
                          <span>Agency - $99/month</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Regular form for users with remaining generations
                    <div className="form-card">
                      <div className="form-header">
                        <div className="form-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"/>
                            <polyline points="9,22 9,12 15,12 15,22"/>
                          </svg>
                        </div>
                        <div>
                          <h2>Property Information</h2>
                          <p>Enter the details about the property to generate tailored content</p>
                        </div>
                      </div>

                      <div className="form-grid">
                        <div className="input-group required">
                          <label htmlFor="propertyType">Property Type</label>
                          <select 
                            id="propertyType"
                            className="enhanced-input"
                            value={propertyType} 
                            onChange={(e) => setPropertyType(e.target.value)}
                            required
                          >
                            {propertyTypeOptions.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>

                        <div className="input-group required">
                          <label htmlFor="address">Property Address</label>
                          <input
                            type="text"
                            id="address"
                            className="enhanced-input"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="123 Main St, City, State"
                            required
                          />
                        </div>

                        <div className="input-row">
                          <div className="input-group">
                            <label htmlFor="bedrooms">Bedrooms</label>
                            <input
                              type="number"
                              id="bedrooms"
                              className="enhanced-input"
                              value={bedrooms}
                              onChange={(e) => setBedrooms(e.target.value)}
                              placeholder="3"
                              min="0"
                            />
                          </div>
                          <div className="input-group">
                            <label htmlFor="bathrooms">Bathrooms</label>
                            <input
                              type="number"
                              id="bathrooms"
                              className="enhanced-input"
                              value={bathrooms}
                              onChange={(e) => setBathrooms(e.target.value)}
                              placeholder="2.5"
                              min="0"
                              step="0.5"
                            />
                          </div>
                        </div>

                        <div className="input-row">
                          <div className="input-group">
                            <label htmlFor="squareFootage">Square Footage</label>
                            <input
                              type="number"
                              id="squareFootage"
                              className="enhanced-input"
                              value={squareFootage}
                              onChange={(e) => setSquareFootage(e.target.value)}
                              placeholder="2000"
                              min="0"
                            />
                          </div>
                          <div className="input-group">
                            <label htmlFor="listingPrice">Price</label>
                            <input
                              type="number"
                              id="listingPrice"
                              className="enhanced-input"
                              value={listingPrice}
                              onChange={(e) => setListingPrice(e.target.value)}
                              placeholder="450000"
                              min="0"
                            />
                          </div>
                        </div>

                        <div className="special-features">
                          <label className="section-label">Special Features</label>
                          <div className="checkbox-grid">
                            {availableFeatures.map((feature) => (
                              <div key={feature} className="checkbox-item">
                                <input
                                  type="checkbox"
                                  id={feature}
                                  checked={propertyFeatures.includes(feature)}
                                  onChange={() => handleFeatureToggle(feature)}
                                />
                                <label htmlFor={feature} className="checkbox-label">{feature}</label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="optional-fields">
                          <div className="input-group">
                            <label htmlFor="keyFeatures">Key Features & Highlights</label>
                            <textarea
                              id="keyFeatures"
                              className="enhanced-input"
                              value={keyFeatures}
                              onChange={(e) => setKeyFeatures(e.target.value)}
                              placeholder="Recently renovated, great schools, quiet neighborhood..."
                              rows="3"
                            />
                          </div>

                          <div className="input-group">
                            <label htmlFor="localMarket">Local Market Information</label>
                            <textarea
                              id="localMarket"
                              className="enhanced-input"
                              value={localMarket}
                              onChange={(e) => setLocalMarket(e.target.value)}
                              placeholder="Market trends, neighborhood info, nearby amenities..."
                              rows="3"
                            />
                          </div>
                        </div>

                        <div>
                          <div style={{marginBottom: '1.5rem'}}>
                            <h3 style={{fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem'}}>Generate Content</h3>
                            <p style={{color: 'var(--gray-600)', fontSize: '0.875rem'}}>Choose the type of content you'd like to create for this property</p>
                          </div>
                          
                          <div className="content-type-grid">
                            {contentTypes.map((type) => (
                              <button
                                key={type.key}
                                type="button"
                                onClick={() => handleContentGeneration(type.key)}
                                disabled={isGenerating}
                                className="content-type-option"
                                style={{
                                  position: 'relative',
                                  background: type.color,
                                  border: `2px solid ${type.textColor}20`,
                                  color: type.textColor,
                                  minHeight: '80px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.75rem',
                                  transition: 'all 0.2s ease',
                                  transform: isGenerating && generatingType === type.key ? 'scale(0.98)' : 'scale(1)'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isGenerating) {
                                    e.target.style.transform = 'scale(1.02)';
                                    e.target.style.boxShadow = `0 8px 25px -8px ${type.textColor}40`;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isGenerating) {
                                    e.target.style.transform = 'scale(1)';
                                    e.target.style.boxShadow = '';
                                  }
                                }}
                              >
                                <div style={{color: type.textColor}}>{type.icon}</div>
                                <div style={{
                                  fontSize: '0.875rem', 
                                  fontWeight: '600',
                                  textAlign: 'center',
                                  color: type.textColor
                                }}>{type.label}</div>
                                {isGenerating && generatingType === type.key && (
                                  <div className="loading-spinner small" style={{
                                    position: 'absolute', 
                                    top: '0.5rem', 
                                    right: '0.5rem',
                                    borderTopColor: type.textColor
                                  }}></div>
                                )}
                              </button>
                            ))}
                          </div>
                          
                          <div style={{marginTop: '1.5rem'}}>
                            <button 
                              type="button" 
                              onClick={clearForm}
                              className="clear-form-button"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18"/>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                <line x1="10" y1="11" x2="10" y2="17"/>
                                <line x1="14" y1="11" x2="14" y2="17"/>
                              </svg>
                              <span>Clear Form</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {generatedContent && (
                  <div ref={resultSectionRef} className="result-section">
                    <div className="result-header">
                      <h3>Generated {contentTypes.find(type => type.key === lastContentType)?.label || 'Content'}</h3>
                      <button 
                        onClick={() => navigator.clipboard.writeText(generatedContent)}
                        className="copy-button"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                        </svg>
                        <span>Copy</span>
                      </button>
                    </div>
                    <div className="result-content">
                      {generatedContent}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {currentView === 'history' && user && (
          <div className="history-section" style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 40%, rgba(241,245,249,0.9) 100%)',
            borderRadius: '1.5rem',
            padding: '2rem',
            boxShadow: '0 20px 40px -10px rgba(71, 85, 105, 0.12)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.4)'
          }}>
            <div className="history-header">
              <h1>Content History</h1>
              <p>View and manage your previously generated content</p>
            </div>

            <div className="history-controls">
              <div className="search-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search by address or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="filter-dropdown">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Types</option>
                  <optgroup label="Content Types">
                    <option value="description">Property Descriptions</option>
                    <option value="social_listing">Social Media Posts</option>
                    <option value="email_alert">Email Alerts</option>
                    <option value="marketing_flyer">Marketing Flyers</option>
                    <option value="just_listed">Just Listed</option>
                    <option value="open_house">Open House</option>
                  </optgroup>
                  <optgroup label="Property Types">
                    {propertyTypeOptions.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="history-content">
              {historyLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Loading history...</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="empty-state">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                  <h3>No content found</h3>
                  <p>Start generating content to see your history here</p>
                </div>
              ) : (
                <div className="history-grid">
                  {filteredHistory.map((item) => (
                    <div key={item.id} className="history-item">
                      <div className="history-item-header">
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                          <span className="content-type-badge">
                            {contentTypes.find(type => type.key === item.contentType)?.label || item.contentType || 'Content'}
                          </span>
                          <span className="content-type-badge" style={{backgroundColor: 'var(--gray-100)', color: 'var(--gray-700)'}}>
                            {item.propertyData?.propertyType || 'Property'}
                          </span>
                        </div>
                        <span className="history-item-date">
                          {item.timestamp?.toDate?.()?.toLocaleDateString() || 'Recent'}
                        </span>
                      </div>
                      <div className="history-item-property">
                        <h4>{item.propertyData?.address || 'Property Address'}</h4>
                        <div className="property-meta">
                          {item.propertyData?.bedrooms && <span>{item.propertyData.bedrooms} bed</span>}
                          {item.propertyData?.bathrooms && <span>{item.propertyData.bathrooms} bath</span>}
                          {item.propertyData?.sqft && <span>{item.propertyData.sqft} sq ft</span>}
                          {item.propertyData?.price && <span>${item.propertyData.price}</span>}
                        </div>
                        <p>
                          {expandedItems.has(item.id) ? 
                            item.content : 
                            `${item.content?.substring(0, 150)}${item.content?.length > 150 ? '...' : ''}`
                          }
                        </p>
                        {item.content?.length > 150 && (
                          <button 
                            onClick={() => toggleExpanded(item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--primary-600)',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              marginTop: '0.5rem',
                              padding: 0
                            }}
                          >
                            {expandedItems.has(item.id) ? 'Read Less' : 'Read More'}
                          </button>
                        )}
                      </div>
                      <div className="history-item-actions">
                        <button 
                          onClick={() => navigator.clipboard.writeText(item.content)}
                          className="action-button copy"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                          </svg>
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'account' && user && (
          <div className="account-section" style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 40%, rgba(241,245,249,0.9) 100%)',
            borderRadius: '1.5rem',
            padding: '2rem',
            boxShadow: '0 20px 40px -10px rgba(71, 85, 105, 0.12)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.4)'
          }}>
            <div className="account-header">
              <h1>Account Dashboard</h1>
              <p>Manage your subscription and view usage statistics</p>
            </div>
            
            {accountLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading account data...</p>
              </div>
            ) : (
              <div className="account-grid">
                <div className="account-card">
                  <div className="card-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <h3>Account Information</h3>
                  </div>
                  <div className="account-info">
                    <div className="info-item">
                      <span className="info-label">Email</span>
                      <span className="info-value">{user.email}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Account Type</span>
                      <span className="info-value">{accountData.accountType}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Status</span>
                      <span className="info-value active">
                        active
                      </span>
                    </div>
                    
                    {accountData.hasActiveSubscription && accountData.billingPeriod && (
                      <div className="billing-info">
                        <div className="info-item">
                          <span className="info-label">Billing Period</span>
                          <span className="info-value">
                            {new Date(accountData.billingPeriod.start).toLocaleDateString()} - 
                            {new Date(accountData.billingPeriod.end).toLocaleDateString()}
                          </span>
                        </div>
                        {accountData.cancelAtPeriodEnd && (
                          <div className="cancel-notice">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                              <line x1="12" y1="9" x2="12" y2="13"/>
                              <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                            Subscription will cancel at the end of the billing period
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="quick-actions" style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)'}}>
                    {accountData.hasActiveSubscription ? (
                      <button onClick={handleManageSubscription} className="action-btn primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                        <span>Manage Subscription</span>
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleUpgrade('price_1RxaJb4F171I65zZX74WoXNK')}
                          className="action-btn upgrade"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                          </svg>
                          <span>Professional - $49/mo</span>
                        </button>
                        <button 
                          onClick={() => handleUpgrade('price_1RxaKC4F171I65zZmhLiCcZF')}
                          className="action-btn upgrade"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
                          </svg>
                          <span>Agency - $99/mo</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="account-card">
                  <div className="card-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    <h3>Usage Statistics</h3>
                  </div>
                  <div className="usage-stats">
                    <div className="stat-item">
                      <div className="stat-number">{accountData.usageCount}</div>
                      <div className="stat-label">Used</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-number">{accountData.usageLimit === -1 ? '∞' : accountData.usageLimit}</div>
                      <div className="stat-label">Limit</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-number">{accountData.usageLimit === -1 ? '∞' : accountData.remainingCredits}</div>
                      <div className="stat-label">Remaining</div>
                    </div>
                  </div>
                  
                  {accountData.plan === 'free' && accountData.usageCount >= accountData.usageLimit * 0.6 && (
                    <div className="usage-warning">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <span>You're running low on free generations. Upgrade for unlimited access!</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!user && currentView !== 'generator' && (
          <div className="welcome-section">
            <h2>Welcome to AppraisalStudio</h2>
            <p>Please log in to access your account and content history.</p>
            <button onClick={() => setShowAuthModal(true)} className="cta-button">
              <span>Sign In</span>
            </button>
          </div>
        )}
        </div>
      </main>

      {showAuthModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>
              <button 
                onClick={() => setShowAuthModal(false)} 
                className="modal-close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <AuthForm 
              mode={authMode}
              onSubmit={authMode === 'login' ? handleLogin : handleSignUp}
              error={authError}
            />
            
            <div className="auth-links">
              <p>
                {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                >
                  {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Auth form component
function AuthForm({ mode, onSubmit, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error && (
        <div className="auth-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>{error}</span>
        </div>
      )}
      
      <div className="auth-input-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <div className="auth-input-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      
      <button type="submit" className="auth-submit-btn">
        <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
      </button>
    </form>
  );
}

export default App;
