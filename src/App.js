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

  // Content type options
  const contentTypes = [
    {
      id: 'description',
      name: 'Property Description',
      icon: '🏠',
      description: 'Professional MLS/marketing descriptions'
    },
    {
      id: 'social_listing',
      name: 'Social Media Post',
      icon: '📱',
      description: 'Facebook/Instagram listing announcements'
    },
    {
      id: 'email_alert',
      name: 'Email Template',
      icon: '📧',
      description: 'New listing alerts for clients'
    },
    {
      id: 'marketing_flyer',
      name: 'Marketing Highlights',
      icon: '📄',
      description: 'Key selling points for flyers'
    },
    {
      id: 'just_listed',
      name: 'Just Listed Post',
      icon: '🎉',
      description: 'Celebration announcement posts'
    },
    {
      id: 'open_house',
      name: 'Open House Invite',
      icon: '🚪',
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

      setGeneratedContent(data.content);
      
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
          
          {/* Content Type Selector */}
          <div className="content-type-section">
            <h3>Choose Content Type</h3>
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
          </div>

          {/* Current Selection Display */}
          <div className="selected-content-type">
            <div className="selected-type-badge">
              <span className="selected-icon">{currentContentType.icon}</span>
              <span>Generating: <strong>{currentContentType.name}</strong></span>
            </div>
          </div>
          
          {/* Property Input Form */}
          <div className="form-grid">
            {/* Required Fields Section */}
            <div className="section-header">
              <h3>Property Information</h3>
              <p className="section-subtitle">Enter property details for AI content generation</p>
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
                    {currentContentType.icon} {currentContentType.name}
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
