import React, { useState, useEffect } from 'react';
import './App.css';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, getDocs, limit } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCiReYUfXyDlhMY30KwInNNHzlWQ_dNl9g",
  authDomain: "appraisalstudio.firebaseapp.com",
  projectId: "appraisalstudio",
  storageBucket: "appraisalstudio.appspot.com",
  messagingSenderId: "1079213330951",
  appId: "1:1079213330951:web:6ad1c2e7b2fc5c0b7f9c8e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function App() {
  // Authentication state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [authError, setAuthError] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Recent Properties state
  const [recentProperties, setRecentProperties] = useState([]);
  const [showRecentProperties, setShowRecentProperties] = useState(false);
  const [recentPropertiesLoading, setRecentPropertiesLoading] = useState(false);

  // Form data state
  const [propertyData, setPropertyData] = useState({
    address: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    features: '',
    propertyType: '',
    yearBuilt: '',
    parking: '',
    condition: '',
    lotSize: '',
    neighborhood: '',
    schoolDistrict: '',
    specialFeatures: {
      pool: false,
      fireplace: false,
      hardwoodFloors: false,
      updatedKitchen: false,
      newRoof: false,
      energyEfficient: false,
      gourmetKitchen: false,
      masterSuite: false,
      walkInCloset: false,
      deck: false,
      patio: false,
      fencedYard: false,
      twoCarGarage: false,
      basement: false,
      attic: false,
      laundryRoom: false
    }
  });

  const [agentData, setAgentData] = useState({
    name: '',
    phone: '',
    email: '',
    brokerage: ''
  });

  // UI state
  const [contentType, setContentType] = useState('property_description');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [showAgentFields, setShowAgentFields] = useState(false);
  const [currentView, setCurrentView] = useState('generator');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Content history state
  const [contentHistory, setContentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Account state
  const [usageStats, setUsageStats] = useState({
    totalGenerations: 0,
    thisMonth: 0,
    remainingCredits: 1000
  });

  // Authentication effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
      if (user && currentView === 'generator') {
        loadRecentProperties();
      }
    });

    return () => unsubscribe();
  }, [currentView]);

  // Load recent properties
  const loadRecentProperties = async () => {
    if (!user) return;
    
    setRecentPropertiesLoading(true);
    try {
      const response = await fetch('/api/recent-properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (response.ok) {
        const properties = await response.json();
        setRecentProperties(properties);
      }
    } catch (error) {
      console.error('Error loading recent properties:', error);
    } finally {
      setRecentPropertiesLoading(false);
    }
  };

  // Handle property selection from recent properties
  const handlePropertySelect = (property) => {
    setPropertyData({
      ...propertyData,
      ...property.propertyData
    });
    setShowRecentProperties(false);
  };

  // Clear form
  const handleClearForm = () => {
    setPropertyData({
      address: '',
      price: '',
      bedrooms: '',
      bathrooms: '',
      sqft: '',
      features: '',
      propertyType: '',
      yearBuilt: '',
      parking: '',
      condition: '',
      lotSize: '',
      neighborhood: '',
      schoolDistrict: '',
      specialFeatures: {
        pool: false,
        fireplace: false,
        hardwoodFloors: false,
        updatedKitchen: false,
        newRoof: false,
        energyEfficient: false,
        gourmetKitchen: false,
        masterSuite: false,
        walkInCloset: false,
        deck: false,
        patio: false,
        fencedYard: false,
        twoCarGarage: false,
        basement: false,
        attic: false,
        laundryRoom: false
      }
    });
    setShowRecentProperties(false);
  };

  // Content history effect
  useEffect(() => {
    if (user && currentView === 'history') {
      loadContentHistory();
    }
  }, [user, currentView]);

  // Account stats effect
  useEffect(() => {
    if (user && currentView === 'account') {
      loadUsageStats();
    }
  }, [user, currentView]);

  const loadContentHistory = async () => {
    setHistoryLoading(true);
    try {
      const q = query(
        collection(db, 'generations'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const history = [];
        querySnapshot.forEach((doc) => {
          history.push({ id: doc.id, ...doc.data() });
        });
        setContentHistory(history);
        setHistoryLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading content history:', error);
      setHistoryLoading(false);
    }
  };

  const loadUsageStats = async () => {
    try {
      const q = query(
        collection(db, 'generations'),
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const totalGenerations = querySnapshot.size;
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      let thisMonth = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.timestamp && data.timestamp.toDate) {
          const date = data.timestamp.toDate();
          if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            thisMonth++;
          }
        }
      });

      setUsageStats({
        totalGenerations,
        thisMonth,
        remainingCredits: Math.max(0, 1000 - totalGenerations)
      });
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('specialFeatures.')) {
      const featureName = name.replace('specialFeatures.', '');
      setPropertyData(prev => ({
        ...prev,
        specialFeatures: {
          ...prev.specialFeatures,
          [featureName]: checked
        }
      }));
    } else if (name.startsWith('agent.')) {
      const agentField = name.replace('agent.', '');
      setAgentData(prev => ({
        ...prev,
        [agentField]: value
      }));
    } else {
      setPropertyData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateForm = () => {
    if (!propertyData.address.trim()) {
      setError('Property address is required');
      return false;
    }
    if (!propertyData.price.trim()) {
      setError('Property price is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    try {
      const requestData = {
        propertyData,
        agentData,
        contentType,
        userId: user.uid,
        userEmail: user.email
      };

      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data.content);
        // Refresh recent properties after successful generation
        loadRecentProperties();
      } else {
        if (response.status === 429) {
          setShowUpgradeModal(true);
        } else {
          setError(data.error || 'An error occurred while generating content');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (email, password, mode) => {
    setAuthError('');
    setAuthLoading(true);

    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        setResetEmailSent(true);
        return;
      }
      setShowAuthModal(false);
      setAuthMode('signin');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentView('generator');
      setContentHistory([]);
      setUsageStats({ totalGenerations: 0, thisMonth: 0, remainingCredits: 1000 });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getContentTypeLabel = (type) => {
    const labels = {
      'property_description': 'Property Description',
      'just_listed': 'Just Listed Post',
      'open_house': 'Open House Invitation',
      'price_drop': 'Price Drop Alert',
      'sold_post': 'Sold Post',
      'coming_soon': 'Coming Soon Post',
      'agent_bio': 'Agent Bio',
      'market_update': 'Market Update',
      'buyer_guide': 'Buyer Guide',
      'seller_guide': 'Seller Guide'
    };
    return labels[type] || type;
  };

  const filteredHistory = contentHistory.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.propertyData?.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || item.contentType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading AppraisalStudio...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="logo-text">AppraisalStudio</span>
            </div>
          </div>
          
          <div className="header-right">
            {user ? (
              <>
                <nav className="nav-menu">
                  <button 
                    className={`nav-button ${currentView === 'generator' ? 'active' : ''}`}
                    onClick={() => setCurrentView('generator')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.828 14.828L21 21M16.5 10.5C16.5 13.8137 13.8137 16.5 10.5 16.5C7.18629 16.5 4.5 13.8137 4.5 10.5C4.5 7.18629 7.18629 4.5 10.5 4.5C13.8137 4.5 16.5 7.18629 16.5 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Generate
                  </button>
                  <button 
                    className={`nav-button ${currentView === 'history' ? 'active' : ''}`}
                    onClick={() => setCurrentView('history')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 8H18M6 12H18M6 16H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    History
                  </button>
                  <button 
                    className={`nav-button ${currentView === 'account' ? 'active' : ''}`}
                    onClick={() => setCurrentView('account')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Account
                  </button>
                </nav>
                <button className="sign-out-button" onClick={handleSignOut}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Sign Out
                </button>
              </>
            ) : (
              <button className="sign-in-button" onClick={() => setShowAuthModal(true)}>
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {user ? (
          <>
            {/* Generator View */}
            {currentView === 'generator' && (
              <div className="generator-section">
                <div className="hero-section">
                  <h1 className="hero-title">AI-Powered Real Estate Content</h1>
                  <p className="hero-subtitle">
                    Generate professional property descriptions, social media posts, and marketing content in seconds
                  </p>
                </div>

                {/* Generator Form Section */}
                <div className="form-section">
                  <div className="form-card">
                    <div className="form-header">
                      <div className="form-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <h2>Property Details</h2>
                        <p>Enter your property information to generate professional content</p>
                      </div>
                    </div>

                    {/* Recent Properties Section */}
                    {recentProperties.length > 0 && (
                      <div className="recent-properties-section">
                        <button 
                          className="recent-properties-toggle"
                          onClick={() => setShowRecentProperties(!showRecentProperties)}
                          disabled={recentPropertiesLoading}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>Recent Properties</span>
                          <span className="recent-properties-count">{recentProperties.length}</span>
                          <svg 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                            className={`chevron ${showRecentProperties ? 'expanded' : ''}`}
                          >
                            <polyline points="6,9 12,15 18,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>

                        {showRecentProperties && (
                          <div className="recent-properties-dropdown">
                            {recentPropertiesLoading ? (
                              <div className="recent-properties-loading">
                                <div className="loading-spinner small"></div>
                                <span>Loading recent properties...</span>
                              </div>
                            ) : (
                              <>
                                {recentProperties.map((property, index) => (
                                  <button
                                    key={index}
                                    className="recent-property-item"
                                    onClick={() => handlePropertySelect(property)}
                                  >
                                    <div className="property-address">{property.propertyData.address}</div>
                                    <div className="property-details">
                                      {property.propertyData.bedrooms && property.propertyData.bathrooms && (
                                        <span>{property.propertyData.bedrooms}BR/{property.propertyData.bathrooms}BA</span>
                                      )}
                                      {property.propertyData.propertyType && (
                                        <span>{property.propertyData.propertyType}</span>
                                      )}
                                      {property.propertyData.price && (
                                        <span className="property-price">{property.propertyData.price}</span>
                                      )}
                                    </div>
                                  </button>
                                ))}
                                <button 
                                  className="clear-form-button"
                                  onClick={handleClearForm}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  Clear Form - Start Fresh
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <form onSubmit={handleSubmit}>
                      <div className="form-grid">
                        {/* Required Fields */}
                        <div className="input-group required">
                          <label htmlFor="address">Property Address *</label>
                          <input
                            type="text"
                            id="address"
                            name="address"
                            value={propertyData.address}
                            onChange={handleInputChange}
                            placeholder="123 Main Street, Columbus, OH 43215"
                            className="enhanced-input"
                            required
                          />
                        </div>

                        <div className="input-group required">
                          <label htmlFor="price">Price *</label>
                          <input
                            type="text"
                            id="price"
                            name="price"
                            value={propertyData.price}
                            onChange={handleInputChange}
                            placeholder="$450,000"
                            className="enhanced-input"
                            required
                          />
                        </div>

                        <div className="input-row">
                          <div className="input-group">
                            <label htmlFor="bedrooms">Bedrooms</label>
                            <select
                              id="bedrooms"
                              name="bedrooms"
                              value={propertyData.bedrooms}
                              onChange={handleInputChange}
                              className="enhanced-input"
                            >
                              <option value="">Select</option>
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="3">3</option>
                              <option value="4">4</option>
                              <option value="5">5</option>
                              <option value="6+">6+</option>
                            </select>
                          </div>

                          <div className="input-group">
                            <label htmlFor="bathrooms">Bathrooms</label>
                            <select
                              id="bathrooms"
                              name="bathrooms"
                              value={propertyData.bathrooms}
                              onChange={handleInputChange}
                              className="enhanced-input"
                            >
                              <option value="">Select</option>
                              <option value="1">1</option>
                              <option value="1.5">1.5</option>
                              <option value="2">2</option>
                              <option value="2.5">2.5</option>
                              <option value="3">3</option>
                              <option value="3.5">3.5</option>
                              <option value="4+">4+</option>
                            </select>
                          </div>
                        </div>

                        <div className="input-group">
                          <label htmlFor="sqft">Square Footage</label>
                          <input
                            type="text"
                            id="sqft"
                            name="sqft"
                            value={propertyData.sqft}
                            onChange={handleInputChange}
                            placeholder="2,400"
                            className="enhanced-input"
                          />
                        </div>

                        <div className="input-group">
                          <label htmlFor="features">Key Features</label>
                          <textarea
                            id="features"
                            name="features"
                            value={propertyData.features}
                            onChange={handleInputChange}
                            placeholder="Open floor plan, updated kitchen, large backyard..."
                            className="enhanced-input"
                            rows="3"
                          />
                        </div>

                        {/* Optional Fields Toggle */}
                        <div className="optional-fields-toggle">
                          <button
                            type="button"
                            className="toggle-button"
                            onClick={() => setShowOptionalFields(!showOptionalFields)}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                              <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.2573 9.77251 19.9887C9.5799 19.7201 9.31074 19.5176 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.74269 9.96512 4.01133 9.77251C4.27998 9.5799 4.48244 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Additional Details
                            <svg 
                              width="16" 
                              height="16" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              xmlns="http://www.w3.org/2000/svg"
                              className={`chevron ${showOptionalFields ? 'expanded' : ''}`}
                            >
                              <polyline points="6,9 12,15 18,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>

                        {/* Optional Fields */}
                        {showOptionalFields && (
                          <div className="optional-fields">
                            <div className="input-row">
                              <div className="input-group">
                                <label htmlFor="propertyType">Property Type</label>
                                <select
                                  id="propertyType"
                                  name="propertyType"
                                  value={propertyData.propertyType}
                                  onChange={handleInputChange}
                                  className="enhanced-input"
                                >
                                  <option value="">Select Type</option>
                                  <option value="Single Family">Single Family</option>
                                  <option value="Townhouse">Townhouse</option>
                                  <option value="Condo">Condo</option>
                                  <option value="Multi-Family">Multi-Family</option>
                                  <option value="Land">Land</option>
                                  <option value="Commercial">Commercial</option>
                                </select>
                              </div>

                              <div className="input-group">
                                <label htmlFor="yearBuilt">Year Built</label>
                                <input
                                  type="text"
                                  id="yearBuilt"
                                  name="yearBuilt"
                                  value={propertyData.yearBuilt}
                                  onChange={handleInputChange}
                                  placeholder="2018"
                                  className="enhanced-input"
                                />
                              </div>
                            </div>

                            <div className="input-row">
                              <div className="input-group">
                                <label htmlFor="parking">Parking</label>
                                <select
                                  id="parking"
                                  name="parking"
                                  value={propertyData.parking}
                                  onChange={handleInputChange}
                                  className="enhanced-input"
                                >
                                  <option value="">Select Parking</option>
                                  <option value="None">None</option>
                                  <option value="Street">Street</option>
                                  <option value="Driveway">Driveway</option>
                                  <option value="1-Car Garage">1-Car Garage</option>
                                  <option value="2-Car Garage">2-Car Garage</option>
                                  <option value="3+ Car Garage">3+ Car Garage</option>
                                </select>
                              </div>

                              <div className="input-group">
                                <label htmlFor="condition">Condition</label>
                                <select
                                  id="condition"
                                  name="condition"
                                  value={propertyData.condition}
                                  onChange={handleInputChange}
                                  className="enhanced-input"
                                >
                                  <option value="">Select Condition</option>
                                  <option value="New">New</option>
                                  <option value="Excellent">Excellent</option>
                                  <option value="Good">Good</option>
                                  <option value="Fair">Fair</option>
                                  <option value="Needs Updates">Needs Updates</option>
                                </select>
                              </div>
                            </div>

                            <div className="input-row">
                              <div className="input-group">
                                <label htmlFor="lotSize">Lot Size</label>
                                <input
                                  type="text"
                                  id="lotSize"
                                  name="lotSize"
                                  value={propertyData.lotSize}
                                  onChange={handleInputChange}
                                  placeholder="0.25 acres"
                                  className="enhanced-input"
                                />
                              </div>

                              <div className="input-group">
                                <label htmlFor="neighborhood">Neighborhood</label>
                                <input
                                  type="text"
                                  id="neighborhood"
                                  name="neighborhood"
                                  value={propertyData.neighborhood}
                                  onChange={handleInputChange}
                                  placeholder="German Village"
                                  className="enhanced-input"
                                />
                              </div>
                            </div>

                            <div className="input-group">
                              <label htmlFor="schoolDistrict">School District</label>
                              <input
                                type="text"
                                id="schoolDistrict"
                                name="schoolDistrict"
                                value={propertyData.schoolDistrict}
                                onChange={handleInputChange}
                                placeholder="Columbus City Schools"
                                className="enhanced-input"
                              />
                            </div>

                            {/* Special Features */}
                            <div className="special-features">
                              <label className="section-label">Special Features</label>
                              <div className="checkbox-grid">
                                {Object.entries(propertyData.specialFeatures).map(([feature, checked]) => (
                                  <label key={feature} className="checkbox-item">
                                    <input
                                      type="checkbox"
                                      name={`specialFeatures.${feature}`}
                                      checked={checked}
                                      onChange={handleInputChange}
                                    />
                                    <span className="checkbox-label">
                                      {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Agent Details Toggle */}
                        <div className="optional-fields-toggle">
                          <button
                            type="button"
                            className="toggle-button"
                            onClick={() => setShowAgentFields(!showAgentFields)}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Agent Information
                            <svg 
                              width="16" 
                              height="16" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              xmlns="http://www.w3.org/2000/svg"
                              className={`chevron ${showAgentFields ? 'expanded' : ''}`}
                            >
                              <polyline points="6,9 12,15 18,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>

                        {/* Agent Fields */}
                        {showAgentFields && (
                          <div className="agent-fields">
                            <div className="input-row">
                              <div className="input-group">
                                <label htmlFor="agentName">Agent Name</label>
                                <input
                                  type="text"
                                  id="agentName"
                                  name="agent.name"
                                  value={agentData.name}
                                  onChange={handleInputChange}
                                  placeholder="John Smith"
                                  className="enhanced-input"
                                />
                              </div>

                              <div className="input-group">
                                <label htmlFor="agentPhone">Phone</label>
                                <input
                                  type="text"
                                  id="agentPhone"
                                  name="agent.phone"
                                  value={agentData.phone}
                                  onChange={handleInputChange}
                                  placeholder="(614) 555-0123"
                                  className="enhanced-input"
                                />
                              </div>
                            </div>

                            <div className="input-row">
                              <div className="input-group">
                                <label htmlFor="agentEmail">Email</label>
                                <input
                                  type="email"
                                  id="agentEmail"
                                  name="agent.email"
                                  value={agentData.email}
                                  onChange={handleInputChange}
                                  placeholder="john@realty.com"
                                  className="enhanced-input"
                                />
                              </div>

                              <div className="input-group">
                                <label htmlFor="agentBrokerage">Brokerage</label>
                                <input
                                  type="text"
                                  id="agentBrokerage"
                                  name="agent.brokerage"
                                  value={agentData.brokerage}
                                  onChange={handleInputChange}
                                  placeholder="ABC Realty"
                                  className="enhanced-input"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Content Type Selection */}
                        <div className="content-type-section">
                          <label className="section-label">Content Type</label>
                          <div className="content-type-grid">
                            {[
                              { value: 'property_description', label: 'Property Description', icon: '🏠' },
                              { value: 'just_listed', label: 'Just Listed Post', icon: '🎉' },
                              { value: 'open_house', label: 'Open House Invitation', icon: '🚪' },
                              { value: 'price_drop', label: 'Price Drop Alert', icon: '💰' },
                              { value: 'sold_post', label: 'Sold Post', icon: '✅' },
                              { value: 'coming_soon', label: 'Coming Soon Post', icon: '⏰' }
                            ].map((type) => (
                              <label key={type.value} className={`content-type-option ${contentType === type.value ? 'selected' : ''}`}>
                                <input
                                  type="radio"
                                  name="contentType"
                                  value={type.value}
                                  checked={contentType === type.value}
                                  onChange={(e) => setContentType(e.target.value)}
                                />
                                <span className="content-type-icon">{type.icon}</span>
                                <span className="content-type-label">{type.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Submit Button */}
                        <button 
                          type="submit" 
                          disabled={loading}
                          className="generate-button"
                        >
                          {loading ? (
                            <>
                              <div className="loading-spinner"></div>
                              Generating...
                            </>
                          ) : (
                            <>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Generate Content
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="error-message">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      {error}
                    </div>
                  )}

                  {/* Result Display */}
                  {result && (
                    <div className="result-section">
                      <div className="result-header">
                        <h3>Generated Content</h3>
                        <button 
                          className="copy-button"
                          onClick={() => copyToClipboard(result)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                            <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          Copy
                        </button>
                      </div>
                      <div className="result-content">
                        {result}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* History View */}
            {currentView === 'history' && (
              <div className="history-section">
                <div className="history-header">
                  <h1>Content History</h1>
                  <p>View and manage your generated content</p>
                </div>

                {/* Search and Filter Controls */}
                <div className="history-controls">
                  <div className="search-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                      <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2"/>
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
                      <option value="property_description">Property Descriptions</option>
                      <option value="just_listed">Just Listed Posts</option>
                      <option value="open_house">Open House Invitations</option>
                      <option value="price_drop">Price Drop Alerts</option>
                      <option value="sold_post">Sold Posts</option>
                      <option value="coming_soon">Coming Soon Posts</option>
                    </select>
                  </div>
                </div>

                {/* History Content */}
                <div className="history-content">
                  {historyLoading ? (
                    <div className="loading-state">
                      <div className="loading-spinner"></div>
                      <p>Loading your content history...</p>
                    </div>
                  ) : filteredHistory.length === 0 ? (
                    <div className="empty-state">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <h3>No content found</h3>
                      <p>{contentHistory.length === 0 ? 'Generate your first piece of content to see it here!' : 'No content matches your search criteria.'}</p>
                      {contentHistory.length === 0 && (
                        <button 
                          className="cta-button"
                          onClick={() => setCurrentView('generator')}
                        >
                          Create Content
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="history-grid">
                      {filteredHistory.map((item) => (
                        <div key={item.id} className="history-item">
                          <div className="history-item-header">
                            <div className="content-type-badge">
                              {getContentTypeLabel(item.contentType)}
                            </div>
                            <div className="history-item-date">
                              {formatDate(item.timestamp)}
                            </div>
                          </div>
                          
                          <div className="history-item-property">
                            <h4>{item.propertyData?.address || 'No address provided'}</h4>
                            <div className="property-meta">
                              {item.propertyData?.bedrooms && item.propertyData?.bathrooms && (
                                <span>{item.propertyData.bedrooms}BR/{item.propertyData.bathrooms}BA</span>
                              )}
                              {item.propertyData?.price && (
                                <span>{item.propertyData.price}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="history-item-content">
                            <p>{item.content?.substring(0, 200)}...</p>
                          </div>
                          
                          <div className="history-item-actions">
                            <button 
                              className="action-button copy"
                              onClick={() => copyToClipboard(item.content)}
                              title="Copy content"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                                <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="currentColor" strokeWidth="2"/>
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

            {/* Account View */}
            {currentView === 'account' && (
              <div className="account-section">
                <div className="account-header">
                  <h1>Account Dashboard</h1>
                  <p>Manage your AppraisalStudio account and usage</p>
                </div>

                <div className="account-grid">
                  {/* Account Info */}
                  <div className="account-card">
                    <div className="card-header">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <h3>Account Information</h3>
                    </div>
                    <div className="account-info">
                      <div className="info-item">
                        <span className="info-label">Email</span>
                        <span className="info-value">{user?.email}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Account Type</span>
                        <span className="info-value">Free Plan</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Member Since</span>
                        <span className="info-value">
                          {user?.metadata?.creationTime ? 
                            new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            }) : 'Unknown'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div className="account-card">
                    <div className="card-header">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <h3>Usage Statistics</h3>
                    </div>
                    <div className="usage-stats">
                      <div className="stat-item">
                        <div className="stat-number">{usageStats.totalGenerations}</div>
                        <div className="stat-label">Total Generated</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-number">{usageStats.thisMonth}</div>
                        <div className="stat-label">This Month</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-number">{usageStats.remainingCredits}</div>
                        <div className="stat-label">Credits Remaining</div>
                      </div>
                    </div>
                    
                    {usageStats.remainingCredits < 100 && (
                      <div className="usage-warning">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10.29 3.86L1.82 18C1.64466 18.3024 1.55611 18.6453 1.56331 18.9928C1.57051 19.3402 1.67328 19.6798 1.86077 19.9764C2.04826 20.2729 2.31374 20.5152 2.62698 20.676C2.94023 20.8367 3.28845 20.9102 3.64 20.89H20.36C20.7116 20.9102 21.0598 20.8367 21.373 20.676C21.6863 20.5152 21.9517 20.2729 22.1392 19.9764C22.3267 19.6798 22.4295 19.3402 22.4367 18.9928C22.4439 18.6453 22.3553 18.3024 22.18 18L13.71 3.86C13.5317 3.56611 13.2807 3.32312 12.9812 3.15133C12.6817 2.97954 12.3438 2.88477 12 2.88477C11.6562 2.88477 11.3183 2.97954 11.0188 3.15133C10.7193 3.32312 10.4683 3.56611 10.29 3.86V3.86Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        You're running low on credits. Consider upgrading to continue generating content.
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="account-card">
                    <div className="card-header">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                        <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.2573 9.77251 19.9887C9.5799 19.7201 9.31074 19.5176 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.74269 9.96512 4.01133 9.77251C4.27998 9.5799 4.48244 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.87653 6.85425 4.02405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <h3>Quick Actions</h3>
                    </div>
                    <div className="quick-actions">
                      <button 
                        className="action-btn primary"
                        onClick={() => setCurrentView('generator')}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Generate Content
                      </button>
                      
                      <button 
                        className="action-btn secondary"
                        onClick={() => setCurrentView('history')}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6 8H18M6 12H18M6 16H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        View History
                      </button>
                      
                      <button 
                        className="action-btn upgrade"
                        onClick={() => setShowUpgradeModal(true)}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="17,6 23,6 23,12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Upgrade Plan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Welcome Section for Non-Authenticated Users */
          <div className="welcome-section">
            <div className="hero-section">
              <h1 className="hero-title">AI-Powered Real Estate Content</h1>
              <p className="hero-subtitle">
                Generate professional property descriptions, social media posts, and marketing content in seconds
              </p>
              <button className="cta-button" onClick={() => setShowAuthModal(true)}>
                Get Started Free
              </button>
            </div>

            <div className="features-section">
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3>Property Descriptions</h3>
                  <p>Create compelling property descriptions that highlight key features and attract potential buyers.</p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                      <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2"/>
                      <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <h3>Social Media Posts</h3>
                  <p>Generate engaging social media content for Facebook, Instagram, and LinkedIn to showcase your listings.</p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3>Lightning Fast</h3>
                  <p>Generate professional content in seconds, not hours. Save time and focus on what matters most.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {authMode === 'signin' && 'Sign In to AppraisalStudio'}
                {authMode === 'signup' && 'Create Your Account'}
                {authMode === 'reset' && 'Reset Password'}
              </h2>
              <button 
                className="modal-close"
                onClick={() => setShowAuthModal(false)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <AuthModal
              mode={authMode}
              onAuth={handleAuth}
              onModeChange={setAuthMode}
              loading={authLoading}
              error={authError}
              resetEmailSent={resetEmailSent}
            />
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
    </div>
  );
}

// Auth Modal Component
function AuthModal({ mode, onAuth, onModeChange, loading, error, resetEmailSent }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAuth(email, password, mode);
  };

  if (resetEmailSent) {
    return (
      <div className="auth-form">
        <div className="reset-success">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4874 2.02168 11.3363C2.16356 9.18616 2.99721 7.13827 4.39828 5.49707C5.79935 3.85587 7.69279 2.71067 9.79619 2.24259C11.8996 1.77451 14.1003 1.98979 16.07 2.86" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3>Check Your Email</h3>
          <p>We've sent a password reset link to {email}</p>
          <button 
            className="auth-submit-btn"
            onClick={() => onModeChange('signin')}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error && (
        <div className="auth-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
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
          placeholder="Enter your email"
          required
        />
      </div>

      {mode !== 'reset' && (
        <div className="auth-input-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>
      )}

      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {loading ? (
          <>
            <div className="loading-spinner"></div>
            {mode === 'signin' && 'Signing In...'}
            {mode === 'signup' && 'Creating Account...'}
            {mode === 'reset' && 'Sending Reset Link...'}
          </>
        ) : (
          <>
            {mode === 'signin' && 'Sign In'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'reset' && 'Send Reset Link'}
          </>
        )}
      </button>

      <div className="auth-links">
        {mode === 'signin' && (
          <>
            <button type="button" onClick={() => onModeChange('reset')}>
              Forgot your password?
            </button>
            <p>
              Don't have an account?{' '}
              <button type="button" onClick={() => onModeChange('signup')}>
                Sign up
              </button>
            </p>
          </>
        )}
        
        {mode === 'signup' && (
          <p>
            Already have an account?{' '}
            <button type="button" onClick={() => onModeChange('signin')}>
              Sign in
            </button>
          </p>
        )}
        
        {mode === 'reset' && (
          <p>
            Remember your password?{' '}
            <button type="button" onClick={() => onModeChange('signin')}>
              Back to sign in
            </button>
          </p>
        )}
      </div>
    </form>
  );
}

// Upgrade Modal Component
function UpgradeModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upgrade to Pro</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="upgrade-content">
          <div className="upgrade-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="17,6 23,6 23,12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <h3>You've reached your generation limit</h3>
          <p>Upgrade to Pro to continue generating unlimited content for your real estate business.</p>
          
          <div className="upgrade-features">
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polyline points="20,6 9,17 4,12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Unlimited content generation</span>
            </div>
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polyline points="20,6 9,17 4,12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Priority customer support</span>
            </div>
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polyline points="20,6 9,17 4,12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Advanced content templates</span>
            </div>
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polyline points="20,6 9,17 4,12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Bulk content generation</span>
            </div>
          </div>
          
          <div className="upgrade-pricing">
            <div className="price">
              <span className="price-amount">$29</span>
              <span className="price-period">/month</span>
            </div>
            <p>Cancel anytime. No long-term commitments.</p>
          </div>
          
          <div className="upgrade-actions">
            <button className="upgrade-btn primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17,6 23,6 23,12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Upgrade to Pro
            </button>
            <button className="upgrade-btn secondary" onClick={onClose}>
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
