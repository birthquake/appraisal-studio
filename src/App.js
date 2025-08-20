import React, { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import './App.css';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDL4KU8MeNf85-wdJZfMKhrzD-pywCJrBo",
  authDomain: "appraisalstudio-8b5fd.firebaseapp.com",
  projectId: "appraisalstudio-8b5fd",
  storageBucket: "appraisalstudio-8b5fd.firebasestorage.app",
  messagingSenderId: "533936802264",
  appId: "1:533936802264:web:8b02c80da3dc4c0bb3577c"
};

// Initialize Firebase (prevent duplicate initialization)
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    app = getApps()[0]; // Use existing app
  } else {
    throw error;
  }
}
const auth = getAuth(app);
const db = getFirestore(app);

function App() {
  // Core state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState('generator');

  // Form state
  const [propertyType, setPropertyType] = useState('residential-sale');
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

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');

  // History state
  const [contentHistory, setContentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Account state - NEW: using real account data structure
  const [accountData, setAccountData] = useState({
    accountType: 'Free Plan',
    plan: 'free',
    usageCount: 0,
    usageLimit: 1000,
    remainingCredits: 1000,
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

  // Authentication effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Account data effect - NEW: load real account data
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

  // NEW: Load real account data from API
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

  // NEW: Stripe integration functions
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
        }),
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error accessing customer portal:', error);
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

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Check usage limits for free users
    if (accountData.plan === 'free' && accountData.usageCount >= accountData.usageLimit) {
      alert(`You've reached your generation limit. Upgrade to continue generating content.`);
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');

    try {
      const propertyData = {
        propertyType,
        address,
        bedrooms,
        bathrooms,
        squareFootage,
        listingPrice,
        propertyFeatures,
        keyFeatures,
        localMarket,
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
          ...propertyData,
          userId: user.uid
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setGeneratedContent(data.content);
      
      // Refresh account data after generation
      if (currentView === 'account') {
        loadAccountData();
      }
      
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Error generating content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Clear form
  const clearForm = () => {
    setAddress('');
    setBedrooms('');
    setBathrooms('');
    setSquareFootage('');
    setListingPrice('');
    setPropertyFeatures([]);
    setKeyFeatures('');
    setLocalMarket('');
  };

  // Filter history
  const filteredHistory = contentHistory.filter(item => {
    const matchesSearch = item.address?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.agentName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || item.propertyType === filterType;
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
            <div className="hero-section">
              <h1 className="hero-title">AI-Powered Real Estate Content</h1>
              <p className="hero-subtitle">Generate compelling property descriptions, marketing content, and listings in seconds</p>
            </div>

            <div className="form-section">
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

                <form onSubmit={handleSubmit} className="form-grid">
                  <div className="input-group required">
                    <label htmlFor="propertyType">Property Type</label>
                    <select 
                      id="propertyType"
                      className="enhanced-input"
                      value={propertyType} 
                      onChange={(e) => setPropertyType(e.target.value)}
                      required
                    >
                      <option value="residential-sale">Residential Sale</option>
                      <option value="residential-rental">Residential Rental</option>
                      <option value="commercial-sale">Commercial Sale</option>
                      <option value="commercial-lease">Commercial Lease</option>
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
                      <label htmlFor="listingPrice">
                        {propertyType.includes('rental') ? 'Monthly Rent' : 'Listing Price'}
                      </label>
                      <input
                        type="number"
                        id="listingPrice"
                        className="enhanced-input"
                        value={listingPrice}
                        onChange={(e) => setListingPrice(e.target.value)}
                        placeholder={propertyType.includes('rental') ? '2500' : '450000'}
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

                  <button type="submit" disabled={isGenerating} className="generate-button">
                    {isGenerating ? (
                      <>
                        <div className="loading-spinner small"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 11H1L4 14L1 17H9A10 10 0 0 0 9 11Z"/>
                          <path d="M20 12C20 7.588 16.411 4 12 4"/>
                        </svg>
                        Generate Content
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {generatedContent && (
              <div className="result-section">
                <div className="result-header">
                  <h3>Generated Content</h3>
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
                  placeholder="Search by address or agent..."
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
                  <option value="residential-sale">Residential Sale</option>
                  <option value="residential-rental">Residential Rental</option>
                  <option value="commercial-sale">Commercial Sale</option>
                  <option value="commercial-lease">Commercial Lease</option>
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
                        <span className="content-type-badge">
                          {item.propertyType?.replace('-', ' ') || 'Property'}
                        </span>
                        <span className="history-item-date">
                          {item.timestamp?.toDate?.()?.toLocaleDateString() || 'Recent'}
                        </span>
                      </div>
                      <div className="history-item-property">
                        <h4>{item.address || 'Property Address'}</h4>
                        <div className="property-meta">
                          {item.bedrooms && <span>{item.bedrooms} bed</span>}
                          {item.bathrooms && <span>{item.bathrooms} bath</span>}
                          {item.squareFootage && <span>{item.squareFootage} sq ft</span>}
                          {item.agentName && <span>{item.agentName}</span>}
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
                  
                  {accountData.plan === 'free' && accountData.usageCount >= accountData.usageLimit * 0.8 && (
                    <div className="usage-warning">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      You're approaching your generation limit. Consider upgrading for unlimited access.
                    </div>
                  )}
                </div>

                <div className="account-card">
                  <div className="card-header">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="20" height="14" x="2" y="5" rx="2"/>
                      <line x1="2" y1="10" x2="22" y2="10"/>
                    </svg>
                    <h3>Subscription Management</h3>
                  </div>
                  <div className="quick-actions">
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
