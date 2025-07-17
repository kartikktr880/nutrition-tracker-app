import React from 'react';

interface ErrorDisplayProps {
  error: Error;
  resetError: () => void;
  title?: string;
  showDetails?: boolean;
  retryText?: string;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  resetError,
  title = 'Something went wrong',
  showDetails = false,
  retryText = 'Try again',
  className = ''
}) => {
  const handleRetry = () => {
    try {
      resetError();
    } catch (retryError: unknown) {
      // recordError('Error retry failed', retryError instanceof Error ? retryError.message : String(retryError));
    }
  };

  return (
    <div className={`error-display ${className}`}>
      <div className="error-content">
        <h2 className="error-title">{title}</h2>
        <p className="error-message">{error.message}</p>
        
        {showDetails && error.stack && (
          <div className="error-details">
            <pre className="error-stack">{error.stack}</pre>
          </div>
        )}

        <button 
          className="error-retry-button"
          onClick={handleRetry}
          aria-label="Retry operation"
        >
          {retryText}
        </button>
      </div>

      <style jsx>{`
        .error-display {
          padding: 2rem;
          border-radius: 8px;
          background-color: #fff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          max-width: 600px;
          margin: 2rem auto;
        }

        .error-content {
          text-align: center;
        }

        .error-title {
          color: #e53e3e;
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        .error-message {
          color: #4a5568;
          margin-bottom: 1.5rem;
        }

        .error-details {
          margin: 1rem 0;
          padding: 1rem;
          background-color: #f7fafc;
          border-radius: 4px;
          text-align: left;
        }

        .error-stack {
          font-family: monospace;
          font-size: 0.875rem;
          color: #4a5568;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .error-retry-button {
          background-color: #4299e1;
          color: white;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          transition: background-color 0.2s;
        }

        .error-retry-button:hover {
          background-color: #3182ce;
        }

        .error-retry-button:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5);
        }
      `}</style>
    </div>
  );
}; 