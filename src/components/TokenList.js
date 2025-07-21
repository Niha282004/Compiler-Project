import React, { useState } from "react";
import "../styles/components/TokenList.css";

const TokenList = ({ tokens }) => {
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const tokensPerPage = 20;

  if (!tokens || tokens.length === 0) {
    return <div className="token-list-empty">No tokens to display</div>;
  }

  // Filter tokens by type if filter is active
  const filteredTokens =
    filterType === "all"
      ? tokens
      : tokens.filter((token) => token.type === filterType);

  // Calculate pagination
  const totalPages = Math.ceil(filteredTokens.length / tokensPerPage);
  const startIndex = (currentPage - 1) * tokensPerPage;
  const displayTokens = filteredTokens.slice(
    startIndex,
    startIndex + tokensPerPage
  );

  // Get unique token types for filter
  const tokenTypes = ["all", ...new Set(tokens.map((token) => token.type))];

  return (
    <div className="token-list-container">
      <div className="token-list-controls">
        <div className="token-filter">
          <label>Filter by type:</label>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1); // Reset to first page when filter changes
            }}
          >
            {tokenTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="token-pagination">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </button>
        </div>
      </div>

      <table className="token-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Type</th>
            <th>Value</th>
            <th>Position</th>
            <th>Line:Column</th>
          </tr>
        </thead>
        <tbody>
          {displayTokens.map((token, index) => (
            <tr key={index} className={`token-row token-${token.type}`}>
              <td>{startIndex + index + 1}</td>
              <td>{token.type}</td>
              <td className="token-value">
                {token.type === "string" ? `"${token.value}"` : token.value}
              </td>
              <td>
                {token.start}-{token.end}
              </td>
              <td>
                {token.line}:{token.column}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filteredTokens.length === 0 && (
        <div className="no-tokens-message">
          No tokens match the selected filter
        </div>
      )}
    </div>
  );
};

export default TokenList;
