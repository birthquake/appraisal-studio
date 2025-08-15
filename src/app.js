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
    features: ''
  });
  
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPropertyData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Generate property description (placeholder for now)
  const generateDescription = async () => {
    setIsGenerating(true);
    
    // Simulate API call for now - we'll add real AI later
    setTimeout(() => {
      const mockDescription = `Beautiful ${propertyData.bedrooms} bedroom, ${propertyData.bathrooms} bathroom home located at ${propertyData.address}. This stunning ${propertyData.sqft} square foot property features ${propertyData.features} and is priced at $${propertyData.price}. Perfect for families looking for comfort and style in a desirable neighborhood.`;
      
      setGeneratedDescription(mockDescription);
      setIsGenerating(false);
    }, 2000);
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
                placeholder="Updated kitchen, hardwood floors, large backyard, garage..."
                rows="3"
              />
            </div>

            <button 
              className="generate-btn"
              onClick={generateDescription}
              disabled={isGenerating || !propertyData.address}
            >
              {isGenerating ? 'Generating...' : 'Generate Description'}
            </button>
          </div>

          {/* Generated Content */}
          {generatedDescription && (
            <div className="result-section">
              <h3>Generated Property Description</h3>
              <div className="generated-content">
                <p>{generatedDescription}</p>
                <button className="copy-btn">Copy to Clipboard</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
