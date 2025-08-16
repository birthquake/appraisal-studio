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
  
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showOptionalFields, setShowOptionalFields] = useState(false);

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

  // Generate property description using our secure API
  const generateDescription = async () => {
    setIsGenerating(true);
    setError('');
    
    try {
      const response = await fetch('/api/property', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyData: propertyData
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedDescription(data.description);
      
    } catch (err) {
      console.error('API Error:', err);
      setError('Failed to generate description. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy to clipboard function
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedDescription);
      // Could add a toast notification here later
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Get selected special features as an array
  const getSelectedFeatures = () => {
    return Object.entries(propertyData.specialFeatures)
      .filter(([key, value]) => value)
      .map(([key, value]) => {
        // Convert camelCase to readable text
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      });
  };

  return (
    <div className="App">
      {/* Header */}
      <header className="app-header">
        <div className="container">
          <h1 className="logo">AppraisalStudio</h1>
          <p className="tagline">AI-powered content for real estate professionals</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container">
        <div className="generator-section">
          <h2>Property Description Generator</h2>
          
          {/* Property Input Form */}
          <div className="form-grid">
            {/* Required Fields Section */}
            <div className="section-header">
              <h3>Basic Property Information</h3>
              <p className="section-subtitle">Required fields to generate your description</p>
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
                  ({showOptionalFields ? 'Hide' : 'Show'} additional fields for richer descriptions)
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
              onClick={generateDescription}
              disabled={isGenerating || !propertyData.address || !propertyData.price}
            >
              {isGenerating ? 'Generating with AI...' : 'Generate Description'}
            </button>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>

          {/* Generated Content */}
          {generatedDescription && (
            <div className="result-section">
              <h3>AI-Generated Property Description</h3>
              <div className="generated-content">
                <p>{generatedDescription}</p>
                <div className="result-actions">
                  <button className="copy-btn" onClick={copyToClipboard}>
                    Copy to Clipboard
                  </button>
                  <div className="word-count">
                    {generatedDescription.split(' ').length} words
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
