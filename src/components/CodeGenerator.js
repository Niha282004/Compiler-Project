import React, { useState } from "react";
import "../styles/components/CodeGenerator.css";

/**
 * Component to display code generation results
 */
const CodeGenerator = ({ codeGenResult }) => {
  const [activeView, setActiveView] = useState("intermediate");
  const [showStatistics, setShowStatistics] = useState(true);

  if (!codeGenResult) {
    return (
      <div className="code-generator-container">
        <div className="code-generator-empty">
          No code generation data available
        </div>
      </div>
    );
  }

  const {
    intermediateCode,
    optimizedCode,
    assemblyCode,
    stringLiterals,
    statistics,
    errors,
  } = codeGenResult;

  // If there are errors, display them
  if (errors && errors.length > 0) {
    return (
      <div className="code-generator-container">
        <div className="code-generator-errors">
          <h3>Code Generation Errors</h3>
          {errors.map((error, index) => (
            <div key={index} className="error-item">
              <span className="error-icon">⚠️</span>
              <span className="error-message">{error.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="code-generator-container">
      <div className="code-generator-header">
        <h3>Code Generation Results</h3>

        {/* View Selector */}
        <div className="view-selector">
          <button
            className={`view-btn ${
              activeView === "intermediate" ? "active" : ""
            }`}
            onClick={() => setActiveView("intermediate")}
          >
            Intermediate Code
          </button>
          <button
            className={`view-btn ${activeView === "optimized" ? "active" : ""}`}
            onClick={() => setActiveView("optimized")}
          >
            Optimized Code
          </button>
          <button
            className={`view-btn ${activeView === "assembly" ? "active" : ""}`}
            onClick={() => setActiveView("assembly")}
          >
            Assembly Code
          </button>
          <button
            className={`view-btn ${activeView === "data" ? "active" : ""}`}
            onClick={() => setActiveView("data")}
          >
            Data & Stats
          </button>
        </div>
      </div>

      <div className="code-generator-content">
        {/* Statistics Panel */}
        {showStatistics && statistics && (
          <div className="statistics-panel">
            <div className="stats-header">
              <h4>Generation Statistics</h4>
              <button
                className="toggle-stats"
                onClick={() => setShowStatistics(!showStatistics)}
              >
                ×
              </button>
            </div>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Instructions:</span>
                <span className="stat-value">
                  {statistics.instructionCount || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Optimized:</span>
                <span className="stat-value">
                  {statistics.optimizedInstructionCount || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Temp Variables:</span>
                <span className="stat-value">
                  {statistics.tempVariables || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Labels:</span>
                <span className="stat-value">{statistics.labels || 0}</span>
              </div>
              {statistics.instructionCount > 0 && (
                <div className="stat-item">
                  <span className="stat-label">Optimization:</span>
                  <span className="stat-value optimization">
                    {(
                      ((statistics.instructionCount -
                        statistics.optimizedInstructionCount) /
                        statistics.instructionCount) *
                      100
                    ).toFixed(1)}
                    % reduction
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Code Display Area */}
        <div className="code-display-area">
          {activeView === "intermediate" && (
            <div className="code-section">
              <div className="section-header">
                <h4>Three Address Code (TAC)</h4>
                <p className="section-description">
                  Intermediate representation showing basic operations and
                  control flow
                </p>
              </div>
              <div className="code-block">
                <pre className="code-content intermediate-code">
                  {intermediateCode || "No intermediate code generated"}
                </pre>
              </div>
            </div>
          )}

          {activeView === "optimized" && (
            <div className="code-section">
              <div className="section-header">
                <h4>Optimized Intermediate Code</h4>
                <p className="section-description">
                  Intermediate code after basic optimizations (constant folding,
                  dead code elimination)
                </p>
              </div>
              <div className="code-block">
                <pre className="code-content optimized-code">
                  {optimizedCode || "No optimized code available"}
                </pre>
              </div>

              {/* Optimization Summary */}
              {statistics.instructionCount > 0 && (
                <div className="optimization-summary">
                  <h5>Optimizations Applied:</h5>
                  <ul>
                    <li>Constant folding for arithmetic operations</li>
                    <li>Dead code elimination for unused assignments</li>
                    <li>
                      Reduced from {statistics.instructionCount} to{" "}
                      {statistics.optimizedInstructionCount} instructions
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeView === "assembly" && (
            <div className="code-section">
              <div className="section-header">
                <h4>x86 Assembly Code</h4>
                <p className="section-description">
                  Generated assembly code for x86 architecture
                </p>
              </div>
              <div className="code-block">
                <pre className="code-content assembly-code">
                  {assemblyCode || "No assembly code generated"}
                </pre>
              </div>

              <div className="assembly-notes">
                <h5>Assembly Notes:</h5>
                <ul>
                  <li>Generated for x86 32-bit architecture</li>
                  <li>Uses AT&T syntax</li>
                  <li>Assumes System V ABI calling convention</li>
                  <li>String literals stored in .data section</li>
                </ul>
              </div>
            </div>
          )}

          {activeView === "data" && (
            <div className="code-section">
              <div className="section-header">
                <h4>Data Structures & Analysis</h4>
                <p className="section-description">
                  String literals, constants, and generation analysis
                </p>
              </div>

              {/* String Literals */}
              {stringLiterals && Object.keys(stringLiterals).length > 0 && (
                <div className="data-subsection">
                  <h5>String Literals</h5>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Label</th>
                        <th>Value</th>
                        <th>Length</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stringLiterals).map(([label, value]) => (
                        <tr key={label}>
                          <td className="label-cell">{label}</td>
                          <td className="value-cell">{value}</td>
                          <td className="length-cell">{value.length - 2}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Detailed Statistics */}
              <div className="data-subsection">
                <h5>Detailed Statistics</h5>
                <div className="detailed-stats">
                  <div className="stat-group">
                    <h6>Code Generation</h6>
                    <div className="stat-list">
                      <div className="stat-row">
                        <span>Original Instructions:</span>
                        <span>{statistics.instructionCount || 0}</span>
                      </div>
                      <div className="stat-row">
                        <span>Optimized Instructions:</span>
                        <span>{statistics.optimizedInstructionCount || 0}</span>
                      </div>
                      <div className="stat-row">
                        <span>Temporary Variables:</span>
                        <span>{statistics.tempVariables || 0}</span>
                      </div>
                      <div className="stat-row">
                        <span>Generated Labels:</span>
                        <span>{statistics.labels || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="stat-group">
                    <h6>Memory Usage</h6>
                    <div className="stat-list">
                      <div className="stat-row">
                        <span>String Literals:</span>
                        <span>{Object.keys(stringLiterals || {}).length}</span>
                      </div>
                      <div className="stat-row">
                        <span>String Memory:</span>
                        <span>
                          {Object.values(stringLiterals || {}).reduce(
                            (total, str) => total + str.length,
                            0
                          )}{" "}
                          bytes
                        </span>
                      </div>
                    </div>
                  </div>

                  {statistics.instructionCount > 0 && (
                    <div className="stat-group">
                      <h6>Optimization Impact</h6>
                      <div className="stat-list">
                        <div className="stat-row">
                          <span>Instructions Removed:</span>
                          <span>
                            {statistics.instructionCount -
                              statistics.optimizedInstructionCount}
                          </span>
                        </div>
                        <div className="stat-row">
                          <span>Size Reduction:</span>
                          <span>
                            {(
                              ((statistics.instructionCount -
                                statistics.optimizedInstructionCount) /
                                statistics.instructionCount) *
                              100
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Code Generation Process */}
              <div className="data-subsection">
                <h5>Code Generation Process</h5>
                <div className="process-flow">
                  <div className="process-step completed">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h6>AST Traversal</h6>
                      <p>Recursive traversal of Abstract Syntax Tree</p>
                    </div>
                  </div>
                  <div className="process-step completed">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h6>TAC Generation</h6>
                      <p>Generate Three Address Code instructions</p>
                    </div>
                  </div>
                  <div className="process-step completed">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h6>Optimization</h6>
                      <p>Apply basic optimizations to intermediate code</p>
                    </div>
                  </div>
                  <div className="process-step completed">
                    <div className="step-number">4</div>
                    <div className="step-content">
                      <h6>Assembly Generation</h6>
                      <p>Convert optimized TAC to target assembly</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Statistics Button (when hidden) */}
      {!showStatistics && (
        <button
          className="show-stats-btn"
          onClick={() => setShowStatistics(true)}
        >
          Show Statistics
        </button>
      )}
    </div>
  );
};

export default CodeGenerator;
