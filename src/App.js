import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
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
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">AppraisalStudio</h1>
          <nav className="nav-links">
            <button 
              className={currentView === 'generator' ? 'nav-link active' : 'nav-link'}
              onClick={() => setCurrentView('generator')}
            >
              Generate
            </button>
            {user && (
              <>
                <button 
                  className={currentView === 'history' ? 'nav-link active' : 'nav-link'}
                  onClick={() => setCurrentView('history')}
                >
                  History
                </button>
                <button 
                  className={currentView === 'account' ? 'nav-link active' : 'nav-link'}
                  onClick={() => setCurrentView('account')}
                >
                  Account
                </button>
              </>
            )}
          </nav>
          <div className="auth-section">
            {user ? (
              <div className="user-info">
                <span>{user.email}</span>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="login-btn">
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        {currentView === 'generator' && (
          <div className="generator-view">
            <div className="form-container">
              <h2>Property Information</h2>
              <form onSubmit={handleSubmit} className="property-form">
                <div className="form-group">
                  <label htmlFor="propertyType">Property Type:</label>
                  <select 
                    id="propertyType"
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

                <div className="form-group">
                  <label htmlFor="address">Property Address:</label>
                  <input
                    type="text"
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St, City, State"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="bedrooms">Bedrooms:</label>
                    <input
                      type="number"
                      id="bedrooms"
                      value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value)}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="bathrooms">Bathrooms:</label>
                    <input
                      type="number"
                      id="bathrooms"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value)}
                      min="0"
                      step="0.5"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="squareFootage">Square Footage:</label>
                    <input
                      type="number"
                      id="squareFootage"
                      value={squareFootage}
                      onChange={(e) => setSquareFootage(e.target.value)}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="listingPrice">
                      {propertyType.includes('rental') ? 'Monthly Rent:' : 'Listing Price:'}
                    </label>
                    <input
                      type="number"
                      id="listingPrice"
                      value={listingPrice}
                      onChange={(e) => setListingPrice(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h3>Special Features</h3>
                  <div className="features-grid">
                    {availableFeatures.map((feature) => (
                      <label key={feature} className="feature-checkbox">
                        <input
                          type="checkbox"
                          checked={propertyFeatures.includes(feature)}
                          onChange={() => handleFeatureToggle(feature)}
                        />
                        <span>{feature}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-section">
                  <h3>Additional Details</h3>
                  <div className="form-group">
                    <label htmlFor="keyFeatures">Key Features & Highlights:</label>
                    <textarea
                      id="keyFeatures"
                      value={keyFeatures}
                      onChange={(e) => setKeyFeatures(e.target.value)}
                      placeholder="Recently renovated, great schools, quiet neighborhood..."
                      rows="3"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="localMarket">Local Market Information:</label>
                    <textarea
                      id="localMarket"
                      value={localMarket}
                      onChange={(e) => setLocalMarket(e.target.value)}
                      placeholder="Market trends, neighborhood info, nearby amenities..."
                      rows="3"
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h3>Agent Information</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="agentName">Agent Name:</label>
                      <input
                        type="text"
                        id="agentName"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="agentPhone">Phone:</label>
                      <input
                        type="tel"
                        id="agentPhone"
                        value={agentPhone}
                        onChange={(e) => setAgentPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="agentEmail">Email:</label>
                      <input
                        type="email"
                        id="agentEmail"
                        value={agentEmail}
                        onChange={(e) => setAgentEmail(e.target.value)}
                        placeholder="john@realty.com"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="brokerageName">Brokerage:</label>
                      <input
                        type="text"
                        id="brokerageName"
                        value={brokerageName}
                        onChange={(e) => setBrokerageName(e.target.value)}
                        placeholder="ABC Realty"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={clearForm} className="clear-btn">
                    Clear Form
                  </button>
                  <button type="submit" disabled={isGenerating} className="generate-btn">
                    {isGenerating ? 'Generating...' : 'Generate Content'}
                  </button>
                </div>
              </form>
            </div>

            {generatedContent && (
              <div className="content-container">
                <h2>Generated Content</h2>
                <div className="generated-content">
                  <pre>{generatedContent}</pre>
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText(generatedContent)}
                  className="copy-btn"
                >
                  Copy to Clipboard
                </button>
              </div>
            )}
          </div>
        )}

        {currentView === 'history' && user && (
          <div className="history-view">
            <div className="history-header">
              <h2>Content History</h2>
              <div className="history-controls">
                <input
                  type="text"
                  placeholder="Search by address or agent..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
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

            {historyLoading ? (
              <div className="loading">Loading history...</div>
            ) : (
              <div className="history-list">
                {filteredHistory.length === 0 ? (
                  <p>No content generated yet.</p>
                ) : (
                  filteredHistory.map((item) => (
                    <div key={item.id} className="history-item">
                      <div className="history-meta">
                        <h3>{item.address}</h3>
                        <span className="history-date">
                          {item.timestamp?.toDate?.()?.toLocaleDateString() || 'Recent'}
                        </span>
                      </div>
                      <div className="history-details">
                        <span className="property-type">{item.propertyType}</span>
                        <span className="agent-name">{item.agentName}</span>
                      </div>
                      <div className="history-content">
                        <pre>{item.content}</pre>
                      </div>
                      <button 
                        onClick={() => navigator.clipboard.writeText(item.content)}
                        className="copy-btn"
                      >
                        Copy
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {currentView === 'account' && user && (
          <div className="account-view">
            <h2>Account Dashboard</h2>
            
            {accountLoading ? (
              <div className="loading">Loading account data...</div>
            ) : (
              <div className="account-content">
                <div className="account-info">
                  <div className="info-card">
                    <h3>Account Information</h3>
                    <div className="info-item">
                      <span className="info-label">Email:</span>
                      <span className="info-value">{user.email}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Account Type:</span>
                      <span className="info-value">{accountData.accountType}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Status:</span>
                      <span className={`status ${accountData.subscriptionStatus}`}>
                        {accountData.subscriptionStatus}
                      </span>
                    </div>
                  </div>

                  <div className="info-card">
                    <h3>Usage Statistics</h3>
                    <div className="info-item">
                      <span className="info-label">Generations Used:</span>
                      <span className="info-value">{accountData.usageCount}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Usage Limit:</span>
                      <span className="info-value">{accountData.usageLimit}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Remaining Credits:</span>
                      <span className="info-value">{accountData.remainingCredits}</span>
                    </div>
                  </div>

                  {accountData.hasActiveSubscription && (
                    <div className="info-card">
                      <h3>Subscription Details</h3>
                      {accountData.billingPeriod && (
                        <div className="info-item">
                          <span className="info-label">Billing Period:</span>
                          <span className="info-value">
                            {new Date(accountData.billingPeriod.start).toLocaleDateString()} - 
                            {new Date(accountData.billingPeriod.end).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {accountData.cancelAtPeriodEnd && (
                        <div className="info-item">
                          <span className="info-label">Status:</span>
                          <span className="info-value cancelling">Cancels at period end</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="account-actions">
                  {accountData.hasActiveSubscription ? (
                    <button onClick={handleManageSubscription} className="manage-subscription-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                      </svg>
                      Manage Subscription
                    </button>
                  ) : (
                    <div className="upgrade-options">
                      <h3>Upgrade Your Plan</h3>
                      <div className="upgrade-plans">
                        <div className="plan-card">
                          <h4>Professional Plan</h4>
                          <p className="plan-price">$49/month</p>
                          <ul className="plan-features">
                            <li>Unlimited content generation</li>
                            <li>Advanced property analysis</li>
                            <li>Priority support</li>
                          </ul>
                          <button 
                            onClick={() => handleUpgrade('price_1RxaJb4F171I65zZX74WoXNK')}
                            className="upgrade-btn professional"
                          >
                            Upgrade to Professional
                          </button>
                        </div>
                        
                        <div className="plan-card featured">
                          <h4>Agency Plan</h4>
                          <p className="plan-price">$99/month</p>
                          <ul className="plan-features">
                            <li>Everything in Professional</li>
                            <li>Multi-agent support</li>
                            <li>Team collaboration tools</li>
                            <li>API access</li>
                          </ul>
                          <button 
                            onClick={() => handleUpgrade('price_1RxaKC4F171I65zZmhLiCcZF')}
                            className="upgrade-btn agency"
                          >
                            Upgrade to Agency
                          </button>
                        </div>
                      </div>
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
            <button onClick={() => setShowAuthModal(true)} className="login-btn">
              Login / Sign Up
            </button>
          </div>
        )}
      </main>

      {showAuthModal && (
        <div className="modal-overlay">
          <div className="auth-modal">
            <div className="modal-header">
              <h2>{authMode === 'login' ? 'Login' : 'Sign Up'}</h2>
              <button 
                onClick={() => setShowAuthModal(false)} 
                className="close-btn"
              >
                ×
              </button>
            </div>
            
            <AuthForm 
              mode={authMode}
              onSubmit={authMode === 'login' ? handleLogin : handleSignUp}
              error={authError}
            />
            
            <div className="auth-switch">
              <p>
                {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="switch-btn"
                >
                  {authMode === 'login' ? 'Sign Up' : 'Login'}
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
      {error && <div className="error-message">{error}</div>}
      
      <div className="form-group">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <div className="form-group">
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      
      <button type="submit" className="auth-submit-btn">
        {mode === 'login' ? 'Login' : 'Sign Up'}
      </button>
    </form>
  );
}

export default App;
