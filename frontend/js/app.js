// ===========================================================
// app.js — shared helpers used by every page:
//   - apiRequest(): wraps fetch() with the JWT header & errors
//   - saveSession() / getSession() / clearSession(): localStorage
//   - showAlert(): success/error banners
//   - renderNav(): swaps the topbar links based on login state
// ===========================================================

const API_BASE = ''; // same-origin, since Express serves the frontend too

async function apiRequest(path, method = 'GET', body = null) {
  const session = getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session && session.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // If the token is invalid/expired, clear it so the user re-logs-in
    if (res.status === 401) clearSession();
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

function saveSession(token, user) {
  localStorage.setItem('ser_token', token);
  localStorage.setItem('ser_user', JSON.stringify(user));
}

function getSession() {
  const token = localStorage.getItem('ser_token');
  const userRaw = localStorage.getItem('ser_user');
  if (!token || !userRaw) return null;
  try {
    return { token, user: JSON.parse(userRaw) };
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem('ser_token');
  localStorage.removeItem('ser_user');
}

function showAlert(containerId, message, type = 'error') {
  const box = document.getElementById(containerId);
  if (!box) return;
  box.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

// Updates the top navigation depending on whether someone is logged in,
// and what role they have. Call this on page load.
function renderNav() {
  const nav = document.querySelector('.topbar nav');
  if (!nav) return;
  const session = getSession();

  if (!session) {
    nav.innerHTML = `<a href="index.html">Report</a><a href="login.html">Login</a>`;
    return;
  }

  const { user } = session;
  const isStaff = user.role === 'admin' || user.role === 'responder';
  nav.innerHTML = `
    ${isStaff ? '<a href="dashboard.html">Dashboard</a>' : '<a href="index.html">Report</a><a href="my-reports.html">My Reports</a>'}
    <a href="#" id="logoutLink">Logout (${user.fullName.split(' ')[0]})</a>
  `;

  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      clearSession();
      window.location.href = 'login.html';
    });
  }
}

document.addEventListener('DOMContentLoaded', renderNav);
