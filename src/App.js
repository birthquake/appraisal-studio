import React, { useState } from 'react';
import './App.css';

function App() {
  // State for our property description form
  const [propertyData, setPropertyData] = useState({
    address: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    features: '',
    propertyType: 'Single Family Home'
  });
  
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPropertyData(prev => ({
      ...prev,
      [name]: value
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
            <div className="form-group">
              <label>Property Address</label>
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
                <label>Property Type</label>
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
                <label>Price</label>
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
                <button className="copy-btn" onClick={copyToClipboard}>
                  Copy to Clipboard
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
