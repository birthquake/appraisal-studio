import React, { useState, useEffect } from 'react';
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
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [brokerageName, setBrokerageName] = useState('');

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

  // Account state - Updated for 5 free generations for new users
  const [accountData, setAccountData] = useState({
    accountType: 'Free Trial',
    plan: 'free',
    usageCount: 0,
    usageLimit: 5,
    remainingCredits: 5,
    subscriptionStatus: 'inactive',
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

  // Content type options with descriptions
  const contentTypes = [
    {
      key: 'description',
      label: 'Property Description',
      icon: '📝',
      description: 'Detailed MLS listing description'
    },
    {
      key: 'social_listing',
      label: 'Social Media Post',
      icon: '📱',
      description: 'Engaging social media announcement'
    },
    {
      key: 'email_alert',
      label: 'Email Alert',
      icon: '📧',
      description: 'New listing email template'
    },
    {
      key: 'marketing_flyer',
      label: 'Marketing Flyer',
      icon: '📄',
      description: 'Print marketing content'
    },
    {
      key: 'just_listed',
      label: 'Just Listed',
      icon: '🏠',
      description: 'Quick announcement post'
    },
    {
      key: 'open_house',
      label: 'Open House',
      icon: '🚪',
      description: 'Open house invitation'
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

  // Account data effect
  useEffect(() => {
    if (user && currentView === 'account') {
      loadAccountData();
    }
  }, [user, currentView]);

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

  // Stripe integration functions
  const handleUpgrade = async (planId) => {
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

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
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
        neighborhood: localMarket,
        agentName,
        agentPhone,
        agentEmail,
        brokerageName
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

      // Save to Firebase
      await addDoc(collection(db, 'generations'), {
        userId: user.uid,
        content: data.content,
        contentType,
        propertyData,
        timestamp: new Date()
      });
      
      // Refresh account data after generation
      if (currentView === 'account') {
        loadAccountData();
      }
      
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
    setAgentName('');
    setAgentPhone('');
    setAgentEmail('');
    setBrokerageName('');
    setGeneratedContent('');
    setLastContentType('');
  };

  // Filter history
  const filteredHistory = contentHistory.filter(item => {
    const matchesSearch = item.propertyData?.address?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.propertyData?.agentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
              <span className="logo-text">AppraisalStudio</span>
            </div>
          </div>
          <div className="header-right">
            <nav className="nav-menu">
              <button 
                className={currentView === 'generator' ? 'nav-button active' : 'nav-button'}
                onClick={() => setCurrentView('generator')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
                <span>Generate</span>
              </button>
              {user && (
                <>
                  <button 
                    className={currentView === 'history' ? 'nav-button active' : 'nav-button'}
                    onClick={() => setCurrentView('history')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span>Account</span>
                  </button>
                </>
              )}
            </nav>
            {user ? (
              <button onClick={handleLogout} className="sign-out-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Logout
              </button>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="sign-in-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10,17 15,12 10,7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        {currentView === 'generator' && (
          <div>
            {!user ? (
              // Landing page for signed-out users
              <div className="landing-page">
                <div className="hero-section">
                  <h1 className="hero-title">AI-Powered Real Estate Content Generation</h1>
                  <p className="hero-subtitle">Create compelling property descriptions, social media posts, email alerts, and marketing content in seconds</p>
                  
                  <div className="hero-features">
                    <div className="feature-grid">
                      <div className="feature-item">
                        <div className="feature-icon">📝</div>
                        <h3>Professional Descriptions</h3>
                        <p>Generate compelling MLS-ready property descriptions that highlight key features and selling points</p>
                      </div>
                      <div className="feature-item">
                        <div className="feature-icon">📱</div>
                        <h3>Social Media Content</h3>
                        <p>Create engaging social media posts and announcements to promote your listings</p>
                      </div>
                      <div className="feature-item">
                        <div className="feature-icon">📧</div>
                        <h3>Email Marketing</h3>
                        <p>Professional email alerts and marketing content to reach potential buyers</p>
                      </div>
                      <div className="feature-item">
                        <div className="feature-icon">🏠</div>
                        <h3>Multiple Formats</h3>
                        <p>Generate content for flyers, open house invitations, and just listed announcements</p>
                      </div>
                    </div>
                  </div>

                  <div className="cta-section">
                    <h2>Get Started with 5 Free Generations</h2>
                    <p>Sign up now and create your first 5 pieces of content absolutely free</p>
                    <div className="cta-buttons">
                      <button 
                        onClick={() => {
                          setAuthMode('signup');
                          setShowAuthModal(true);
                        }} 
                        className="cta-button primary"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="8.5" cy="7" r="4"/>
                          <line x1="20" y1="8" x2="20" y2="14"/>
                          <line x1="23" y1="11" x2="17" y2="11"/>
                        </svg>
                        Start Free Trial
                      </button>
                      <button 
                        onClick={() => {
                          setAuthMode('login');
                          setShowAuthModal(true);
                        }} 
                        className="cta-button secondary"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                          <polyline points="10,17 15,12 10,7"/>
                          <line x1="15" y1="12" x2="3" y2="12"/>
                        </svg>
                        Sign In
                      </button>
                    </div>
                  </div>

                  <div className="pricing-preview">
                    <h3>Choose Your Plan</h3>
                    <div className="pricing-cards">
                      <div className="pricing-card">
                        <h4>Free Trial</h4>
                        <div className="price">$0</div>
                        <p>5 content generations to get started</p>
                        <ul>
                          <li>✓ All content types</li>
                          <li>✓ Property descriptions</li>
                          <li>✓ Social media posts</li>
                          <li>✓ Email alerts</li>
                        </ul>
                      </div>
                      <div className="pricing-card featured">
                        <h4>Professional</h4>
                        <div className="price">$49<span>/month</span></div>
                        <p>Perfect for individual agents</p>
                        <ul>
                          <li>✓ Unlimited generations</li>
                          <li>✓ All content types</li>
                          <li>✓ Content history</li>
                          <li>✓ Priority support</li>
                        </ul>
                      </div>
                      <div className="pricing-card">
                        <h4>Agency</h4>
                        <div className="price">$99<span>/month</span></div>
                        <p>For teams and agencies</p>
                        <ul>
                          <li>✓ Everything in Professional</li>
                          <li>✓ Team collaboration</li>
                          <li>✓ Advanced analytics</li>
                          <li>✓ Custom templates</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            ) : (
              // Form for signed-in users
              <div>
                <div className="hero-section">
                  <h1 className="hero-title">Generate Real Estate Content</h1>
                  <p className="hero-subtitle">
                    {accountData.plan === 'free' 
                      ? `${accountData.remainingCredits} free generations remaining` 
                      : 'Create unlimited content for your properties'
                    }
                  </p>
                </div>

                <div className="form-section">
                  {accountData.plan === 'free' && accountData.usageCount >= accountData.usageLimit ? (
                    // Upgrade prompt when free generations are exhausted
                    <div className="upgrade-prompt">
                      <div className="upgrade-card">
                        <div className="upgrade-icon">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
                          </svg>
                        </div>
                        <h2>You've Used All Your Free Generations!</h2>
                        <p>Great job exploring AppraisalStudio! You've used all 5 free content generations. Upgrade now to continue creating unlimited professional real estate content.</p>
                        
                        <div className="upgrade-options">
                          <button 
                            onClick={() => handleUpgrade('price_1RxaJb4F171I65zZX74WoXNK')}
                            className="upgrade-button professional"
                          >
                            <div className="plan-header">
                              <h3>Professional Plan</h3>
                              <div className="plan-price">$49/month</div>
                            </div>
                            <div className="plan-features">
                              <p>✓ Unlimited content generation</p>
                              <p>✓ All 6 content types</p>
                              <p>✓ Content history & search</p>
                            </div>
                          </button>
                          
                          <button 
                            onClick={() => handleUpgrade('price_1RxaKC4F171I65zZmhLiCcZF')}
                            className="upgrade-button agency"
                          >
                            <div className="plan-header">
                              <h3>Agency Plan</h3>
                              <div className="plan-price">$99/month</div>
                            </div>
                            <div className="plan-features">
                              <p>✓ Everything in Professional</p>
                              <p>✓ Team collaboration features</p>
                              <p>✓ Advanced analytics</p>
                            </div>
                          </button>
                        </div>
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

                  <div className="agent-fields">
                    <label className="section-label">Agent Information</label>
                    <div className="input-row">
                      <div className="input-group">
                        <label htmlFor="agentName">Agent Name</label>
                        <input
                          type="text"
                          id="agentName"
                          className="enhanced-input"
                          value={agentName}
                          onChange={(e) => setAgentName(e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="input-group">
                        <label htmlFor="agentPhone">Phone</label>
                        <input
                          type="tel"
                          id="agentPhone"
                          className="enhanced-input"
                          value={agentPhone}
                          onChange={(e) => setAgentPhone(e.target.value)}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>

                    <div className="input-row">
                      <div className="input-group">
                        <label htmlFor="agentEmail">Email</label>
                        <input
                          type="email"
                          id="agentEmail"
                          className="enhanced-input"
                          value={agentEmail}
                          onChange={(e) => setAgentEmail(e.target.value)}
                          placeholder="john@realty.com"
                        />
                      </div>
                      <div className="input-group">
                        <label htmlFor="brokerageName">Brokerage</label>
                        <input
                          type="text"
                          id="brokerageName"
                          className="enhanced-input"
                          value={brokerageName}
                          onChange={(e) => setBrokerageName(e.target.value)}
                          placeholder="ABC Realty"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-actions">
                    <div className="action-buttons-header">
                      <h3>Generate Content</h3>
                      <p>Choose the type of content you'd like to create for this property</p>
                    </div>
                    
                    <div className="content-type-buttons">
                      {contentTypes.map((type) => (
                        <button
                          key={type.key}
                          type="button"
                          onClick={() => handleContentGeneration(type.key)}
                          disabled={isGenerating}
                          className={`content-type-button ${isGenerating && generatingType === type.key ? 'generating' : ''}`}
                        >
                          <div className="button-icon">{type.icon}</div>
                          <div className="button-content">
                            <div className="button-label">{type.label}</div>
                            <div className="button-description">{type.description}</div>
                          </div>
                          {isGenerating && generatingType === type.key && (
                            <div className="loading-spinner small"></div>
                          )}
                        </button>
                      ))}
                    </div>
                    
                    <div className="form-controls">
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
                        Clear Form
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {generatedContent && (
              <div className="result-section">
                <div className="result-header">
                  <div className="result-title">
                    <h3>Generated {contentTypes.find(type => type.key === lastContentType)?.label || 'Content'}</h3>
                    {lastContentType && (
                      <span className="content-type-badge">{lastContentType}</span>
                    )}
                  </div>
                  <button 
                    onClick={() => navigator.clipboard.writeText(generatedContent)}
                    className="copy-button"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                    </svg>
                    Copy
                  </button>
                </div>
                <div className="result-content">
                  {generatedContent}
                </div>
              </div>
            )}
          </div>
          </div>
        )}

        {currentView === 'history' && user && (
          <div className="history-section">
            <div className="history-header">
              <h1>Content History</h1>
              <p>View and manage your previously generated content</p>
            </div>

            <div className="history-controls">
              <div className="search-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search by address, content, or agent..."
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
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                        <div className="content-badges">
                          <span className="content-type-badge">
                            {contentTypes.find(type => type.key === item.contentType)?.label || item.contentType || 'Content'}
                          </span>
                          <span className="property-type-badge">
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
                        <p>{item.content?.substring(0, 200)}...</p>
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
                          Copy
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
          <div className="account-section">
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
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                      <span className={`info-value ${accountData.subscriptionStatus}`}>
                        {accountData.subscriptionStatus}
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
                        Manage Subscription
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
                          Professional - $49/mo
                        </button>
                        <button 
                          onClick={() => handleUpgrade('price_1RxaKC4F171I65zZmhLiCcZF')}
                          className="action-btn upgrade"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
                          </svg>
                          Agency - $99/mo
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="account-card">
                  <div className="card-header">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                      <div className="stat-number">{accountData.usageLimit}</div>
                      <div className="stat-label">Limit</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-number">{accountData.remainingCredits}</div>
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
                      You're running low on free generations. Upgrade for unlimited access!
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
              Sign In
            </button>
          </div>
        )}
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
                ✕
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
          {error}
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
        {mode === 'login' ? 'Sign In' : 'Create Account'}
      </button>
    </form>
  );
}

export default App;
