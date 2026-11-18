/* ==========================================================================
   CLOUD-BASED ATTENDANCE MANAGEMENT SYSTEM
   Firebase Cloud Database & Authentication Configuration
   ========================================================================== */

/**
 * FIREBASE SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new Firebase project (e.g. "Cloud-Attendance-System").
 * 3. Enable "Email/Password" in: Authentication -> Sign-in method.
 * 4. Enable "Cloud Firestore" in: Firestore Database -> Create database (Start in test mode or production with rules).
 * 5. In Project Settings (gear icon) -> General -> Your apps -> Click the Web (</>) icon.
 * 6. Copy the `firebaseConfig` keys and replace the placeholder values below.
 */

const firebaseConfig = {
  apiKey: "PASTE_YOUR_FIREBASE_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

// Check if Firebase credentials have been configured
function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes("PASTE_YOUR") &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.includes("PASTE_YOUR")
  );
}

// Global Firebase references
let app = null;
let auth = null;
let db = null;

try {
  if (typeof firebase !== 'undefined') {
    if (isFirebaseConfigured()) {
      app = firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db = firebase.firestore();
      console.log("✅ Firebase initialized successfully with cloud project:", firebaseConfig.projectId);
    } else {
      console.warn("⚠️ Firebase configuration contains placeholder keys. Please update js/firebase-config.js with your project credentials.");
      showConfigNotice();
    }
  } else {
    console.error("❌ Firebase SDK CDN not loaded. Please ensure script tags are present in HTML.");
  }
} catch (error) {
  console.error("❌ Firebase initialization error:", error);
}

// Display helpful setup notice banner if configuration is pending
function showConfigNotice() {
  if (document.getElementById('firebaseConfigNotice')) return;

  const banner = document.createElement('div');
  banner.id = 'firebaseConfigNotice';
  banner.className = 'config-banner';
  banner.innerHTML = `
    <div>
      <strong><i class="fa-solid fa-cloud-bolt"></i> Firebase Cloud Setup Required:</strong>
      Please paste your Firebase credentials into <code>js/firebase-config.js</code> to connect your live Firestore database & authentication.
    </div>
    <div style="display: flex; gap: 0.5rem; align-items: center;">
      <a href="seed-data.html" class="btn btn-sm btn-secondary" style="color: #1e3a8a; text-decoration: none;">
        <i class="fa-solid fa-database"></i> Setup / Seed Tool
      </a>
      <button onclick="this.parentElement.parentElement.remove()" style="background: transparent; border: none; color: white; cursor: pointer; font-size: 1.1rem;">&times;</button>
    </div>
  `;
  document.body.prepend(banner);
}

// Make globally accessible
window.firebaseConfig = firebaseConfig;
window.isFirebaseConfigured = isFirebaseConfigured;
window.auth = auth;
window.db = db;
