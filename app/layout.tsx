import type { Metadata } from "next";
import { Merriweather, Lora } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { LanguageProvider } from "@/components/LanguageProvider";

const merriweather = Merriweather({
  weight: ["300", "400", "700"],
  variable: "--font-serif",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-serif-alt",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Palmware",
  description: "Modern ticketing system with AI-powered assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate, max-age=0, private" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        {/* Disable bfcache for security */}
        <meta name="robots" content="noarchive, noindex, nofollow" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // CRITICAL: IMMEDIATE blocking auth check - runs before ANY rendering
              // This MUST run synchronously before React or any other scripts
              (function() {
                try {
                  if (typeof window === 'undefined' || typeof document === 'undefined') return;
                  
                  var pathname = window.location.pathname;
                  var isProtectedRoute = pathname.startsWith('/workplace') || pathname.startsWith('/tickets') || 
                      pathname.startsWith('/forms') || pathname.startsWith('/users') ||
                      pathname.startsWith('/profile') || pathname.startsWith('/settings') ||
                      pathname.startsWith('/notifications') || pathname.startsWith('/approvals') ||
                      pathname.startsWith('/todos') || pathname.startsWith('/events') ||
                      pathname.startsWith('/voting') || pathname.startsWith('/suggestions') ||
                      pathname.startsWith('/sla') || pathname.startsWith('/roles') ||
                      pathname.startsWith('/service-catalog') || pathname.startsWith('/translations') ||
                      pathname.startsWith('/announcements');
                  
                  if (isProtectedRoute) {
                    // Check logout flag in multiple places (cookie is most reliable for bfcache)
                    function getCookie(name) {
                      var nameEQ = name + '=';
                      var ca = document.cookie.split(';');
                      for (var i = 0; i < ca.length; i++) {
                        var c = ca[i];
                        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
                        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
                      }
                      return null;
                    }
                    
                    var loggedOutCookie = getCookie('loggedOut');
                    var loggedOutSession = sessionStorage.getItem('loggedOut');
                    var logoutTimestamp = localStorage.getItem('logoutTimestamp');
                    var userId = localStorage.getItem('userId');
                    var pageUnloaded = sessionStorage.getItem('pageUnloaded');
                    var pageUnloadedCookie = getCookie('pageUnloaded');
                    
                    // Check if logout happened recently (within last hour)
                    var recentlyLoggedOut = false;
                    if (logoutTimestamp) {
                      var logoutTime = parseInt(logoutTimestamp, 10);
                      var now = Date.now();
                      recentlyLoggedOut = (now - logoutTime) < 3600000; // 1 hour
                    }
                    
                    // If page was unloaded and no userId, it might be bfcache restoration after logout
                    var suspiciousRestore = (pageUnloaded || pageUnloadedCookie) && !userId;
                    
                    // CRITICAL CHECK: If logged out flag is set OR no userId OR recently logged out OR suspicious restore, redirect IMMEDIATELY
                    if (loggedOutCookie === 'true' || loggedOutSession === 'true' || recentlyLoggedOut || !userId || suspiciousRestore) {
                      // Clear logout flags
                      try {
                        document.cookie = 'loggedOut=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict';
                        document.cookie = 'pageUnloaded=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict';
                        sessionStorage.removeItem('loggedOut');
                        sessionStorage.removeItem('logoutTimestamp');
                        sessionStorage.removeItem('pageUnloaded');
                        localStorage.removeItem('logoutTimestamp');
                      } catch(e) {}
                      
                      // Replace history to prevent back navigation
                      window.history.replaceState(null, '', '/login');
                      // CRITICAL: Use location.replace (not href) to prevent back navigation - this is BLOCKING
                      window.location.replace('/login');
                      // Prevent any further execution
                      return;
                    }
                    
                    // Clear pageUnloaded flag if we have valid auth
                    if (userId) {
                      try {
                        sessionStorage.removeItem('pageUnloaded');
                        document.cookie = 'pageUnloaded=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict';
                      } catch(e) {}
                    }
                  }
                  
                  // Set up pagehide listener to prevent bfcache for protected pages
                  window.addEventListener('pagehide', function(event) {
                    var pathname = window.location.pathname;
                    var isProtected = pathname.startsWith('/workplace') || pathname.startsWith('/tickets') || 
                        pathname.startsWith('/forms') || pathname.startsWith('/users') ||
                        pathname.startsWith('/profile') || pathname.startsWith('/settings') ||
                        pathname.startsWith('/notifications') || pathname.startsWith('/approvals') ||
                        pathname.startsWith('/todos') || pathname.startsWith('/events') ||
                        pathname.startsWith('/voting') || pathname.startsWith('/suggestions') ||
                        pathname.startsWith('/sla') || pathname.startsWith('/roles') ||
                        pathname.startsWith('/service-catalog') || pathname.startsWith('/translations') ||
                        pathname.startsWith('/announcements');
                    
                    if (isProtected) {
                      // Set flag to detect bfcache restoration
                      try {
                        var timestamp = Date.now().toString();
                        sessionStorage.setItem('pageUnloaded', timestamp);
                        // Also set in cookie as backup (persists across bfcache)
                        document.cookie = 'pageUnloaded=' + timestamp + ';path=/;max-age=60;SameSite=Strict';
                      } catch(e) {}
                    }
                  }, { once: false });
                  
                  // Set up pageshow listener to check on bfcache restoration
                  window.addEventListener('pageshow', function(event) {
                    var pathname = window.location.pathname;
                    var isProtected = pathname.startsWith('/workplace') || pathname.startsWith('/tickets') || 
                        pathname.startsWith('/forms') || pathname.startsWith('/users') ||
                        pathname.startsWith('/profile') || pathname.startsWith('/settings') ||
                        pathname.startsWith('/notifications') || pathname.startsWith('/approvals') ||
                        pathname.startsWith('/todos') || pathname.startsWith('/events') ||
                        pathname.startsWith('/voting') || pathname.startsWith('/suggestions') ||
                        pathname.startsWith('/sla') || pathname.startsWith('/roles') ||
                        pathname.startsWith('/service-catalog') || pathname.startsWith('/translations') ||
                        pathname.startsWith('/announcements');
                    
                    if (isProtected && event.persisted) {
                      // Page was restored from bfcache - re-check auth IMMEDIATELY
                      function getCookie(name) {
                        var nameEQ = name + '=';
                        var ca = document.cookie.split(';');
                        for (var i = 0; i < ca.length; i++) {
                          var c = ca[i];
                          while (c.charAt(0) === ' ') c = c.substring(1, c.length);
                          if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
                        }
                        return null;
                      }
                      
                      var userId = localStorage.getItem('userId');
                      var loggedOutCookie = getCookie('loggedOut');
                      var pageUnloaded = sessionStorage.getItem('pageUnloaded') || getCookie('pageUnloaded');
                      
                      if (!userId || loggedOutCookie === 'true' || pageUnloaded) {
                        window.history.replaceState(null, '', '/login');
                        window.location.replace('/login');
                      }
                    }
                  }, { once: false });
                } catch(e) {
                  // If anything fails, redirect to login for safety
                  try {
                    window.location.replace('/login');
                  } catch(e2) {}
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${merriweather.variable} ${lora.variable} antialiased`}
      >
        <LanguageProvider>
          <Providers>{children}</Providers>
        </LanguageProvider>
      </body>
    </html>
  );
}
