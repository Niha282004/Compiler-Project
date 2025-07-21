import React from "react";
import "../styles/components/SyntaxErrors.css";

const SyntaxErrors = ({ errors, code }) => {
  if (!errors || errors.length === 0) {
    return <div className="no-errors">No syntax errors detected.</div>;
  }

  // Function to show context around error
  const renderErrorContext = (error) => {
    if (!code || !error.location) return null;

    const { start, end } = error.location;

    // Extract lines for context
    const lines = code.split("\n");
    let lineNumber = 1;
    let currentPos = 0;

    // Find the line number where the error occurs
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for newline
      if (currentPos + lineLength > start) {
        lineNumber = i + 1;
        break;
      }
      currentPos += lineLength;
    }

    // Get some lines before and after for context
    const startLine = Math.max(0, lineNumber - 2);
    const endLine = Math.min(lines.length, lineNumber + 2);

    const contextLines = [];

    for (let i = startLine; i < endLine; i++) {
      const isErrorLine = i + 1 === lineNumber;

      contextLines.push(
        <div key={i} className={`code-line ${isErrorLine ? "error-line" : ""}`}>
          <span className="line-number">{i + 1}</span>
          <span className="line-content">{lines[i]}</span>
        </div>
      );

      // Add the error indicator arrow on the error line
      if (isErrorLine) {
        // Calculate the position of the caret
        const errorPos = start - currentPos;
        const spaces = " ".repeat(errorPos);

        contextLines.push(
          <div key={`${i}-indicator`} className="error-indicator">
            <span className="line-number"></span>
            <span className="line-content">
              {spaces}^ {error.message}
            </span>
          </div>
        );
      }
    }

    return <div className="error-context">{contextLines}</div>;
  };

  return (
    <div className="syntax-errors">
      <h3>Syntax Errors</h3>
      {errors.map((error, index) => (
        <div key={index} className="error-item">
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error.message}
          </div>
          {renderErrorContext(error)}
        </div>
      ))}
    </div>
  );
};

export default SyntaxErrors;
