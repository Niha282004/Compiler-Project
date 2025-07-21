import React from "react";
import "../styles/components/Legend.css";

const Legend = () => {
  // Color coding for different token types
  const tokenTypes = [
    {
      type: "keyword",
      description: "C language keywords (if, else, while, etc.)",
    },
    { type: "type", description: "Data types (int, float, char, etc.)" },
    { type: "identifier", description: "Variable and function names" },
    { type: "number", description: "Numeric literals" },
    { type: "string", description: "String literals enclosed in quotes" },
    { type: "operator", description: "Operators (+, -, *, /, etc.)" },
    { type: "punctuation", description: "Punctuation marks (;, {, }, etc.)" },
    { type: "comment", description: "Comments (// and /* */)" },
    { type: "error", description: "Lexical errors" },
  ];

  return (
    <div className="token-legend">
      <h3>Color Legend</h3>
      <div className="legend-items">
        {tokenTypes.map((item, index) => (
          <div key={index} className="legend-item">
            <span className={`legend-color token-${item.type}`}></span>
            <span className="legend-type">{item.type}</span>
            <span className="legend-description">{item.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Legend;
