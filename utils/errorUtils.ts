/**
 * Parses Convex errors and returns user-friendly error messages
 */
export function parseConvexError(error: any): string {
  if (!error) {
    return "An unexpected error occurred. Please try again.";
  }

  const errorMessage = error.message || String(error);
  
  // If it's already a user-friendly message (doesn't contain Convex technical details), return it
  if (!errorMessage.includes("[CONVEX") && !errorMessage.includes("Request ID:")) {
    return errorMessage;
  }

  // Extract the actual error message from Convex error format
  // Format: "[CONVEX M(function:name)] [Request ID: xxx] Actual error message"
  const match = errorMessage.match(/\]\s+(.+)$/);
  if (match && match[1]) {
    const actualMessage = match[1].trim();
    
    // Check for common error patterns and provide user-friendly messages
    if (actualMessage.toLowerCase().includes("invalid email or password")) {
      return "Invalid email or password. Please check your credentials and try again.";
    }
    
    if (actualMessage.toLowerCase().includes("user already exists")) {
      return "An account with this email already exists. Please sign in instead.";
    }
    
    if (actualMessage.toLowerCase().includes("invalid email")) {
      return "Please enter a valid email address.";
    }
    
    if (actualMessage.toLowerCase().includes("password")) {
      return "Password requirements not met. Please check your password and try again.";
    }
    
    if (actualMessage.toLowerCase().includes("network") || actualMessage.toLowerCase().includes("fetch")) {
      return "Network error. Please check your internet connection and try again.";
    }
    
    if (actualMessage.toLowerCase().includes("timeout")) {
      return "Request timed out. Please try again.";
    }
    
    // Return the extracted message if it's already user-friendly
    if (actualMessage.length > 0 && actualMessage.length < 200) {
      return actualMessage;
    }
  }

  // Fallback messages based on error type
  if (errorMessage.includes("Server Error")) {
    return "A server error occurred. Please try again in a moment.";
  }
  
  if (errorMessage.includes("Failed to")) {
    return errorMessage;
  }

  // Generic fallback
  return "Something went wrong. Please try again or contact support if the problem persists.";
}
