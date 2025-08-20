import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { useFirebase } from './firebase/FirebaseContext';

function App() {
  // Firebase integration
  const { 
    user, 
    userProfile, 
    loading: authLoading, 
    canGenerate, 
    getRemainingGenerations,
    trackGeneration,
    signOut
  } = useFirebase();

  // Enhanced state management with URL navigation
  const getInitialSection = () => {
    const hash = window.location.hash.replace('#', '');
    // Only allow valid sections, default to 'home'
    const validSections = ['home', 'history', 'account', 'how-it-works', 'pricing', 'faq'];
    return validSections.includes(hash) ? hash : 'home';
  };

  const [currentSection, setCurrentSection] = useState(getInitialSection);
  const [propertyData, setPropertyData] = useState({
    address: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    features: '',
    propertyType: 'Single Family Home',
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
      masterSuite: false,
      walkInCloset: false,
      centralAir: false,
      newAppliances: false,
      fencedYard: false,
      deck: false,
      basement: false,
      attic: false
    }
  });
  
  const [contentType, setContentType] = useState('description');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [notification, setNotification] = useState(null);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isFormValid, setIsFormValid] = useState(false);
  const [generationHistory, setGenerationHistory] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  
  // Content History State
  const [contentHistory, setContentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyContentType, setHistoryContentType] = useState('all');

  // Recent Properties State
  const [recentProperties, setRecentProperties] = useState([]);
  const [recentPropertiesLoading, setRecentPropertiesLoading] = useState(false);
  const [showRecentProperties, setShowRecentProperties] = useState(false);
  
  const headerRef = useRef(null);
  const formRef = useRef(null);

  // Navigation items - conditional based on authentication
  const unauthenticatedNavigationItems = [
    { id: 'home', label: 'Home', href: '#home' },
    { id: 'how-it-works', label: 'How It Works', href: '#how-it-works' },
    { id: 'pricing', label: 'Pricing', href: '#pricing' },
    { id: 'faq', label: 'FAQ', href: '#faq' },
  ];

  // Updated authenticated navigation with separate History section
  const authenticatedNavigationItems = [
    { id: 'home', label: 'Generate', href: '#home' },
    { id: 'history', label: 'History', href: '#history' },
    { id: 'account', label: 'Account', href: '#account' },
  ];

  // Use the appropriate navigation based on authentication
  const navigationItems = user ? authenticatedNavigationItems : unauthenticatedNavigationItems;

  // Enhanced content types with premium styling
  const contentTypes = [
    {
      id: 'description',
      name: 'Property Description',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
      ),
      description: 'Professional MLS & marketing descriptions',
      gradient: 'from-primary-500 via-primary-600 to-primary-700',
      accentColor: 'var(--primary-500)',
      estimatedTime: '15-30s'
    },
    {
      id: 'social_listing',
      name: 'Social Media Post',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      ),
      description: 'Facebook & Instagram announcements',
      gradient: 'from-accent-purple via-purple-500 to-purple-600',
      accentColor: 'var(--accent-purple)',
      estimatedTime: '10-20s'
    },
    {
      id: 'email_alert',
      name: 'Email Template',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
      description: 'Professional client communications',
      gradient: 'from-accent-green via-emerald-500 to-emerald-600',
      accentColor: 'var(--accent-green)',
      estimatedTime: '15-25s'
    },
    {
      id: 'marketing_flyer',
      name: 'Marketing Highlights',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      ),
      description: 'Key selling points & flyer content',
      gradient: 'from-accent-orange via-orange-500 to-orange-600',
      accentColor: 'var(--accent-orange)',
      estimatedTime: '10-20s'
    },
    {
      id: 'just_listed',
      name: 'Just Listed Post',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ),
      description: 'Celebration & announcement posts',
      gradient: 'from-yellow-400 via-accent-orange to-red-500',
      accentColor: 'var(--accent-orange)',
      estimatedTime: '8-15s'
    },
    {
      id: 'open_house',
      name: 'Open House Invite',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <path d="M9 22V12h6v10"/>
          <circle cx="12" cy="8" r="2"/>
        </svg>
      ),
      description: 'Event invitations & announcements',
      gradient: 'from-primary-500 via-accent-purple to-purple-600',
      accentColor: 'var(--primary-500)',
      estimatedTime: '12-22s'
    }
  ];

  // URL hash navigation management
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validSections = ['home', 'history', 'account', 'how-it-works', 'pricing', 'faq'];
      const newSection = validSections.includes(hash) ? hash : 'home';
      setCurrentSection(newSection);
    };

    // Listen for hash changes (back/forward buttons)
    window.addEventListener('hashchange', handleHashChange);
    
    // Set initial section from URL on load
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Mouse tracking for interactive effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Form validation
  useEffect(() => {
    setIsFormValid(propertyData.address.trim() && propertyData.price.trim());
  }, [propertyData.address, propertyData.price]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownOpen && !event.target.closest('.user-nav')) {
        setUserDropdownOpen(false);
      }
      if (showRecentProperties && !event.target.closest('.recent-properties-section')) {
        setShowRecentProperties(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userDropdownOpen, showRecentProperties]);

  // Load recent properties when user signs in or navigates to generator
  useEffect(() => {
    if (user && currentSection === 'home') {
      loadRecentProperties();
    }
  }, [user, currentSection]);

  // Load recent properties from API
  const loadRecentProperties = useCallback(async () => {
    if (!user) return;
    
    try {
      setRecentPropertiesLoading(true);
      const params = new URLSearchParams({
        userId: user.uid,
        limit: '10'
      });
      
      const response = await fetch(`/api/recent-properties?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setRecentProperties(data.recentProperties || []);
      } else {
        console.error('Failed to load recent properties:', data.error);
        setRecentProperties([]);
      }
    } catch (error) {
      console.error('Error loading recent properties:', error);
      setRecentProperties([]);
    } finally {
      setRecentPropertiesLoading(false);
    }
  }, [user]);

  // Load content history from existing "generations" collection
  const loadContentHistory = useCallback(async () => {
    if (!user) return;
    
    try {
      setHistoryLoading(true);
      const params = new URLSearchParams({
        userId: user.uid,
        limit: '50',
        offset: '0'
      });
      
      if (historyContentType !== 'all') {
        params.append('contentType', historyContentType);
      }
      
      if (historySearch.trim()) {
        params.append('search', historySearch.trim());
      }
      
      const response = await fetch(`/api/content-history?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setContentHistory(data.history || []);
      } else {
        console.error('Failed to load content history:', data.error);
        setContentHistory([]);
      }
    } catch (error) {
      console.error('Error loading content history:', error);
      setContentHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [user, historyContentType, historySearch]);

  // Load content history when user signs in or navigates to history section or when search/filter changes
  useEffect(() => {
    if (user && currentSection === 'history') {
      loadContentHistory();
    }
  }, [user, currentSection, loadContentHistory]);

  // Handle recent property selection
  const handleRecentPropertySelect = (property) => {
    setPropertyData({
      address: property.address,
      price: property.price,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      sqft: property.sqft,
      features: property.features,
      propertyType: property.propertyType,
      yearBuilt: property.yearBuilt,
      parking: property.parking,
      condition: property.condition,
      lotSize: property.lotSize,
      neighborhood: property.neighborhood,
      schoolDistrict: property.schoolDistrict,
      specialFeatures: property.specialFeatures
    });
    setShowRecentProperties(false);
    showNotification(`Property details loaded for ${property.address}`, 'success', 3000);
  };

  // Clear form and start fresh
  const handleClearForm = () => {
    setPropertyData({
      address: '',
      price: '',
      bedrooms: '',
      bathrooms: '',
      sqft: '',
      features: '',
      propertyType: 'Single Family Home',
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
        masterSuite: false,
        walkInCloset: false,
        centralAir: false,
        newAppliances: false,
        fencedYard: false,
        deck: false,
        basement: false,
        attic: false
      }
    });
    setShowRecentProperties(false);
    showNotification('Form cleared - ready for new property', 'info', 2000);
  };

  // Enhanced Navigation handler with URL hash support
  const handleNavigation = (sectionId) => {
    // Update URL hash
    window.location.hash = sectionId;
    
    // Update state (this will be handled by hashchange listener too)
    setCurrentSection(sectionId);
    setMobileMenuOpen(false);
    
    // Smooth scroll to section (let browser handle with hash)
    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Use timeout to ensure content is rendered first
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50); // Reduced from 100ms for faster response
    }
  };

  // Enhanced notification system
  const showNotification = (message, type = 'success', duration = 4000) => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => setNotification(null), duration);
  };

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPropertyData(prev => ({ ...prev, [name]: value }));
  };

  const handleFeatureChange = (featureName) => {
    setPropertyData(prev => ({
      ...prev,
      specialFeatures: {
        ...prev.specialFeatures,
        [featureName]: !prev.specialFeatures[featureName]
      }
    }));
  };

  // Enhanced content generation with Firebase tracking
  const generateContent = async () => {
    // Check if user is authenticated and can generate
    if (!user) {
      setShowAuthModal(true);
      setAuthMode('signup');
      showNotification('Please sign up to generate content', 'info');
      return;
    }

    if (!canGenerate()) {
      setShowUpgradeModal(true);
      showNotification('You\'ve reached your generation limit. Upgrade for more!', 'warning');
      return;
    }

    setIsGenerating(true);
    setError('');
    
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyData: propertyData,
          contentType: contentType
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const generationTime = ((Date.now() - startTime) / 1000).toFixed(1);
      const content = data.content || data.description;
      setGeneratedContent(content);
      
      // Track generation in Firebase
      const trackResult = await trackGeneration(contentType, content, propertyData);
      
      if (trackResult.success) {
        setGeneratedCount(prev => prev + 1);
        
        // Add to generation history (session-only for recent items display)
        const historyItem = {
          id: Date.now(),
          type: contentType,
          content: content,
          timestamp: new Date(),
          generationTime: generationTime
        };
        setGenerationHistory(prev => [historyItem, ...prev.slice(0, 4)]);
        
        const remaining = getRemainingGenerations();
        const remainingText = remaining === -1 ? 'unlimited' : remaining;
        
        showNotification(
          `${currentContentType.name} generated in ${generationTime}s! ${remainingText} remaining.`,
          'success'
        );

        // Reload content history if user is on history page
        if (currentSection === 'history') {
          loadContentHistory();
        }

        // Reload recent properties to include this new property
        loadRecentProperties();
      } else if (trackResult.needsUpgrade) {
        setShowUpgradeModal(true);
        showNotification('Upgrade needed for more generations!', 'warning');
      }
      
    } catch (err) {
      console.error('API Error:', err);
      setError('Failed to generate content. Please try again.');
      showNotification('Generation failed. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Enhanced clipboard function
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      showNotification('Content copied to clipboard!', 'success', 2000);
    } catch (err) {
      showNotification('Failed to copy content', 'error', 3000);
    }
  };

  // Download function
  const downloadContent = () => {
    const element = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${currentContentType.name.replace(/\s+/g, '_')}_${timestamp}.txt`;
    
    const file = new Blob([generatedContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    showNotification('Content downloaded successfully!', 'success', 2000);
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      setUserDropdownOpen(false);
      showNotification('Signed out successfully', 'success');
    } catch (error) {
      showNotification('Error signing out', 'error');
    }
  };

  // Copy content to clipboard
  const copyHistoryContent = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      showNotification('Content copied to clipboard!', 'success', 2000);
    } catch (err) {
      showNotification('Failed to copy content', 'error', 3000);
    }
  };

  // Download content as file
  const downloadHistoryContent = (content, contentType, propertyAddress) => {
    const element = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    const address = propertyAddress.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${contentType}_${address}_${timestamp}.txt`;
    
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    showNotification('Content downloaded successfully!', 'success', 2000);
  };

  // Delete content history item
  const deleteHistoryItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/content-history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: itemId,
          userId: user.uid
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setContentHistory(prev => prev.filter(item => item.id !== itemId));
        showNotification('Content deleted successfully', 'success');
      } else {
        showNotification('Failed to delete content', 'error');
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      showNotification('Error deleting content', 'error');
    }
  };

  // Get current content type
  const currentContentType = contentTypes.find(type => type.id === contentType);

  return (
    <div className="app" style={{
      '--mouse-x': `${mousePosition.x}%`,
      '--mouse-y': `${mousePosition.y}%`
    }}>
      {/* Show loading screen while auth is being determined */}
      {authLoading && (
        <div className="auth-loading-screen">
          <div className="auth-loading-content">
            <div className="brand-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            </div>
            <div className="brand-name">AppraisalStudio</div>
            <div className="loading-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
          </div>
        </div>
      )}

      {/* Main app content - only show when auth is determined */}
      {!authLoading && (
        <>
          {/* Enhanced background effects */}
          <div className="background-effects">
            <div className="gradient-orb gradient-orb-1"></div>
            <div className="gradient-orb gradient-orb-2"></div>
            <div className="gradient-orb gradient-orb-3"></div>
          </div>

      {/* Advanced notification system */}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          <div className="notification-content">
            <div className="notification-icon">
              {notification.type === 'success' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22,4 12,14.01 9,11.01"/>
                </svg>
              ) : notification.type === 'error' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              )}
            </div>
            <span>{notification.message}</span>
            <button 
              className="notification-close"
              onClick={() => setNotification(null)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Navigation Header */}
      <header className="navigation-header">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="brand-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            </div>
            <div className="brand-text">
              <span className="brand-name">AppraisalStudio</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="desktop-nav">
            <ul className="nav-list">
              {navigationItems.map((item) => (
                <li key={item.id} className="nav-item">
                  <button
                    className={`nav-link ${currentSection === item.id ? 'active' : ''}`}
                    onClick={() => handleNavigation(item.id)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* User Actions */}
          <div className="nav-actions">
            {user && userProfile ? (
              <div className="user-nav">
                <div className="usage-display">
                  <span className="usage-text">
                    {getRemainingGenerations() === -1 ? '∞' : getRemainingGenerations()} left
                  </span>
                </div>
                <div className="user-dropdown-container">
                  <button 
                    className="user-avatar"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  >
                    {userProfile.displayName ? userProfile.displayName[0].toUpperCase() : user.email[0].toUpperCase()}
                  </button>
                  {userDropdownOpen && (
                    <div className="user-dropdown">
                      <div className="dropdown-header">
                        <div className="user-info">
                          <div className="user-name">
                            {userProfile.displayName || user.email}
                          </div>
                          <div className="user-email">
                            {user.email}
                          </div>
                          <div className="user-plan">
                            {userProfile.planType || 'Free'} Plan
                          </div>
                        </div>
                      </div>
                      <div className="dropdown-divider"></div>
                      <div className="dropdown-actions">
                        <button 
                          className="dropdown-item"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            handleNavigation('account');
                          }}
                        >
                          <div className="dropdown-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                            </svg>
                          </div>
                          <span>Account Dashboard</span>
                        </button>
                        <button 
                          className="dropdown-item sign-out"
                          onClick={handleSignOut}
                        >
                          <div className="dropdown-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                              <polyline points="16,17 21,12 16,7"/>
                              <line x1="21" y1="12" x2="9" y2="12"/>
                            </svg>
                          </div>
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="auth-nav">
                <button 
                  className="nav-auth-btn signin"
                  onClick={() => {
                    setAuthMode('signin');
                    setShowAuthModal(true);
                  }}
                >
                  Sign In
                </button>
                <button 
                  className="nav-auth-btn signup"
                  onClick={() => {
                    setAuthMode('signup');
                    setShowAuthModal(true);
                  }}
                >
                  Get Started
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <div className={`hamburger ${mobileMenuOpen ? 'active' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
          <ul className="mobile-nav-list">
            {navigationItems.map((item) => (
              <li key={item.id} className="mobile-nav-item">
                <button
                  className={`mobile-nav-link ${currentSection === item.id ? 'active' : ''}`}
                  onClick={() => handleNavigation(item.id)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          {!user && (
            <div className="mobile-auth">
              <button 
                className="mobile-auth-btn signin"
                onClick={() => {
                  setAuthMode('signin');
                  setShowAuthModal(true);
                  setMobileMenuOpen(false);
                }}
              >
                Sign In
              </button>
              <button 
                className="mobile-auth-btn signup"
                onClick={() => {
                  setAuthMode('signup');
                  setShowAuthModal(true);
                  setMobileMenuOpen(false);
                }}
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="main">
        {/* Home Section - Show only for non-authenticated users */}
        {!user && (
          <section id="home" className="hero-section">
            <div className="container">
              <div className="hero-content">
                <h1 className="hero-title">
                  Transform Property Details Into 
                  <span className="gradient-text"> Professional Content</span>
                </h1>
                <p className="hero-subtitle">
                  Enter your property information once, then generate unlimited marketing content 
                  with AI-powered precision in seconds
                </p>
                <div className="hero-cta">
                  <button 
                    className="cta-button primary"
                    onClick={() => {
                      setAuthMode('signup');
                      setShowAuthModal(true);
                    }}
                  >
                    <span>Get Started Free</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12,5 19,12 12,19"></polyline>
                    </svg>
                  </button>
                  <button 
                    className="cta-button secondary"
                    onClick={() => handleNavigation('how-it-works')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5,3 19,12 5,21"/>
                    </svg>
                    <span>See How It Works</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Generator Form Section - Show only for authenticated users */}
        {user && (
          <div className="form-section" ref={formRef}>
            <div className="container">
              <div className="form-card">
                <div className="form-header">
                  <div className="form-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 12h6l-3-3 3-3h-6l3 3-3 3z"/>
                      <path d="M21 12c0 1.657-4.03 3-9 3s-9-1.343-9-3"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="form-title">Property Information</h3>
                    <p className="form-description">
                      Fill out the details below to power intelligent content generation
                    </p>
                  </div>
                </div>

                {/* Recent Properties Section */}
                {recentProperties.length > 0 && (
                  <div className="recent-properties-section">
                    <div className="recent-properties-header">
                      <button 
                        className="recent-properties-toggle"
                        onClick={() => setShowRecentProperties(!showRecentProperties)}
                      >
                        <div className="toggle-icon-wrapper">
                          <div className="toggle-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 20v-6M6 20V10M18 20V4"/>
                            </svg>
                          </div>
                        </div>
                        <div className="toggle-content">
                          <span className="toggle-title">Recent Properties</span>
                          <span className="toggle-subtitle">
                            Quick access to properties you've used before
                          </span>
                        </div>
                        <div className="toggle-badge">
                          {recentProperties.length}
                        </div>
                        <div className={`toggle-arrow ${showRecentProperties ? 'rotated' : ''}`}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6,9 12,15 18,9"></polyline>
                          </svg>
                        </div>
                      </button>
                    </div>

                    {showRecentProperties && (
                      <div className="recent-properties-dropdown">
                        {recentPropertiesLoading ? (
                          <div className="recent-properties-loading">
                            <div className="loading-spinner">
                              <div className="spinner-ring"></div>
                              <div className="spinner-ring"></div>
                              <div className="spinner-ring"></div>
                            </div>
                            <span>Loading recent properties...</span>
                          </div>
                        ) : (
                          <div className="recent-properties-list">
                            {recentProperties.map((property) => (
                              <button
                                key={property.id}
                                className="recent-property-item"
                                onClick={() => handleRecentPropertySelect(property)}
                              >
                                <div className="property-icon">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                    <polyline points="9,22 9,12 15,12 15,22"/>
                                  </svg>
                                </div>
                                <div className="property-details">
                                  <div className="property-address">{property.address}</div>
                                  <div className="property-meta">
                                    {property.bedrooms && property.bathrooms && (
                                      <span>{property.bedrooms}BR/{property.bathrooms}BA</span>
                                    )}
                                    {property.propertyType && (
                                      <span>{property.propertyType}</span>
                                    )}
                                    {property.price && (
                                      <span>${property.price}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="property-arrow">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12h14"/>
                                    <path d="M12 5l7 7-7 7"/>
                                  </svg>
                                </div>
                              </button>
                            ))}
                            <button 
                              className="clear-form-button"
                              onClick={handleClearForm}
                            >
                              <div className="clear-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                  <polyline points="14,2 14,8 20,8"/>
                                  <line x1="16" y1="13" x2="8" y2="13"/>
                                  <line x1="16" y1="17" x2="8" y2="17"/>
                                </svg>
                              </div>
                              <span>Clear Form - Start Fresh</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="form-grid">
                  <div className="input-group">
                    <label className="input-label">
                      <span>Property Address</span>
                      <span className="required-indicator">*</span>
                    </label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        name="address"
                        value={propertyData.address}
                        onChange={handleInputChange}
                        placeholder="123 Main Street, City, State"
                        className="enhanced-input"
                      />
                      <div className="input-underline"></div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="input-group">
                      <label className="input-label">
                        <span>Property Type</span>
                        <span className="required-indicator">*</span>
                      </label>
                      <div className="select-wrapper">
                        <select
                          name="propertyType"
                          value={propertyData.propertyType}
                          onChange={handleInputChange}
                          className="enhanced-select"
                        >
                          <option value="Single Family Home">Single Family Home</option>
                          <option value="Condo">Condo</option>
                          <option value="Townhouse">Townhouse</option>
                          <option value="Multi-Family">Multi-Family</option>
                          <option value="Land">Land</option>
                          <option value="Commercial">Commercial</option>
                        </select>
                        <div className="select-arrow">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6,9 12,15 18,9"></polyline>
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="input-group">
                      <label className="input-label">
                        <span>Price</span>
                        <span className="required-indicator">*</span>
                      </label>
                      <div className="input-wrapper">
                        <input
                          type="text"
                          name="price"
                          value={propertyData.price}
                          onChange={handleInputChange}
                          placeholder="450,000"
                          className="enhanced-input"
                        />
                        <div className="input-underline"></div>
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="input-group">
                      <label className="input-label">Bedrooms</label>
                      <div className="input-wrapper">
                        <input
                          type="number"
                          name="bedrooms"
                          value={propertyData.bedrooms}
                          onChange={handleInputChange}
                          placeholder="3"
                          className="enhanced-input"
                        />
                        <div className="input-underline"></div>
                      </div>
                    </div>

                    <div className="input-group">
                      <label className="input-label">Bathrooms</label>
                      <div className="input-wrapper">
                        <input
                          type="number"
                          name="bathrooms"
                          value={propertyData.bathrooms}
                          onChange={handleInputChange}
                          placeholder="2"
                          className="enhanced-input"
                        />
                        <div className="input-underline"></div>
                      </div>
                    </div>

                    <div className="input-group">
                      <label className="input-label">Square Feet</label>
                      <div className="input-wrapper">
                        <input
                          type="number"
                          name="sqft"
                          value={propertyData.sqft}
                          onChange={handleInputChange}
                          placeholder="2500"
                          className="enhanced-input"
                        />
                        <div className="input-underline"></div>
                      </div>
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Key Features</label>
                    <div className="textarea-wrapper">
                      <textarea
                        name="features"
                        value={propertyData.features}
                        onChange={handleInputChange}
                        placeholder="Updated kitchen, hardwood floors, large backyard, garage, master suite..."
                        rows="3"
                        className="enhanced-textarea"
                      />
                      <div className="textarea-underline"></div>
                    </div>
                  </div>

                  {/* Enhanced optional fields toggle */}
                  <div className="optional-section-toggle">
                    <button
                      type="button"
                      className="toggle-button"
                      onClick={() => setShowOptionalFields(!showOptionalFields)}
                    >
                      <div className="toggle-icon-wrapper">
                        <div className={`toggle-icon ${showOptionalFields ? 'rotated' : ''}`}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6,9 12,15 18,9"></polyline>
                          </svg>
                        </div>
                      </div>
                      <div className="toggle-content">
                        <span className="toggle-title">Optional Details</span>
                        <span className="toggle-subtitle">
                          Add more context for richer, more detailed content
                        </span>
                      </div>
                      <div className="toggle-badge">
                        {Object.values(propertyData.specialFeatures).filter(Boolean).length + 
                         [propertyData.yearBuilt, propertyData.parking, propertyData.condition, 
                          propertyData.lotSize, propertyData.schoolDistrict, propertyData.neighborhood]
                         .filter(field => field && field.trim()).length}
                      </div>
                    </button>
                  </div>

                  {/* Optional fields with enhanced styling */}
                  {showOptionalFields && (
                    <div className="optional-fields">
                      <div className="optional-divider">
                        <span>Additional Property Details</span>
                      </div>
                      
                      <div className="form-row">
                        <div className="input-group">
                          <label className="input-label">Year Built</label>
                          <div className="input-wrapper">
                            <input
                              type="number"
                              name="yearBuilt"
                              value={propertyData.yearBuilt}
                              onChange={handleInputChange}
                              placeholder="2020"
                              min="1800"
                              max={new Date().getFullYear()}
                              className="enhanced-input"
                            />
                            <div className="input-underline"></div>
                          </div>
                        </div>

                        <div className="input-group">
                          <label className="input-label">Parking</label>
                          <div className="select-wrapper">
                            <select
                              name="parking"
                              value={propertyData.parking}
                              onChange={handleInputChange}
                              className="enhanced-select"
                            >
                              <option value="">Select parking type</option>
                              <option value="Attached Garage">Attached Garage</option>
                              <option value="Detached Garage">Detached Garage</option>
                              <option value="Carport">Carport</option>
                              <option value="Driveway">Driveway</option>
                              <option value="Street Parking">Street Parking</option>
                              <option value="None">No Parking</option>
                            </select>
                            <div className="select-arrow">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6,9 12,15 18,9"></polyline>
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="input-group">
                          <label className="input-label">Condition</label>
                          <div className="select-wrapper">
                            <select
                              name="condition"
                              value={propertyData.condition}
                              onChange={handleInputChange}
                              className="enhanced-select"
                            >
                              <option value="">Select condition</option>
                              <option value="Excellent">Excellent</option>
                              <option value="Good">Good</option>
                              <option value="Needs Updates">Needs Updates</option>
                              <option value="Fixer-Upper">Fixer-Upper</option>
                            </select>
                            <div className="select-arrow">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6,9 12,15 18,9"></polyline>
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="input-group">
                          <label className="input-label">Lot Size</label>
                          <div className="input-wrapper">
                            <input
                              type="text"
                              name="lotSize"
                              value={propertyData.lotSize}
                              onChange={handleInputChange}
                              placeholder="0.25 acres or 10,890 sq ft"
                              className="enhanced-input"
                            />
                            <div className="input-underline"></div>
                          </div>
                        </div>

                        <div className="input-group">
                          <label className="input-label">School District</label>
                          <div className="input-wrapper">
                            <input
                              type="text"
                              name="schoolDistrict"
                              value={propertyData.schoolDistrict}
                              onChange={handleInputChange}
                              placeholder="Dublin City Schools"
                              className="enhanced-input"
                            />
                            <div className="input-underline"></div>
                          </div>
                        </div>
                      </div>

                      <div className="input-group">
                        <label className="input-label">Neighborhood Description</label>
                        <div className="textarea-wrapper">
                          <textarea
                            name="neighborhood"
                            value={propertyData.neighborhood}
                            onChange={handleInputChange}
                            placeholder="Quiet family neighborhood, close to parks, shopping, and highways..."
                            rows="2"
                            className="enhanced-textarea"
                          />
                          <div className="textarea-underline"></div>
                        </div>
                      </div>

                      {/* Enhanced special features */}
                      <div className="input-group">
                        <label className="input-label">Special Features</label>
                        <div className="features-grid">
                          {Object.entries(propertyData.specialFeatures).map(([feature, isChecked]) => (
                            <label key={feature} className="feature-checkbox">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleFeatureChange(feature)}
                                className="checkbox-input"
                              />
                              <div className="checkbox-visual">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20,6 9,17 4,12"></polyline>
                                </svg>
                              </div>
                              <span className="checkbox-label">
                                {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced content type selection */}
              <div className="content-types-section">
                <div className="section-header">
                  <h3 className="section-title">Choose Your Content Type</h3>
                  <p className="section-subtitle">
                    Select the format that matches your marketing needs
                  </p>
                </div>
                
                <div className="content-types-grid">
                  {contentTypes.map((type) => (
                    <div
                      key={type.id}
                      className={`content-type-option ${contentType === type.id ? 'selected' : ''}`}
                      onClick={() => setContentType(type.id)}
                      style={{ '--accent-color': type.accentColor }}
                    >
                      <div className="option-background"></div>
                      <div className="option-content">
                        <div className="option-icon">
                          {type.icon}
                        </div>
                        <div className="option-info">
                          <h4 className="option-title">{type.name}</h4>
                          <p className="option-description">{type.description}</p>
                          <div className="option-meta">
                            <span className="generation-time">~{type.estimatedTime}</span>
                          </div>
                        </div>
                        <div className="option-selector">
                          <div className="selector-dot"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Premium generate button */}
                <div className="generate-section">
                  <button 
                    className={`generate-button ${!isFormValid ? 'disabled' : ''} ${isGenerating ? 'generating' : ''}`}
                    onClick={generateContent}
                    disabled={!isFormValid || isGenerating}
                  >
                    <div className="button-background"></div>
                    <div className="button-content">
                      {isGenerating ? (
                        <>
                          <div className="loading-spinner">
                            <div className="spinner-ring"></div>
                            <div className="spinner-ring"></div>
                            <div className="spinner-ring"></div>
                          </div>
                          <span>Generating with AI...</span>
                        </>
                      ) : (
                        <>
                          <div className="button-icon">
                            {currentContentType.icon}
                          </div>
                          <span>Generate {currentContentType.name}</span>
                          <div className="button-arrow">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                              <polyline points="12,5 19,12 12,19"></polyline>
                            </svg>
                          </div>
                        </>
                      )}
                    </div>
                  </button>

                  {error && (
                    <div className="error-display">
                      <div className="error-icon">⚠️</div>
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Premium results section */}
              {generatedContent && (
                <div className="results-section">
                  <div className="results-header">
                    <div className="results-title-section">
                      <h3 className="results-title">Your Generated Content</h3>
                      <div className="content-type-indicator">
                        <div className="indicator-icon">{currentContentType.icon}</div>
                        <span>{currentContentType.name}</span>
                      </div>
                    </div>
                    <div className="results-badge">
                      <div className="badge-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22,4 12,14.01 9,11.01"/>
                        </svg>
                      </div>
                      <span>Ready to Use</span>
                    </div>
                  </div>

                  <div className="content-display">
                    <div className="content-wrapper">
                      <div className="content-text">
                        {generatedContent}
                      </div>
                    </div>
                    
                    <div className="content-actions">
                      <div className="action-buttons">
                        <button className="action-button primary" onClick={copyToClipboard}>
                          <div className="button-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                          </div>
                          <span>Copy to Clipboard</span>
                        </button>
                        
                        <button className="action-button secondary" onClick={downloadContent}>
                          <div className="button-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="7,10 12,15 17,10"/>
                              <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                          </div>
                          <span>Download</span>
                        </button>
                      </div>
                      
                      <div className="content-stats">
                        <div className="stat">
                          <span className="stat-value">{generatedContent.split(' ').length}</span>
                          <span className="stat-label">Words</span>
                        </div>
                        <div className="stat">
                          <span className="stat-value">{generatedContent.length}</span>
                          <span className="stat-label">Characters</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content History Section - New dedicated section for authenticated users */}
        {user && currentSection === 'history' && (
          <section id="history" className="history-section">
            <div className="container">
              <div className="history-header">
                <h2 className="history-title">Content History</h2>
                <p className="history-subtitle">
                  All your generated content across all sessions
                </p>
              </div>

              <div className="history-card">
                <div className="history-controls">
                  <div className="history-search">
                    <div className="search-input-wrapper">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                      </svg>
                      <input
                        type="text"
                        placeholder="Search content or property address..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="search-input"
                      />
                    </div>
                  </div>

                  <div className="history-filter">
                    <select
                      value={historyContentType}
                      onChange={(e) => setHistoryContentType(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">All Content Types</option>
                      <option value="description">Property Descriptions</option>
                      <option value="social_listing">Social Media Posts</option>
                      <option value="email_alert">Email Templates</option>
                      <option value="marketing_flyer">Marketing Highlights</option>
                      <option value="just_listed">Just Listed Posts</option>
                      <option value="open_house">Open House Invites</option>
                    </select>
                  </div>
                </div>

                <div className="content-history-list">
                  {historyLoading ? (
                    <div className="history-loading">
                      <div className="loading-spinner">
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                      </div>
                      <span>Loading your content history...</span>
                    </div>
                  ) : contentHistory.length === 0 ? (
                    <div className="history-empty">
                      <div className="empty-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/>
                        </svg>
                      </div>
                      <h4>No content history yet</h4>
                      <p>Your generated content will appear here. Start by creating your first property content!</p>
                      <button 
                        className="empty-cta"
                        onClick={() => handleNavigation('home')}
                      >
                        Generate Your First Content
                      </button>
                    </div>
                  ) : (
                    contentHistory.map((item) => (
                      <div key={item.id} className="history-item">
                        <div className="history-item-header">
                          <div className="item-type">
                            <div className="type-icon">
                              {contentTypes.find(type => type.id === item.contentType)?.icon || (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                </svg>
                              )}
                            </div>
                            <div className="type-info">
                              <span className="type-name">
                                {contentTypes.find(type => type.id === item.contentType)?.name || item.contentType}
                              </span>
                              <span className="property-address">{item.propertyAddress}</span>
                            </div>
                          </div>
                          <div className="item-meta">
                            <span className="item-date">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                            <span className="item-stats">
                              {item.wordCount} words
                            </span>
                          </div>
                        </div>

                        <div className="history-item-content">
                          <p className="content-preview">
                            {item.content.length > 200 ? `${item.content.substring(0, 200)}...` : item.content}
                          </p>
                        </div>

                        <div className="history-item-actions">
                          <button
                            className="history-action-btn copy"
                            onClick={() => copyHistoryContent(item.content)}
                            title="Copy to clipboard"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                            <span>Copy</span>
                          </button>

                          <button
                            className="history-action-btn download"
                            onClick={() => downloadHistoryContent(item.content, item.contentType, item.propertyAddress)}
                            title="Download as file"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="7,10 12,15 17,10"/>
                              <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            <span>Download</span>
                          </button>

                          <button
                            className="history-action-btn delete"
                            onClick={() => deleteHistoryItem(item.id)}
                            title="Delete content"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3,6 5,6 21,6"/>
                              <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
                              <line x1="10" y1="11" x2="10" y2="17"/>
                              <line x1="14" y1="11" x2="14" y2="17"/>
                            </svg>
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Account Section - Cleaned up without Content History */}
        {user && currentSection === 'account' && (
          <section id="account" className="account-section">
            <div className="container">
              <div className="account-header">
                <h2 className="account-title">Account Dashboard</h2>
                <p className="account-subtitle">
                  Manage your subscription, usage, and account settings
                </p>
              </div>

              <div className="account-grid">
                {/* Account Overview Card */}
                <div className="account-card">
                  <div className="card-header">
                    <div className="card-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <h3 className="card-title">Account Overview</h3>
                  </div>
                  <div className="card-content">
                    <div className="account-info-grid">
                      <div className="info-item">
                        <span className="info-label">Account Status</span>
                        <span className={`info-value status ${userProfile?.subscriptionStatus || 'free'}`}>
                          {userProfile?.subscriptionStatus === 'active' ? 'Active Subscription' : 'Free Trial'}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Current Plan</span>
                        <span className="info-value">{userProfile?.planType || 'Free Trial'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Member Since</span>
                        <span className="info-value">
                          {userProfile?.createdAt ? new Date(userProfile.createdAt.toDate()).toLocaleDateString() : 'Recently'}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Account Email</span>
                        <span className="info-value">{user?.email}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Usage Statistics Card */}
                <div className="account-card">
                  <div className="card-header">
                    <div className="card-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 3v18h18"/>
                        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
                      </svg>
                    </div>
                    <h3 className="card-title">Usage Statistics</h3>
                  </div>
                  <div className="card-content">
                    <div className="usage-stats">
                      <div className="usage-stat">
                        <div className="stat-number">{userProfile?.usageCount || 0}</div>
                        <div className="stat-label">Content Generated</div>
                        <div className="stat-period">This Month</div>
                      </div>
                      <div className="usage-stat">
                        <div className="stat-number">
                          {getRemainingGenerations() === -1 ? '∞' : getRemainingGenerations()}
                        </div>
                        <div className="stat-label">Remaining</div>
                        <div className="stat-period">This Period</div>
                      </div>
                      <div className="usage-stat">
                        <div className="stat-number">{generationHistory.length}</div>
                        <div className="stat-label">Recent Items</div>
                        <div className="stat-period">This Session</div>
                      </div>
                    </div>
                    
                    {userProfile?.usageLimit && (
                      <div className="usage-progress">
                        <div className="progress-header">
                          <span>Monthly Usage</span>
                          <span>{userProfile.usageCount || 0} / {userProfile.usageLimit}</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ 
                              width: `${Math.min(((userProfile.usageCount || 0) / userProfile.usageLimit) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Billing Information Card - Only show for subscribed users */}
                {userProfile?.subscriptionStatus === 'active' && (
                  <div className="account-card billing-card">
                    <div className="card-header">
                      <div className="card-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                          <line x1="1" y1="10" x2="23" y2="10"/>
                        </svg>
                      </div>
                      <h3 className="card-title">Billing Information</h3>
                    </div>
                    <div className="card-content">
                      <div className="billing-info">
                        <div className="billing-item">
                          <span className="billing-label">Next Billing Date</span>
                          <span className="billing-value">
                            {userProfile?.nextBillingDate ? 
                              new Date(userProfile.nextBillingDate.toDate()).toLocaleDateString() : 
                              'Not available'
                            }
                          </span>
                        </div>
                        <div className="billing-item">
                          <span className="billing-label">Plan Amount</span>
                          <span className="billing-value">
                            ${userProfile?.planType === 'Agency' ? '99' : '49'}/month
                          </span>
                        </div>
                      </div>
                      
                      <div className="billing-actions">
                        <button 
                          className="billing-portal-btn"
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/stripe/customer-portal', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  userId: user.uid,
                                  returnUrl: window.location.origin
                                }),
                              });
                              
                              const data = await response.json();
                              if (response.ok && data.portalUrl) {
                                window.location.href = data.portalUrl;
                              } else {
                                showNotification('Failed to open billing portal', 'error');
                              }
                            } catch (err) {
                              showNotification('Error accessing billing portal', 'error');
                            }
                          }}
                        >
                          <div className="portal-btn-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                              <line x1="1" y1="10" x2="23" y2="10"/>
                            </svg>
                          </div>
                          <div className="portal-btn-content">
                            <div className="portal-btn-title">Manage Billing</div>
                            <div className="portal-btn-subtitle">Update payment method, view invoices, cancel subscription</div>
                          </div>
                          <div className="portal-btn-arrow">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M5 12h14"/>
                              <path d="M12 5l7 7-7 7"/>
                            </svg>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* How It Works Section - Show only for non-authenticated users */}
        {!user && (
          <section id="how-it-works" className="how-it-works-section">
            <div className="container">
              <div className="section-header">
                <h2 className="section-title">How It Works</h2>
                <p className="section-subtitle">
                  Generate professional real estate content in three simple steps
                </p>
              </div>

              <div className="steps-grid">
                <div className="step-card">
                  <div className="step-number">1</div>
                  <div className="step-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9,22 9,12 15,12 15,22"/>
                    </svg>
                  </div>
                  <h3 className="step-title">Enter Property Details</h3>
                  <p className="step-description">
                    Add your property information once - address, price, features, and any special details that make it unique.
                  </p>
                </div>

                <div className="step-card">
                  <div className="step-number">2</div>
                  <div className="step-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                      <line x1="8" y1="21" x2="16" y2="21"/>
                      <line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                  </div>
                  <h3 className="step-title">Choose Content Type</h3>
                  <p className="step-description">
                    Select from 6 professional formats: MLS descriptions, social posts, email templates, and more.
                  </p>
                </div>

                <div className="step-card">
                  <div className="step-number">3</div>
                  <div className="step-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                  </div>
                  <h3 className="step-title">Get Professional Results</h3>
                  <p className="step-description">
                    Advanced AI optimized for real estate generates professional, ready-to-use content in seconds. Copy, download, or customize as needed.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Pricing Section - Show only for non-authenticated users */}
        {!user && (
          <section id="pricing" className="pricing-section">
            <div className="container">
              <div className="section-header">
                <h2 className="section-title">Simple, Transparent Pricing</h2>
                <p className="section-subtitle">Choose the plan that fits your business needs</p>
              </div>

              <div className="pricing-cards-container">
                <div className="pricing-card free">
                  <h3 className="pricing-plan-name">Free Trial</h3>
                  <div className="pricing-price">
                    <span className="price-amount">$0</span>
                    <span className="price-period">forever</span>
                  </div>
                  <ul className="pricing-features">
                    <li>5 AI generations</li>
                    <li>All 6 content types</li>
                    <li>Basic generation speed</li>
                    <li>Email support</li>
                  </ul>
                  <button 
                    className="pricing-cta"
                    onClick={() => {
                      setAuthMode('signup');
                      setShowAuthModal(true);
                    }}
                  >
                    Get Started
                  </button>
                </div>

                <div className="pricing-card professional popular">
                  <div className="popular-badge">Most Popular</div>
                  <h3 className="pricing-plan-name">Professional</h3>
                  <div className="pricing-price">
                    <span className="price-amount">$49</span>
                    <span className="price-period">/month</span>
                  </div>
                  <ul className="pricing-features">
                    <li>100 AI generations/month</li>
                    <li>All 6 content types</li>
                    <li>Priority generation speed</li>
                    <li>Priority email support</li>
                    <li>Content history</li>
                    <li>Export to multiple formats</li>
                  </ul>
                  <button 
                    className="pricing-cta"
                    onClick={() => {
                      setAuthMode('signup');
                      setShowAuthModal(true);
                    }}
                  >
                    Start Free Trial
                  </button>
                </div>

                <div className="pricing-card agency">
                  <h3 className="pricing-plan-name">Agency</h3>
                  <div className="pricing-price">
                    <span className="price-amount">$99</span>
                    <span className="price-period">/month</span>
                  </div>
                  <ul className="pricing-features">
                    <li>Unlimited AI generations</li>
                    <li>All 6 content types</li>
                    <li>Priority generation speed</li>
                    <li>Priority phone & email support</li>
                    <li>Content history</li>
                    <li>Export to multiple formats</li>
                    <li>Perfect for high-volume agents</li>
                    <li>Ideal for busy real estate teams</li>
                  </ul>
                  <button 
                    className="pricing-cta"
                    onClick={() => {
                      setAuthMode('signup');
                      setShowAuthModal(true);
                    }}
                  >
                    Start Free Trial
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* FAQ Section - Show only for non-authenticated users */}
        {!user && (
          <section id="faq" className="faq-section">
            <div className="container">
              <div className="section-header">
                <h2 className="section-title">Frequently Asked Questions</h2>
                <p className="section-subtitle">
                  Everything you need to know about AppraisalStudio
                </p>
              </div>

              <div className="faq-grid">
                <div className="faq-item">
                  <h3 className="faq-question">How accurate is the AI-generated content?</h3>
                  <p className="faq-answer">
                    Our platform uses advanced AI with specialized prompts optimized for real estate content, producing professional-quality descriptions that you can use immediately or customize as needed.
                  </p>
                </div>

                <div className="faq-item">
                  <h3 className="faq-question">Can I edit the generated content?</h3>
                  <p className="faq-answer">
                    Absolutely! All generated content is fully editable. Use it as-is or customize it to match your specific style and needs.
                  </p>
                </div>

                <div className="faq-item">
                  <h3 className="faq-question">What content types are available?</h3>
                  <p className="faq-answer">
                    We offer 6 content types: Property descriptions, social media posts, email templates, marketing highlights, just listed announcements, and open house invitations.
                  </p>
                </div>

                <div className="faq-item">
                  <h3 className="faq-question">Is there a free trial?</h3>
                  <p className="faq-answer">
                    Yes! Every new account gets 5 free AI generations to try out all our features before upgrading to a paid plan.
                  </p>
                </div>

                <div className="faq-item">
                  <h3 className="faq-question">Can I cancel anytime?</h3>
                  <p className="faq-answer">
                    Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
                  </p>
                </div>

                <div className="faq-item">
                  <h3 className="faq-question">What's the difference between Professional and Agency plans?</h3>
                  <p className="faq-answer">
                    The Professional plan includes 100 AI generations per month, while the Agency plan offers unlimited generations - perfect for high-volume agents and busy real estate teams.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Authentication Modal */}
      {showAuthModal && (
        <AuthModal 
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSwitchMode={(mode) => setAuthMode(mode)}
          showNotification={showNotification}
        />
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal 
          onClose={() => setShowUpgradeModal(false)}
          userProfile={userProfile}
          showNotification={showNotification}
        />
      )}
        </>
      )}
    </div>
  );
}

// AuthModal Component
const AuthModal = ({ mode, onClose, onSwitchMode, showNotification }) => {
  const { signIn, signUp, resetPassword, authLoading } = useFirebase();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (mode === 'signup') {
      if (!formData.displayName) {
        newErrors.displayName = 'Name is required';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (mode === 'signin') {
        const result = await signIn(formData.email, formData.password);
        if (result.success) {
          onClose();
          showNotification('Welcome back!', 'success');
        } else {
          setErrors({ general: result.error });
        }
      } else {
        const result = await signUp(formData.email, formData.password, formData.displayName);
        if (result.success) {
          onClose();
          showNotification('Account created successfully! Check your email to verify.', 'success');
        } else {
          setErrors({ general: result.error });
        }
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' });
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setErrors({ email: 'Please enter your email address' });
      return;
    }

    const result = await resetPassword(formData.email);
    if (result.success) {
      showNotification('Password reset email sent!', 'success');
    } else {
      setErrors({ general: result.error });
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h2 className="auth-modal-title">
            {mode === 'signin' ? 'Welcome Back' : 'Join AppraisalStudio'}
          </h2>
          <p className="auth-modal-subtitle">
            {mode === 'signin' 
              ? 'Sign in to continue creating professional content'
              : 'Start generating professional real estate content'
            }
          </p>
          <button className="auth-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="auth-input-group">
              <label className="auth-label">Full Name</label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                placeholder="John Doe"
                className={`auth-input ${errors.displayName ? 'error' : ''}`}
              />
              {errors.displayName && <span className="auth-error">{errors.displayName}</span>}
            </div>
          )}

          <div className="auth-input-group">
            <label className="auth-label">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="john@example.com"
              className={`auth-input ${errors.email ? 'error' : ''}`}
            />
            {errors.email && <span className="auth-error">{errors.email}</span>}
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className={`auth-input ${errors.password ? 'error' : ''}`}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <span className="auth-error">{errors.password}</span>}
          </div>

          {mode === 'signup' && (
            <div className="auth-input-group">
              <label className="auth-label">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••••"
                className={`auth-input ${errors.confirmPassword ? 'error' : ''}`}
              />
              {errors.confirmPassword && <span className="auth-error">{errors.confirmPassword}</span>}
            </div>
          )}

          {errors.general && (
            <div className="auth-error-banner">
              {errors.general}
            </div>
          )}

          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={authLoading}
          >
            {authLoading ? (
              <div className="auth-loading">
                <div className="auth-spinner"></div>
                {mode === 'signin' ? 'Signing In...' : 'Creating Account...'}
              </div>
            ) : (
              mode === 'signin' ? 'Sign In' : 'Create Account'
            )}
          </button>

          {mode === 'signin' && (
            <button 
              type="button" 
              className="forgot-password-btn"
              onClick={handleForgotPassword}
            >
              Forgot your password?
            </button>
          )}
        </form>

        <div className="auth-switch">
          {mode === 'signin' ? (
            <p>
              Don't have an account?{' '}
              <button 
                className="auth-switch-btn"
                onClick={() => onSwitchMode('signup')}
              >
                Sign up for free
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button 
                className="auth-switch-btn"
                onClick={() => onSwitchMode('signin')}
              >
                Sign in
              </button>
            </p>
          )}
        </div>

        {mode === 'signup' && (
          <div className="auth-benefits">
            <h4>What you get with AppraisalStudio:</h4>
            <ul>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="benefit-icon">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
                5 free AI-generated content pieces
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="benefit-icon">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
                6 different content types
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="benefit-icon">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                Professional social media posts
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="benefit-icon">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Email templates and marketing copy
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// UpgradeModal Component
const UpgradeModal = ({ onClose, userProfile, showNotification }) => {
  const { user } = useFirebase();
  const [selectedPlan, setSelectedPlan] = useState('professional');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const plans = [
    {
      id: 'professional',
      name: 'Professional',
      price: 49,
      period: 'month',
      popular: true,
      features: [
        '100 AI generations per month',
        'All 6 content types',
        'Priority generation speed',
        'Email support',
        'Content history',
        'Export to multiple formats'
      ],
      description: 'Perfect for individual real estate agents'
    },
    {
      id: 'agency',
      name: 'Agency',
      price: 99,
      period: 'month',
      popular: false,
      features: [
        'Unlimited AI generations',
        'All 6 content types',
        'Priority generation speed',
        'Priority support',
        'Content history',
        'Export to multiple formats',
        'Perfect for high-volume agents',
        'Ideal for busy real estate teams'
      ],
      description: 'Ideal for high-volume agents and teams'
    }
  ];

  const handleUpgrade = async (planId) => {
    if (!user) {
      showNotification('Please sign in first', 'error');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const requestData = {
        planId: planId,
        userId: user.uid,
        userEmail: user.email,
        returnUrl: window.location.origin
      };

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
      
    } catch (err) {
      console.error('Upgrade error:', err);
      setError(err.message || 'Failed to start checkout process');
      showNotification('Upgrade failed. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardClick = (planId) => {
    setSelectedPlan(planId);
  };

  const handleButtonClick = async (e, planId) => {
    e.stopPropagation();
    
    // If clicking a different plan, select it first
    if (selectedPlan !== planId) {
      setSelectedPlan(planId);
      return; // Don't proceed to upgrade on first click
    }
    
    // If plan is already selected, proceed with upgrade
    await handleUpgrade(planId);
  };

  const handleManageBilling = async () => {
    if (!user) {
      showNotification('Please sign in first', 'error');
      return;
    }

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to access billing portal');
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
      
    } catch (err) {
      console.error('Billing portal error:', err);
      showNotification('Failed to open billing portal. Please try again.', 'error');
    }
  };

  const isSubscribed = userProfile?.subscriptionStatus === 'active';

  return (
    <div className="upgrade-modal-overlay" onClick={onClose}>
      <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <div className="upgrade-modal-header">
          <div className="upgrade-header-content">
            <h2 className="upgrade-modal-title">
              {isSubscribed ? 'Subscription Management' : 'Unlock Your Full Potential'}
            </h2>
            <p className="upgrade-modal-subtitle">
              {isSubscribed ? (
                `You're currently on the ${userProfile.planType || 'Professional'} plan.`
              ) : (
                `You've used ${userProfile?.usageCount || 0} of your ${userProfile?.usageLimit || 5} free generations. 
                 Upgrade to keep creating professional content.`
              )}
            </p>
          </div>
          <button className="upgrade-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {isSubscribed ? (
          <div className="subscription-management">
            <div className="current-plan-card">
              <div className="plan-header">
                <h3>Current Plan: {userProfile.planType || 'Professional'}</h3>
                <div className="plan-status">
                  <span className="status-indicator active"></span>
                  <span>Active</span>
                </div>
              </div>
              <div className="plan-details">
                <p>Your subscription is active and will renew automatically.</p>
                <p>Generations used: {userProfile.usageCount || 0} this month</p>
              </div>
            </div>

            <div className="management-actions">
              <button 
                className="manage-billing-btn"
                onClick={handleManageBilling}
              >
                <div className="button-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <circle cx="12" cy="16" r="1"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div>
                  <div className="button-title">Manage Billing</div>
                  <div className="button-subtitle">Update payment method, view invoices, cancel subscription</div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="pricing-cards">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`pricing-card ${selectedPlan === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
                onClick={() => handleCardClick(plan.id)}
              >
                {plan.popular && (
                  <div className="popular-badge">
                    <span>Most Popular</span>
                  </div>
                )}
                
                <div className="pricing-header">
                  <h3 className="plan-name">{plan.name}</h3>
                  <p className="plan-description">{plan.description}</p>
                  <div className="plan-price">
                    <span className="price-currency">$</span>
                    <span className="price-amount">{plan.price}</span>
                    <span className="price-period">/{plan.period}</span>
                  </div>
                </div>

                <div className="plan-features">
                  <ul>
                    {plan.features.map((feature, index) => (
                      <li key={index} className="feature-item">
                        <div className="feature-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20,6 9,17 4,12"></polyline>
                          </svg>
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button 
                  className={`plan-select-btn ${selectedPlan === plan.id ? 'selected' : ''} ${isProcessing ? 'processing' : ''}`}
                  onClick={(e) => handleButtonClick(e, plan.id)}
                  disabled={isProcessing}
                >
                  {isProcessing && selectedPlan === plan.id ? (
                    <div className="processing-content">
                      <div className="processing-spinner"></div>
                      <span>Processing...</span>
                    </div>
                  ) : selectedPlan === plan.id ? (
                    'Upgrade Now'
                  ) : (
                    'Select Plan'
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="upgrade-error">
            <div className="error-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <span>{error}</span>
          </div>
        )}

        <div className="upgrade-footer">
          <div className="security-badges">
            <div className="security-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <circle cx="12" cy="16" r="1"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>Secure Payment</span>
            </div>
            <div className="security-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"/>
                <path d="M21 12c.552 0 1-.448 1-1V5c0-.552-.448-1-1-1H3c-.552 0-1 .448-1 1v6c0 .552.448 1 1 1h18z"/>
              </svg>
              <span>Cancel Anytime</span>
            </div>
            <div className="security-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                <path d="M8 12l2 2 4-4"/>
              </svg>
              <span>Money Back Guarantee</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
