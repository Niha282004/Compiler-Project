import React from "react";

/**
 * Component to display semantic errors found during semantic analysis
 */
const SemanticErrors = ({ errors }) => {
  // If no errors or empty error array
  if (!errors || errors.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-md">
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          Semantic Analysis
        </h3>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <p className="font-medium">No semantic errors detected!</p>
          <p className="text-sm">The code passes all semantic checks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 rounded-md">
      <h3 className="text-lg font-medium text-gray-700 mb-2">
        Semantic Errors
      </h3>
      <div className="bg-red-50 border border-red-200 rounded-md">
        <div className="p-3 bg-red-100 border-b border-red-200">
          <span className="text-red-800 font-medium">
            Found {errors.length} semantic{" "}
            {errors.length === 1 ? "error" : "errors"}
          </span>
        </div>
        <ul className="divide-y divide-red-200">
          {errors.map((error, index) => (
            <li key={index} className="p-4 hover:bg-red-50">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  <svg
                    className="h-5 w-5 text-red-500"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800">
                    Line {error.line}: {error.message}
                  </h4>
                  {error.code && (
                    <pre className="mt-1 text-xs text-red-700 bg-red-50 p-2 rounded font-mono">
                      {error.code}
                    </pre>
                  )}
                  <p className="mt-1 text-sm text-red-700">
                    {error.description}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="p-3 bg-red-50 border-t border-red-200 text-sm text-red-700">
          Fix these semantic errors before proceeding with code generation.
        </div>
      </div>
    </div>
  );
};

export default SemanticErrors;
