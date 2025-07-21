import React from "react";
import "../styles/components/TokenStatistics.css";

const TokenStatistics = ({ tokens }) => {
  if (!tokens || tokens.length === 0) {
    return <div className="token-stats-empty">No tokens to analyze</div>;
  }

  // Count tokens by type
  const tokenCounts = tokens.reduce((counts, token) => {
    counts[token.type] = (counts[token.type] || 0) + 1;
    return counts;
  }, {});

  // Calculate percentages
  const totalTokens = tokens.length;
  const typePercentages = Object.keys(tokenCounts).map((type) => ({
    type,
    count: tokenCounts[type],
    percentage: ((tokenCounts[type] / totalTokens) * 100).toFixed(1),
  }));

  // Sort by count (descending)
  typePercentages.sort((a, b) => b.count - a.count);

  return (
    <div className="token-statistics">
      <h3>Token Statistics</h3>

      <div className="stats-summary">
        <div className="stat-item">
          <span className="stat-label">Total Tokens:</span>
          <span className="stat-value">{totalTokens}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Unique Types:</span>
          <span className="stat-value">{Object.keys(tokenCounts).length}</span>
        </div>
      </div>

      <h4>Distribution by Type</h4>
      <div className="token-distribution">
        <div className="distribution-bars">
          {typePercentages.map((item, index) => (
            <div key={index} className="distribution-item">
              <div className="type-label">{item.type}</div>
              <div className="type-bar-container">
                <div
                  className={`type-bar type-${item.type}`}
                  style={{ width: `${item.percentage}%` }}
                >
                  <span className="bar-label">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TokenStatistics;
