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
    if (actualMessage.toLowerCase().includes("email not registered")) {
      return "This email is not registered. Please sign up first or check your email address.";
    }
    
    if (actualMessage.toLowerCase().includes("incorrect password")) {
      return "The password you entered is incorrect. Please check your password and try again.";
    }
    
    if (actualMessage.toLowerCase().includes("invalid email or password")) {
      return "The email or password you entered is incorrect. Please check your credentials and try again.";
    }
    
    if (actualMessage.toLowerCase().includes("already exists") || 
        actualMessage.toLowerCase().includes("user already exists")) {
      return "An account with this email already exists. Please sign in instead.";
    }
    
    if (actualMessage.toLowerCase().includes("email is required")) {
      return "Email is required. Please enter your email address.";
    }
    
    if (actualMessage.toLowerCase().includes("name is required")) {
      return "Name is required. Please enter your name.";
    }
    
    if (actualMessage.toLowerCase().includes("name is too long")) {
      return "Name is too long. Please use a name with less than 100 characters.";
    }
    
    if (actualMessage.toLowerCase().includes("email address is too long")) {
      return "Email address is too long. Please use an email address with less than 254 characters.";
    }
    
    if (actualMessage.toLowerCase().includes("account creation failed")) {
      // Extract the actual error from "Account creation failed: ..." format
      const failedMatch = actualMessage.match(/Account creation failed:\s*(.+)/i);
      if (failedMatch && failedMatch[1]) {
        return failedMatch[1].trim();
      }
      return "Unable to create account. Please check your information and try again.";
    }
    
    if (actualMessage.toLowerCase().includes("please enter a valid email")) {
      return "Please enter a valid email address.";
    }
    
    if (actualMessage.toLowerCase().includes("invalid email")) {
      return "Please enter a valid email address.";
    }
    
    if (actualMessage.toLowerCase().includes("password is required")) {
      return "Password is required. Please enter your password.";
    }
    
    if (actualMessage.toLowerCase().includes("account setup incomplete")) {
      return "Your account setup is incomplete. Please contact support or reset your password.";
    }
    
    if (actualMessage.toLowerCase().includes("password does not meet requirements")) {
      return "Your password does not meet the requirements. Please check your password and try again.";
    }
    
    if (actualMessage.toLowerCase().includes("password must")) {
      return actualMessage; // Return the specific password requirement message
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
  if (errorMessage.includes("Server Error") || errorMessage.includes("server error")) {
    return "A server error occurred. Please try again in a moment. If the problem persists, contact support.";
  }
  
  if (errorMessage.includes("Failed to") || errorMessage.includes("Sign in failed")) {
    // Extract the actual error from "Sign in failed: ..." format
    const failedMatch = errorMessage.match(/Sign in failed:\s*(.+)/i);
    if (failedMatch && failedMatch[1]) {
      return failedMatch[1].trim();
    }
    return errorMessage;
  }
  
  if (errorMessage.includes("Network") || errorMessage.includes("network")) {
    return "Network connection error. Please check your internet connection and try again.";
  }
  
  if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
    return "The request took too long. Please check your connection and try again.";
  }

  // If we have a meaningful message, return it
  if (errorMessage.length > 0 && errorMessage.length < 200 && 
      !errorMessage.includes("[CONVEX") && 
      !errorMessage.includes("Request ID")) {
    return errorMessage;
  }

  // Generic fallback - but try to be more helpful
  return "Unable to complete your request. Please check your information and try again. If the problem continues, contact support.";
}
