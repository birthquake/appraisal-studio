import React, { useState } from 'react';
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

  // Content type options with clean SVG icons
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
      description: 'Professional MLS/marketing descriptions'
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
      description: 'Facebook/Instagram listing announcements'
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
      description: 'New listing alerts for clients'
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
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      ),
      description: 'Key selling points for flyers'
    },
    {
      id: 'just_listed',
      name: 'Just Listed Post',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ),
      description: 'Celebration announcement posts'
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
      description: 'Open house event announcements'
    }
  ];

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
      
    } catch (err) {
      console.error('API Error:', err);
      setError('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy to clipboard function
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      // Could add a toast notification here later
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Get current content type info
  const currentContentType = contentTypes.find(type => type.id === contentType);

  return (
    <div className="App">
      {/* Header */}
      <header className="app-header">
        <div className="container">
          <h1 className="logo">AppraisalStudio</h1>
          <p className="tagline">AI-powered content suite for real estate professionals</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container">
        <div className="generator-section">
          <h2>Real Estate Content Generator</h2>
          
          {/* Property Input Form */}
          <div className="form-grid">
            {/* Required Fields Section */}
            <div className="section-header">
              <h3>Property Information</h3>
              <p className="section-subtitle">Enter property details once, then generate multiple content types</p>
            </div>

            <div className="form-group">
              <label>Property Address *</label>
              <input
                type="text"
                name="address"
                value={propertyData.address}
                onChange={handleInputChange}
                placeholder="123 Main Street, City, State"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Property Type *</label>
                <select
                  name="propertyType"
                  value={propertyData.propertyType}
                  onChange={handleInputChange}
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
              />
            </div>

            {/* Optional Fields Toggle */}
            <div className="optional-toggle">
              <button
                type="button"
                className="toggle-btn"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
              >
                {showOptionalFields ? '▼' : '▶'} Optional Details 
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
                    />
                  </div>

                  <div className="form-group">
                    <label>Parking</label>
                    <select
                      name="parking"
                      value={propertyData.parking}
                      onChange={handleInputChange}
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
                        {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          
          {/* Property Input Form */}
          <div className="form-grid">
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
                </div>
              ))}
            </div>

            {/* Generate Button */}
            <button 
              className="generate-btn"
              onClick={generateContent}
              disabled={isGenerating || !propertyData.address || !propertyData.price}
            >
              {isGenerating ? 'Generating with AI...' : `Generate ${currentContentType.name}`}
            </button>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>

          {/* Generated Content */}
          {generatedContent && (
            <div className="result-section">
              <h3>AI-Generated {currentContentType.name}</h3>
              <div className="generated-content">
                <div className="content-preview">
                  <div className="content-type-label">
                    <div className="label-icon">{currentContentType.icon}</div>
                    {currentContentType.name}
                  </div>
                  <p>{generatedContent}</p>
                </div>
                <div className="result-actions">
                  <button className="copy-btn" onClick={copyToClipboard}>
                    Copy to Clipboard
                  </button>
                  <div className="content-stats">
                    <span className="word-count">
                      {generatedContent.split(' ').length} words
                    </span>
                    <span className="char-count">
                      {generatedContent.length} characters
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
