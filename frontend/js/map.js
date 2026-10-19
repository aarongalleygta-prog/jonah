// ===========================================================
// map.js — Leaflet + browser Geolocation helpers.
// Used by index.html (pick your location when reporting) and
// dashboard.html (view where each emergency happened).
// ===========================================================

// Wraps navigator.geolocation in a Promise so callers can just `await` it.
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error('Could not get your location: ' + err.message)),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// Creates a small draggable-marker map inside `elementId`, centered on
// {lat, lng}. Returns the Leaflet map + marker so the caller can read
// the marker's position at submit time (in case the user nudges it).
function createPickerMap(elementId, lat, lng) {
  const map = L.map(elementId).setView([lat, lng], 16);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
  marker.bindPopup('Drag me if this is not quite right').openPopup();

  return { map, marker };
}

// Creates a read-only map for the dashboard, showing one point.
function createViewMap(elementId, lat, lng, label = 'Emergency location') {
  const map = L.map(elementId, { zoomControl: true }).setView([lat, lng], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);
  L.marker([lat, lng]).addTo(map).bindPopup(label).openPopup();
  return map;
}
