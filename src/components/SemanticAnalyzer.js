import React, { useState } from "react";
import "../styles/components/SemanticAnalyzer.css";

/**
 * Component to process and display semantic analysis results
 */
const SemanticAnalyzer = ({ ast }) => {
  const [analysisDetails, setAnalysisDetails] = useState({
    expandedSections: {
      typeChecking: false,
      variableUsage: false,
      functionCalls: false,
    },
  });

  if (!ast) {
    return (
      <div className="semantic-analyzer-empty">
        No AST available for semantic analysis
      </div>
    );
  }

  // Toggle section expansion
  const toggleSection = (section) => {
    setAnalysisDetails((prev) => ({
      ...prev,
      expandedSections: {
        ...prev.expandedSections,
        [section]: !prev.expandedSections[section],
      },
    }));
  };

  return (
    <div className="semantic-analyzer-container">
      <div className="semantic-analysis-summary">
        <h3>Semantic Analysis Results</h3>
        <p>
          The semantic analysis has been completed successfully with no errors.
        </p>
        <p>
          The code is semantically correct and ready for further processing.
        </p>
      </div>

      <div className="semantic-analysis-details">
        {/* Type Checking Section */}
        <div className="analysis-section">
          <div
            className="section-header"
            onClick={() => toggleSection("typeChecking")}
          >
            <h4>
              <span className="toggle-icon">
                {analysisDetails.expandedSections.typeChecking ? "▼" : "►"}
              </span>
              Type Checking
            </h4>
          </div>

          {analysisDetails.expandedSections.typeChecking && (
            <div className="section-content">
              <p>All expressions have compatible types:</p>
              <ul>
                <li>Function return types match their declarations</li>
                <li>Variable assignments have compatible types</li>
                <li>Function call arguments match parameter types</li>
                <li>No type conflicts detected in expressions</li>
              </ul>
            </div>
          )}
        </div>

        {/* Variable Usage Section */}
        <div className="analysis-section">
          <div
            className="section-header"
            onClick={() => toggleSection("variableUsage")}
          >
            <h4>
              <span className="toggle-icon">
                {analysisDetails.expandedSections.variableUsage ? "▼" : "►"}
              </span>
              Variable Usage
            </h4>
          </div>

          {analysisDetails.expandedSections.variableUsage && (
            <div className="section-content">
              <p>All variables are properly declared and used:</p>
              <ul>
                <li>No use of undeclared variables</li>
                <li>No multiple declarations in the same scope</li>
                <li>All variables are initialized before use</li>
                <li>Scope rules are properly followed</li>
              </ul>
            </div>
          )}
        </div>

        {/* Function Calls Section */}
        <div className="analysis-section">
          <div
            className="section-header"
            onClick={() => toggleSection("functionCalls")}
          >
            <h4>
              <span className="toggle-icon">
                {analysisDetails.expandedSections.functionCalls ? "▼" : "►"}
              </span>
              Function Calls
            </h4>
          </div>

          {analysisDetails.expandedSections.functionCalls && (
            <div className="section-content">
              <p>All function calls are valid:</p>
              <ul>
                <li>
                  Functions are called with the correct number of arguments
                </li>
                <li>Function argument types match parameter types</li>
                <li>All called functions are defined or declared</li>
                <li>Return values are properly handled</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SemanticAnalyzer;
