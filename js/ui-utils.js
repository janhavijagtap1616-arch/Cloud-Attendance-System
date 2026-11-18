/* ==========================================================================
   CLOUD-BASED ATTENDANCE MANAGEMENT SYSTEM
   UI Utilities, Toast Notifications, Modal Handlers & CSV Export
   ========================================================================== */

// Toast Notifications System
function showToast(title, message, type = 'info', duration = 4000) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const iconMap = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${iconMap[type] || iconMap.info} fa-lg"></i>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close" aria-label="Close">&times;</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => removeToast(toast));

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      removeToast(toast);
    }, duration);
  }
}

function removeToast(toast) {
  if (!toast) return;
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(100%)';
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 250);
}

// Modal Handlers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Attach outside click listener to modals
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    const closeBtns = overlay.querySelectorAll('.modal-close, [data-dismiss="modal"]');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  });

  // ESC key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(modal => {
        modal.classList.remove('active');
      });
      document.body.style.overflow = '';
    }
  });

  // Mobile sidebar drawer
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      if (backdrop) backdrop.classList.toggle('active');
    });
  }

  if (backdrop && sidebar) {
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('active');
    });
  }
});

// Format Date YYYY-MM-DD to readable format
function formatDate(dateString) {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return dateString;
}

// Format Timestamp
function formatTimestamp(timestamp) {
  if (!timestamp) return '-';
  let date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Today date string in YYYY-MM-DD
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Live Clock in Topbar
function startLiveClock(elementId = 'liveClock') {
  const el = document.getElementById(elementId);
  if (!el) return;

  function update() {
    const now = new Date();
    el.innerHTML = `<i class="fa-regular fa-clock"></i> ${now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} | ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }
  update();
  setInterval(update, 1000);
}

// CSV Export Generator
function downloadCSV(filename, rows) {
  if (!rows || !rows.length) {
    showToast('Export Error', 'No data available to export.', 'warning');
    return;
  }

  const separator = ',';
  const keys = Object.keys(rows[0]);
  
  const csvContent =
    keys.map(k => `"${k.replace(/"/g, '""')}"`).join(separator) + '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = String(cell).replace(/"/g, '""');
        return `"${cell}"`;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('Download Ready', `File "${filename}" has been exported successfully.`, 'success');
}

// XSS Sanitizer
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Attendance Badge Renderer
function getAttendanceBadge(status) {
  const s = (status || '').toLowerCase();
  if (s === 'present') {
    return `<span class="badge badge-present"><i class="fa-solid fa-check"></i> Present</span>`;
  } else if (s === 'absent') {
    return `<span class="badge badge-absent"><i class="fa-solid fa-xmark"></i> Absent</span>`;
  } else {
    return `<span class="badge badge-warning">${escapeHtml(status)}</span>`;
  }
}
