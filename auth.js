// DOM Elements
const toast = document.getElementById('toast');

// Helper: Show Toast
function showToast(message, type = 'success') {
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Check auth status on load
window.addEventListener('load', () => {
    // Only redirect if on login/signup pages
    if (window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html')) {
        const user = localStorage.getItem('srrn_user');
        if (user) {
            window.location.href = 'dashboard.html';
        }
    }
});

// Login Form Submit
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.textContent = 'Signing in...';
        btn.disabled = true;

        try {
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;

            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');

            // Store user in localStorage
            localStorage.setItem('srrn_user', JSON.stringify(data.user));
            showToast('Login successful', 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 1000);

        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.textContent = 'Sign In';
            btn.disabled = false;
        }
    });
}

// Signup Form Submit
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.textContent = 'Creating account...';
        btn.disabled = true;

        try {
            const username = document.getElementById('signupUsername').value.trim();
            const password = document.getElementById('signupPassword').value;

            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Signup failed');

            showToast('Account created! Redirecting to login...', 'success');
            setTimeout(() => window.location.href = 'login.html', 1500);

        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.textContent = 'Sign Up';
            btn.disabled = false;
        }
    });
}

// Forgot Password Submit
const forgotForm = document.getElementById('forgotForm');
if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.textContent = 'Resetting...';
        btn.disabled = true;

        try {
            const username = document.getElementById('forgotUsername').value.trim();
            const newPassword = document.getElementById('newPassword').value;

            const res = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, newPassword })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Reset failed');

            showToast('Password reset! Redirecting to login...', 'success');
            setTimeout(() => window.location.href = 'login.html', 1500);

        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.textContent = 'Reset Password';
            btn.disabled = false;
        }
    });
}
