# Security and Best Practices Review

## Executive Summary

This document outlines security vulnerabilities and best practice improvements identified in the codebase. Critical issues have been addressed, and recommendations are provided for remaining items.

## Critical Security Issues Fixed

### 1. ✅ Authentication & Authorization
**Issue**: Many mutations lacked proper authentication and authorization checks.

**Fixed**:
- Added `currentUserId` parameter to user update mutations
- Implemented ownership checks (users can only modify their own data unless admin)
- Added role-based access control for admin-only operations
- Created `convex/security.ts` with reusable security helpers

**Files Modified**:
- `convex/users.ts` - User update, profile picture mutations
- `convex/authHelpers.ts` - Sign up validation
- `convex/security.ts` - New security utilities

### 2. ✅ Input Validation & Sanitization
**Issue**: User inputs were not properly validated or sanitized.

**Fixed**:
- Added email validation with RFC 5322 compliant regex
- Added name length validation (max 100 characters)
- Implemented input sanitization (trim, lowercase for emails)
- Added password strength validation

**Files Modified**:
- `convex/authHelpers.ts` - Sign up validation
- `convex/users.ts` - User update validation
- `convex/security.ts` - Validation utilities

### 3. ✅ Password Security
**Issue**: Password validation was weak, no complexity requirements.

**Fixed**:
- Added password strength requirements:
  - Minimum 8 characters
  - Maximum 128 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- Added validation before password hashing

**Note**: SHA-256 is still used for hashing. For production, consider:
- bcrypt with salt rounds (10-12)
- argon2 (recommended for new systems)
- scrypt

**Files Modified**:
- `convex/authHelpers.ts` - Password validation

## High Priority Issues (Recommended Fixes)

### 4. ⚠️ Password Hashing Algorithm
**Current**: SHA-256 (not suitable for password hashing)
**Recommended**: Use bcrypt, argon2, or scrypt with proper salt

**Impact**: High - Passwords are vulnerable to rainbow table attacks
**Effort**: Medium

**Recommendation**:
```typescript
// Consider using a library like bcryptjs or implementing argon2
import bcrypt from 'bcryptjs';

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
```

### 5. ⚠️ Rate Limiting
**Issue**: No rate limiting on authentication endpoints or API calls.

**Impact**: High - Vulnerable to brute force attacks
**Effort**: Medium

**Recommendation**:
- Implement rate limiting on sign-in attempts (e.g., 5 attempts per 15 minutes per IP)
- Add rate limiting to password reset endpoints
- Consider using Redis for distributed rate limiting in production
- Basic rate limiting helper added to `convex/security.ts` (in-memory, upgrade to Redis for production)

### 6. ⚠️ File Upload Security
**Current**: Basic file type and size validation
**Recommended**: Enhanced validation

**Issues**:
- MIME type validation is basic
- No virus scanning
- File size limits could be more restrictive
- No file content validation (only extension/MIME type)

**Recommendations**:
```typescript
// Enhanced file validation
const ALLOWED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB for profile pictures

function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size exceeds 2MB limit' };
  }
  
  // Check extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_IMAGE_TYPES.includes(extension)) {
    return { valid: false, error: 'Invalid file type' };
  }
  
  // Validate MIME type matches extension
  const mimeMap: Record<string, string[]> = {
    jpg: ['image/jpeg'],
    jpeg: ['image/jpeg'],
    png: ['image/png'],
    gif: ['image/gif'],
    webp: ['image/webp'],
  };
  
  if (mimeMap[extension] && !mimeMap[extension].includes(file.type)) {
    return { valid: false, error: 'File type mismatch' };
  }
  
  return { valid: true };
}
```

### 7. ⚠️ localStorage Security
**Issue**: Sensitive data stored in localStorage (userId, userRole, etc.)

**Impact**: Medium - Vulnerable to XSS attacks
**Effort**: Low-Medium

**Recommendations**:
- Consider using httpOnly cookies for sensitive data
- Use sessionStorage for temporary data
- Implement proper session management
- Add Content Security Policy (CSP) headers
- Sanitize all user inputs before rendering

**Current Usage**:
- `localStorage.getItem("userId")` - Used throughout the app
- `localStorage.getItem("userRole")` - Used for authorization checks
- `localStorage.getItem("userName")` - Used for display

**Recommendation**: Move to secure, httpOnly cookies or implement proper session tokens.

### 8. ⚠️ Error Message Information Disclosure
**Issue**: Some error messages expose internal details.

**Impact**: Low-Medium - Information disclosure
**Effort**: Low

