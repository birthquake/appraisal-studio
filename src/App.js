import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  // State management
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
  
  const headerRef = useRef(null);
  const formRef = useRef(null);

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
      gradient: 'from-blue-500 via-blue-600 to-indigo-700',
      accentColor: '#3b82f6',
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
      gradient: 'from-purple-500 via-pink-500 to-rose-600',
      accentColor: '#a855f7',
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
      gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
      accentColor: '#10b981',
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
      gradient: 'from-orange-500 via-amber-500 to-yellow-600',
      accentColor: '#f59e0b',
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
      gradient: 'from-yellow-400 via-orange-500 to-red-500',
      accentColor: '#eab308',
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
      gradient: 'from-indigo-500 via-purple-600 to-pink-600',
      accentColor: '#6366f1',
      estimatedTime: '12-22s'
    }
  ];

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

  // Enhanced content generation
  const generateContent = async () => {
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
      setGeneratedContent(data.content || data.description);
      setGeneratedCount(prev => prev + 1);
      
      // Add to generation history
      const historyItem = {
        id: Date.now(),
        type: contentType,
        content: data.content || data.description,
        timestamp: new Date(),
        generationTime: generationTime
      };
      setGenerationHistory(prev => [historyItem, ...prev.slice(0, 4)]);
      
      showNotification(
        `${currentContentType.name} generated in ${generationTime}s!`,
        'success'
      );
      
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
      showNotification('Content copied to clipboard! ✨', 'success', 2000);
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
    
    showNotification('Content downloaded successfully! 📁', 'success', 2000);
  };

  // Get current content type
  const currentContentType = contentTypes.find(type => type.id === contentType);

  return (
    <div className="app" style={{
      '--mouse-x': `${mousePosition.x}%`,
      '--mouse-y': `${mousePosition.y}%`
    }}>
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
              {notification.type === 'success' ? '✨' : notification.type === 'error' ? '⚠️' : 'ℹ️'}
            </div>
            <span>{notification.message}</span>
            <button 
              className="notification-close"
              onClick={() => setNotification(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Premium header */}
      <header className="header" ref={headerRef}>
        <div className="header-glow"></div>
        <div className="container">
          <div className="header-content">
            <div className="brand-section">
              <div className="logo-container">
                <div className="logo-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9,22 9,12 15,12 15,22"/>
                  </svg>
                </div>
                <div className="brand-text">
                  <h1 className="logo">AppraisalStudio</h1>
                  <p className="tagline">AI-Powered Real Estate Content Suite</p>
                </div>
              </div>
            </div>
            
            <div className="header-stats">
              <div className="stat-card">
                <div className="stat-value">{generatedCount}</div>
                <div className="stat-label">Generated</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{generationHistory.length}</div>
                <div className="stat-label">Recent</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="main">
        <div className="container">
          <div className="hero-section">
            <h2 className="hero-title">
              Transform Property Details Into 
              <span className="gradient-text"> Professional Content</span>
            </h2>
            <p className="hero-subtitle">
              Enter your property information once, then generate unlimited marketing content 
              with AI-powered precision in seconds
            </p>
          </div>

          {/* Enhanced form */}
          <div className="form-section" ref={formRef}>
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
                    <span className="badge-icon">✨</span>
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
      </main>
    </div>
  );
}

export default App;
