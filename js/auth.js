/* ==========================================================================
   CLOUD-BASED ATTENDANCE MANAGEMENT SYSTEM
   Authentication, Session Management & Role-Based Access Control
   ========================================================================== */

// Demo Accounts Reference for Quick Testing
const DEMO_ACCOUNTS = {
  admin: {
    email: 'admin@college.edu',
    password: 'password123',
    role: 'admin',
    name: 'Dr. Robert Vance (Admin)'
  },
  teacher: {
    email: 'teacher@college.edu',
    password: 'password123',
    role: 'teacher',
    name: 'Prof. Sarah Jenkins'
  },
  student: {
    email: 'student@college.edu',
    password: 'password123',
    role: 'student',
    name: 'Alex Johnson',
    rollNo: 'CSE-2024-042'
  }
};

/**
 * Handle User Login
 * @param {string} email
 * @param {string} password
 * @param {string} expectedRole ('admin' | 'teacher' | 'student' | null)
 */
async function loginUser(email, password, expectedRole = null) {
  const submitBtn = document.querySelector('button[type="submit"]');
  let originalBtnText = '';
  if (submitBtn) {
    originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span> Authenticating...`;
  }

  try {
    // 1. Live Firebase Cloud Authentication
    if (window.isFirebaseConfigured && window.isFirebaseConfigured() && window.auth && window.db) {
      const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Fetch user profile from Firestore 'users' collection
      const userDoc = await window.db.collection('users').doc(user.uid).get();

      let userData = null;
      if (userDoc.exists) {
        userData = userDoc.data();
      } else {
        // Fallback: check if doc exists by email query
        const querySnap = await window.db.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
        if (!querySnap.empty) {
          userData = querySnap.docs[0].data();
        }
      }

      if (!userData) {
        throw new Error('User profile record not found in Cloud Firestore.');
      }

      const role = (userData.role || '').toLowerCase();

      // Enforce role check if a specific login portal was used
      if (expectedRole && role !== expectedRole.toLowerCase()) {
        await window.auth.signOut();
        throw new Error(`Unauthorized role access: This portal is for ${expectedRole.toUpperCase()}s only. Your account role is "${role.toUpperCase()}".`);
      }

      // Store cached session info
      sessionStorage.setItem('currentUserId', user.uid);
      sessionStorage.setItem('currentUserRole', role);
      sessionStorage.setItem('currentUserName', userData.name || user.email);
      sessionStorage.setItem('currentUserEmail', user.email);

      showToast('Login Successful', `Welcome back, ${userData.name || user.email}!`, 'success');
      setTimeout(() => redirectBasedOnRole(role), 800);
      return;
    }

    // 2. Demo Mode Fallback (Allows immediate review if Firebase keys not entered yet)
    console.warn("Firebase not configured. Using Demo Test Mode.");
    const roleKey = Object.keys(DEMO_ACCOUNTS).find(r => DEMO_ACCOUNTS[r].email.toLowerCase() === email.toLowerCase());
    
    if (roleKey && DEMO_ACCOUNTS[roleKey].password === password) {
      const acc = DEMO_ACCOUNTS[roleKey];
      if (expectedRole && acc.role !== expectedRole.toLowerCase()) {
        throw new Error(`Role mismatch: This login is for ${expectedRole} accounts.`);
      }

      sessionStorage.setItem('currentUserId', `demo-${acc.role}`);
      sessionStorage.setItem('currentUserRole', acc.role);
      sessionStorage.setItem('currentUserName', acc.name);
      sessionStorage.setItem('currentUserEmail', acc.email);
      sessionStorage.setItem('isDemoMode', 'true');

      showToast('Demo Login Active', `Signed in as ${acc.name} (${acc.role.toUpperCase()}).`, 'info');
      setTimeout(() => redirectBasedOnRole(acc.role), 800);
      return;
    } else {
      throw new Error('Invalid email or password. You can click one of the demo buttons below or check your credentials.');
    }
  } catch (error) {
    console.error("Login error:", error);
    let errorMsg = error.message;
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      errorMsg = 'Invalid email address or password. Please verify and try again.';
    }
    showToast('Login Failed', errorMsg, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }
}

/**
 * Redirect user to their designated dashboard
 */
function redirectBasedOnRole(role) {
  const r = (role || '').toLowerCase();
  switch (r) {
    case 'admin':
      window.location.href = 'admin-dashboard.html';
      break;
    case 'teacher':
      window.location.href = 'teacher-dashboard.html';
      break;
    case 'student':
      window.location.href = 'student-dashboard.html';
      break;
    default:
      window.location.href = 'login.html';
  }
}

/**
 * Handle Logout
 */
async function logoutUser() {
  try {
    if (window.auth) {
      await window.auth.signOut();
    }
  } catch (e) {
    console.warn("SignOut notice:", e);
  } finally {
    sessionStorage.clear();
    localStorage.removeItem('rememberedUser');
    window.location.href = 'login.html';
  }
}

/**
 * Route Guard for Dashboards
 * Ensures the logged in user has the required role.
 * @param {Array<string>} allowedRoles
 */
function enforceAuthGuard(allowedRoles = []) {
  const isDemo = sessionStorage.getItem('isDemoMode') === 'true';
  const sessionRole = sessionStorage.getItem('currentUserRole');

  // Handle Demo Mode session
  if (isDemo && sessionRole) {
    if (allowedRoles.length && !allowedRoles.includes(sessionRole)) {
      showToast('Access Denied', `You do not have permission to view this dashboard.`, 'error');
      setTimeout(() => redirectBasedOnRole(sessionRole), 1000);
      return;
    }
    populateUserProfileUI({
      name: sessionStorage.getItem('currentUserName') || 'Demo User',
      role: sessionRole,
      email: sessionStorage.getItem('currentUserEmail') || ''
    });
    return;
  }

  // Handle Live Firebase Authentication
  if (window.auth) {
    window.auth.onAuthStateChanged(async (user) => {
      if (!user) {
        sessionStorage.clear();
        window.location.href = 'login.html';
        return;
      }

      try {
        if (window.db) {
          const userDoc = await window.db.collection('users').doc(user.uid).get();
          if (!userDoc.exists) {
            showToast('Account Error', 'User record not found in Firestore.', 'error');
            await window.auth.signOut();
            window.location.href = 'login.html';
            return;
          }

          const userData = userDoc.data();
          const role = (userData.role || '').toLowerCase();

          if (allowedRoles.length && !allowedRoles.includes(role)) {
            showToast('Access Denied', 'Unauthorized page access. Redirecting...', 'error');
            setTimeout(() => redirectBasedOnRole(role), 1000);
            return;
          }

          sessionStorage.setItem('currentUserId', user.uid);
          sessionStorage.setItem('currentUserRole', role);
          sessionStorage.setItem('currentUserName', userData.name || user.email);
          sessionStorage.setItem('currentUserEmail', user.email);

          populateUserProfileUI(userData);
        }
      } catch (err) {
        console.error("Auth state verify error:", err);
      }
    });
  } else if (!sessionRole) {
    // If Firebase not ready and no session, redirect to login
    window.location.href = 'login.html';
  }
}

/**
 * Update Sidebar Profile UI elements
 */
function populateUserProfileUI(userData) {
  const nameEl = document.getElementById('sidebarUserName');
  const roleEl = document.getElementById('sidebarUserRole');
  const avatarEl = document.getElementById('sidebarUserAvatar');

  const name = userData.name || 'User';
  const role = (userData.role || 'Member').toUpperCase();

  if (nameEl) nameEl.textContent = name;
  if (roleEl) {
    roleEl.textContent = role;
    roleEl.className = `user-role-badge badge role-${role.toLowerCase()}`;
  }
  if (avatarEl) {
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    avatarEl.textContent = initials || 'U';
  }
}

/**
 * Quick Fill Helper for Demo Pill Buttons
 */
function fillDemoCredentials(role) {
  const acc = DEMO_ACCOUNTS[role];
  if (!acc) return;

  const emailInput = document.getElementById('email') || document.querySelector('input[type="email"]');
  const passInput = document.getElementById('password') || document.querySelector('input[type="password"]');

  if (emailInput) emailInput.value = acc.email;
  if (passInput) passInput.value = acc.password;

  showToast('Demo Credentials Filled', `Email: ${acc.email} | Password: ${acc.password}`, 'info');
}

/**
 * Toggle Password Visibility
 */
function setupPasswordToggle() {
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (input && input.tagName === 'INPUT') {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.innerHTML = isPassword ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupPasswordToggle();
});