**Recommendations**:
- Use generic error messages for authentication failures
- Log detailed errors server-side only
- Don't expose database structure in error messages
- Implement error logging service

**Example**:
```typescript
// Bad
throw new Error(`User with email ${email} not found`);

// Good
throw new Error("Invalid email or password");
```

### 9. ⚠️ Missing Authorization Checks
**Issue**: Some mutations may still lack proper authorization.

**Impact**: High - Unauthorized access
**Effort**: Medium

**Recommendations**:
- Audit all mutations for authorization checks
- Use the security helpers from `convex/security.ts`
- Implement consistent authorization pattern:
  ```typescript
  const user = await requireAuth(ctx, args.userId, "admin");
  ```

**Files to Review**:
- `convex/votes.ts` - Check all mutations
- `convex/events.ts` - Check admin-only operations
- `convex/forms.ts` - Check form creation/editing
- `convex/tickets.ts` - Check ticket operations
- `convex/suggestions.ts` - Check suggestion operations

## Medium Priority Issues

### 10. ⚠️ Input Sanitization for XSS
**Issue**: User-generated content may not be properly sanitized.

**Impact**: Medium - XSS vulnerabilities
**Effort**: Low

**Recommendations**:
- React automatically escapes content, but verify all user inputs
- Sanitize rich text content if using markdown/HTML
- Use DOMPurify for any HTML content
- Validate and sanitize all form inputs

### 11. ⚠️ SQL Injection (N/A for Convex)
**Status**: Not applicable - Convex uses parameterized queries
**Note**: Convex's query API is safe from SQL injection

### 12. ⚠️ CSRF Protection
**Issue**: No explicit CSRF protection.

**Impact**: Medium - CSRF attacks
**Effort**: Medium

**Recommendations**:
- Implement CSRF tokens for state-changing operations
- Use SameSite cookies
- Verify origin/referer headers for sensitive operations

### 13. ⚠️ Security Headers
**Issue**: Missing security headers.

**Impact**: Medium - Various attacks
**Effort**: Low

**Recommendations**:
Add to `next.config.ts`:
```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
        },
      ],
    },
  ];
}
```

## Best Practices Improvements

### 14. Code Organization
**Recommendations**:
- ✅ Created `convex/security.ts` for reusable security functions
- Consider creating middleware for common authorization patterns
- Extract validation logic into separate modules
- Use TypeScript more strictly (enable strict mode)

### 15. Error Handling
**Recommendations**:
- Implement consistent error handling pattern
- Create custom error classes
- Add error logging service
- Return user-friendly error messages

### 16. Logging
**Recommendations**:
- Implement structured logging
- Log security events (failed logins, unauthorized access attempts)
- Don't log sensitive data (passwords, tokens)
- Use log levels appropriately

### 17. Testing
**Recommendations**:
- Add unit tests for security functions
- Add integration tests for authorization
- Test input validation
- Test file upload security

### 18. Documentation
**Recommendations**:
- Document security assumptions
- Document authorization rules
- Add security guidelines for developers
- Document password requirements

## Implementation Checklist

### Critical (Do Immediately)
- [x] Add authentication checks to user mutations
- [x] Add input validation and sanitization
- [x] Add password strength requirements
- [x] Add authorization checks to profile picture operations

### High Priority (Do Soon)
- [ ] Upgrade password hashing to bcrypt/argon2
- [ ] Implement rate limiting
- [ ] Enhance file upload validation
- [ ] Audit all mutations for authorization
- [ ] Review error messages for information disclosure

### Medium Priority (Do When Possible)
- [ ] Implement CSRF protection
- [ ] Add security headers
- [ ] Move sensitive data from localStorage
- [ ] Add comprehensive logging
- [ ] Add security testing

### Low Priority (Nice to Have)
- [ ] Add security documentation
- [ ] Implement security monitoring
- [ ] Add security headers
- [ ] Create security guidelines

## Notes

1. **Convex Security**: Convex provides built-in protection against SQL injection through its query API. However, authorization and input validation must be implemented by the application.

2. **Password Hashing**: The current SHA-256 implementation is a temporary solution. For production, implement proper password hashing with salt.

3. **Rate Limiting**: The in-memory rate limiting in `convex/security.ts` is suitable for development. For production, use Redis or a dedicated rate limiting service.

4. **Session Management**: Consider implementing proper session management with secure tokens instead of relying on localStorage.

5. **Regular Audits**: Schedule regular security audits, especially after adding new features.

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Convex Security Best Practices](https://docs.convex.dev/security)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
