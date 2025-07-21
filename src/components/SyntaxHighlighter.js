import React from "react";
import "../styles/components/SyntaxHighlighter.css";

const SyntaxHighlighter = ({ code, tokens }) => {
  if (!code || code.length === 0) {
    return <div className="syntax-container empty">No code to highlight</div>;
  }

  if (!tokens || tokens.length === 0) {
    return (
      <div className="syntax-container">
        <pre className="code-display">{code}</pre>
      </div>
    );
  }

  // Sort tokens by start position
  const sortedTokens = [...tokens].sort((a, b) => a.start - b.start);

  // Create an array of code segments with their types
  const segments = [];
  let currentPos = 0;

  for (const token of sortedTokens) {
    // If there's a gap between the last position and this token, add it as plain text
    if (token.start > currentPos) {
      segments.push({
        text: code.slice(currentPos, token.start),
        type: "plain",
      });
    }

    // Add the token text with its type
    segments.push({
      text: code.slice(token.start, token.end),
      type: token.type,
    });

    currentPos = token.end;
  }

  // Add any remaining text after the last token
  if (currentPos < code.length) {
    segments.push({
      text: code.slice(currentPos),
      type: "plain",
    });
  }

  // Function to get line numbers
  const getLineNumbers = () => {
    const lines = code.split("\n");
    return (
      <div className="line-numbers">
        {lines.map((_, idx) => (
          <div key={idx} className="line-number">
            {idx + 1}
          </div>
        ))}
      </div>
    );
  };

  // Convert segments to line-based rendering
  const renderHighlightedCode = () => {
    const lines = [""];
    let lineIndex = 0;

    for (const segment of segments) {
      const segmentLines = segment.text.split("\n");

      // First segment line goes on the current line
      lines[lineIndex] += `<span class="${segment.type}">${escapeHtml(
        segmentLines[0]
      )}</span>`;

      // Remaining lines (if any) create new lines
      for (let i = 1; i < segmentLines.length; i++) {
        lineIndex++;
        lines.push(
          `<span class="${segment.type}">${escapeHtml(segmentLines[i])}</span>`
        );
      }
    }

    return (
      <div className="code-content">
        {lines.map((line, idx) => (
          <div
            key={idx}
            className="code-line"
            dangerouslySetInnerHTML={{ __html: line }}
          />
        ))}
      </div>
    );
  };

  // Helper to escape HTML entities
  const escapeHtml = (text) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\t/g, "    "); // Convert tabs to spaces
  };

  return (
    <div className="syntax-container">
      <div className="code-display">
        {getLineNumbers()}
        {renderHighlightedCode()}
      </div>
    </div>
  );
};

export default SyntaxHighlighter;
