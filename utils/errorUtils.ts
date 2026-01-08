/**
 * Parses Convex errors and returns user-friendly error messages
 */
export function parseConvexError(error: any): string {
  if (!error) {
    return "An unexpected error occurred. Please try again.";
  }

  const errorMessage = error.message || String(error);
  
  // PRIORITY: Check for authentication errors FIRST, even if wrapped
  // This ensures users always see specific messages for login issues
  const lowerMessage = errorMessage.toLowerCase();
  
  if (lowerMessage.includes("email not registered")) {
    return "Email not registered. Please check your email or sign up.";
  }
  
  if (lowerMessage.includes("incorrect password")) {
    return "Incorrect password. Please check your password.";
  }
  
  if (lowerMessage.includes("password is required")) {
    return "Password is required.";
  }
  
  if (lowerMessage.includes("please enter a valid email") || lowerMessage.includes("invalid email address")) {
    return "Please enter a valid email address.";
  }
  
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
    // Make authentication errors short and specific
    if (actualMessage.toLowerCase().includes("email not registered")) {
      return "Email not registered. Please check your email or sign up.";
    }
    
    if (actualMessage.toLowerCase().includes("incorrect password")) {
      return "Incorrect password. Please check your password.";
    }
    
    if (actualMessage.toLowerCase().includes("invalid email or password")) {
      return "Email or password is incorrect. Please check both and try again.";
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
      return "Password is required.";
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

  // Check for authentication-specific errors FIRST, even if wrapped in "Server Error"
  // This ensures we show specific messages for login issues
  if (errorMessage.toLowerCase().includes("email not registered") || 
      errorMessage.toLowerCase().includes("incorrect password") ||
      errorMessage.toLowerCase().includes("password is required") ||
      errorMessage.toLowerCase().includes("please enter a valid email")) {
    // These are authentication errors - return them directly
    if (errorMessage.toLowerCase().includes("email not registered")) {
      return "Email not registered. Please check your email or sign up.";
    }
    if (errorMessage.toLowerCase().includes("incorrect password")) {
      return "Incorrect password. Please check your password.";
    }
    if (errorMessage.toLowerCase().includes("password is required")) {
      return "Password is required.";
    }
    if (errorMessage.toLowerCase().includes("please enter a valid email")) {
      return "Please enter a valid email address.";
    }
  }
  
  // Check for "Sign in failed" or "Failed to" and extract the actual error
  if (errorMessage.includes("Sign in failed") || errorMessage.includes("Failed to sign in")) {
    // Extract the actual error from "Sign in failed: ..." format
    const failedMatch = errorMessage.match(/(?:Sign in failed|Failed to sign in):\s*(.+)/i);
    if (failedMatch && failedMatch[1]) {
      const extractedError = failedMatch[1].trim();
      // Check if it's an authentication error
      if (extractedError.toLowerCase().includes("email not registered")) {
        return "Email not registered. Please check your email or sign up.";
      }
      if (extractedError.toLowerCase().includes("incorrect password")) {
        return "Incorrect password. Please check your password.";
      }
      return extractedError;
    }
  }
  
  // Only show generic server error if we truly don't know what the error is
  // and it's not an authentication-related error
  if ((errorMessage.includes("Server Error") || errorMessage.includes("server error")) &&
      !errorMessage.toLowerCase().includes("email") &&
      !errorMessage.toLowerCase().includes("password") &&
      !errorMessage.toLowerCase().includes("authentication") &&
      !errorMessage.toLowerCase().includes("sign in")) {
    return "Server error. Please try again.";
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

  // Generic fallback - but try to be more helpful and shorter
  // Check if it might be an authentication error even if not clearly identified
  if (errorMessage.toLowerCase().includes("sign in") || 
      errorMessage.toLowerCase().includes("login") ||
      errorMessage.toLowerCase().includes("authentication")) {
    return "Login failed. Please check your email and password.";
  }
  
  return "Unable to complete your request. Please try again.";
}
