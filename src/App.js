import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // State for our property description form
  const [propertyData, setPropertyData] = useState({
    // Required fields
    address: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    features: '',
    propertyType: 'Single Family Home',
    
    // Optional fields
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
  
  // Content type selection
  const [contentType, setContentType] = useState('description');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [notification, setNotification] = useState(null);
  const [generatedCount, setGeneratedCount] = useState(0);

  // Content type options with enhanced SVG icons
  const contentTypes = [
    {
      id: 'description',
      name: 'Property Description',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
      ),
      description: 'Professional MLS/marketing descriptions',
      gradient: 'from-blue-500 to-blue-700'
    },
    {
      id: 'social_listing',
      name: 'Social Media Post',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      ),
      description: 'Facebook/Instagram listing announcements',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      id: 'email_alert',
      name: 'Email Template',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
      description: 'New listing alerts for clients',
      gradient: 'from-green-500 to-teal-500'
    },
    {
      id: 'marketing_flyer',
      name: 'Marketing Highlights',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      ),
      description: 'Key selling points for flyers',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      id: 'just_listed',
      name: 'Just Listed Post',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ),
      description: 'Celebration announcement posts',
      gradient: 'from-yellow-500 to-orange-500'
    },
    {
      id: 'open_house',
      name: 'Open House Invite',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <path d="M9 22V12h6v10"/>
          <circle cx="12" cy="8" r="2"/>
        </svg>
      ),
      description: 'Open house event announcements',
      gradient: 'from-indigo-500 to-purple-500'
    }
  ];

  // Toast notification system
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPropertyData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle checkbox changes for special features
  const handleFeatureChange = (featureName) => {
    setPropertyData(prev => ({
      ...prev,
      specialFeatures: {
        ...prev.specialFeatures,
        [featureName]: !prev.specialFeatures[featureName]
      }
    }));
  };

  // Generate content using our enhanced API
  const generateContent = async () => {
    setIsGenerating(true);
    setError('');
    
    try {
      const response = await fetch('/api/property', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      setGeneratedContent(data.content || data.description);
      setGeneratedCount(prev => prev + 1);
      showNotification(`${currentContentType.name} generated successfully!`);
      
    } catch (err) {
      console.error('API Error:', err);
      setError('Failed to generate content. Please try again.');
      showNotification('Failed to generate content. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy to clipboard function with better feedback
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      showNotification('Content copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      showNotification('Failed to copy content. Please try again.', 'error');
    }
  };

  // Download as text file
  const downloadContent = () => {
    const element = document.createElement('a');
    const file = new Blob([generatedContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${currentContentType.name.replace(/\s+/g, '_')}_${propertyData.address.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showNotification('Content downloaded successfully!');
  };

  // Get current content type info
  const currentContentType = contentTypes.find(type => type.id === contentType);

  // Auto-hide error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="App">
      {/* Toast Notification */}
      {notification && (
        <div className={`toast toast-${notification.type}`}>
          <div className="toast-content">
            <span className="toast-icon">
              {notification.type === 'success' ? '✓' : '⚠'}
            </span>
            {notification.message}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="container">
          <div className="header-content">
            <div className="logo-section">
              <h1 className="logo">AppraisalStudio</h1>
              <p className="tagline">AI-powered content suite for real estate professionals</p>
            </div>
            <div className="stats-badge">
              <span className="stats-number">{generatedCount}</span>
              <span className="stats-label">Generated</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container">
        <div className="generator-section">
          <div className="section-intro">
            <h2>Real Estate Content Generator</h2>
            <p className="section-description">
              Enter your property details once, then generate professional content for every marketing channel
            </p>
          </div>
          
          {/* Property Input Form */}
          <div className="form-card">
            <div className="form-header">
              <h3>Property Information</h3>
              <p className="form-subtitle">Fill out the details below to power your AI content generation</p>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Property Address *</label>
                <input
                  type="text"
                  name="address"
                  value={propertyData.address}
                  onChange={handleInputChange}
                  placeholder="123 Main Street, City, State"
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Property Type *</label>
                  <select
                    name="propertyType"
                    value={propertyData.propertyType}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="Single Family Home">Single Family Home</option>
                    <option value="Condo">Condo</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Multi-Family">Multi-Family</option>
                    <option value="Land">Land</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Price *</label>
                  <input
                    type="text"
                    name="price"
                    value={propertyData.price}
                    onChange={handleInputChange}
                    placeholder="450,000"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Bedrooms</label>
                  <input
                    type="number"
                    name="bedrooms"
                    value={propertyData.bedrooms}
                    onChange={handleInputChange}
                    placeholder="3"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Bathrooms</label>
                  <input
                    type="number"
                    name="bathrooms"
                    value={propertyData.bathrooms}
                    onChange={handleInputChange}
                    placeholder="2"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Square Feet</label>
                  <input
                    type="number"
                    name="sqft"
                    value={propertyData.sqft}
                    onChange={handleInputChange}
                    placeholder="2500"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Key Features</label>
                <textarea
                  name="features"
                  value={propertyData.features}
                  onChange={handleInputChange}
                  placeholder="Updated kitchen, hardwood floors, large backyard, garage, master suite, etc."
                  rows="3"
                  className="form-textarea"
                />
              </div>

              {/* Optional Fields Toggle */}
              <div className="optional-toggle">
                <button
                  type="button"
                  className="toggle-btn"
                  onClick={() => setShowOptionalFields(!showOptionalFields)}
                >
                  <span className="toggle-icon">
                    {showOptionalFields ? '▼' : '▶'}
                  </span>
                  Optional Details 
                  <span className="toggle-subtitle">
                    ({showOptionalFields ? 'Hide' : 'Show'} additional fields for richer content)
                  </span>
                </button>
              </div>

              {/* Optional Fields Section */}
              {showOptionalFields && (
                <div className="optional-section">
                  <div className="section-divider"></div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Year Built</label>
                      <input
                        type="number"
                        name="yearBuilt"
                        value={propertyData.yearBuilt}
                        onChange={handleInputChange}
                        placeholder="2020"
                        min="1800"
                        max={new Date().getFullYear()}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Parking</label>
                      <select
                        name="parking"
                        value={propertyData.parking}
                        onChange={handleInputChange}
                        className="form-select"
                      >
                        <option value="">Select parking type</option>
                        <option value="Attached Garage">Attached Garage</option>
                        <option value="Detached Garage">Detached Garage</option>
                        <option value="Carport">Carport</option>
                        <option value="Driveway">Driveway</option>
                        <option value="Street Parking">Street Parking</option>
                        <option value="None">No Parking</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Property Condition</label>
                      <select
                        name="condition"
                        value={propertyData.condition}
                        onChange={handleInputChange}
                        className="form-select"
                      >
                        <option value="">Select condition</option>
                        <option value="Excellent">Excellent</option>
                        <option value="Good">Good</option>
                        <option value="Needs Updates">Needs Updates</option>
                        <option value="Fixer-Upper">Fixer-Upper</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Lot Size</label>
                      <input
                        type="text"
                        name="lotSize"
                        value={propertyData.lotSize}
                        onChange={handleInputChange}
                        placeholder="0.25 acres or 10,890 sq ft"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>School District</label>
                      <input
                        type="text"
                        name="schoolDistrict"
                        value={propertyData.schoolDistrict}
                        onChange={handleInputChange}
                        placeholder="Dublin City Schools"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Neighborhood Description</label>
                    <textarea
                      name="neighborhood"
                      value={propertyData.neighborhood}
                      onChange={handleInputChange}
                      placeholder="Quiet family neighborhood, close to parks, shopping, and highways. Tree-lined streets with sidewalks."
                      rows="2"
                      className="form-textarea"
                    />
                  </div>

                  {/* Special Features Checkboxes */}
                  <div className="form-group">
                    <label>Special Features</label>
                    <div className="checkbox-grid">
                      {Object.entries(propertyData.specialFeatures).map(([feature, isChecked]) => (
                        <label key={feature} className="checkbox-item">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleFeatureChange(feature)}
                          />
                          <span className="checkmark"></span>
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

          {/* Content Type Selection */}
          <div className="content-type-section">
            <div className="section-header">
              <h3>Choose Content Type</h3>
              <p className="section-subtitle">Select the type of content you want to generate from your property details</p>
            </div>
            
            <div className="content-type-grid">
              {contentTypes.map((type) => (
                <div
                  key={type.id}
                  className={`content-type-card ${contentType === type.id ? 'selected' : ''}`}
                  onClick={() => setContentType(type.id)}
                >
                  <div className="content-type-icon">{type.icon}</div>
                  <div className="content-type-info">
                    <h4>{type.name}</h4>
                    <p>{type.description}</p>
                  </div>
                  <div className="selection-indicator">
                    {contentType === type.id && (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Generate Button */}
            <button 
              className="generate-btn"
              onClick={generateContent}
              disabled={isGenerating || !propertyData.address || !propertyData.price}
            >
              {isGenerating ? (
                <div className="loading-content">
                  <div className="spinner"></div>
                  Generating with AI...
                </div>
              ) : (
                <>
                  <span className="btn-icon">{currentContentType.icon}</span>
                  Generate {currentContentType.name}
                </>
              )}
            </button>

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠</span>
                {error}
              </div>
            )}
          </div>

          {/* Generated Content */}
          {generatedContent && (
            <div className="result-section">
              <div className="result-header">
                <h3>AI-Generated {currentContentType.name}</h3>
                <div className="result-badge">
                  <span className="badge-icon">✨</span>
                  Ready to use
                </div>
              </div>
              
              <div className="generated-content">
                <div className="content-preview">
                  <div className="content-type-label">
                    <div className="label-icon">{currentContentType.icon}</div>
                    {currentContentType.name}
                  </div>
                  <div className="content-text">
                    {generatedContent}
                  </div>
                </div>
                
                <div className="result-actions">
                  <div className="action-buttons">
                    <button className="copy-btn" onClick={copyToClipboard}>
                      <span className="btn-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      </span>
                      Copy to Clipboard
                    </button>
                    
                    <button className="download-btn" onClick={downloadContent}>
                      <span className="btn-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7,10 12,15 17,10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </span>
                      Download
                    </button>
                  </div>
                  
                  <div className="content-stats">
                    <span className="stat-item">
                      <strong>{generatedContent.split(' ').length}</strong> words
                    </span>
                    <span className="stat-item">
                      <strong>{generatedContent.length}</strong> characters
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
