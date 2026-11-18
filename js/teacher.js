/* ==========================================================================
   CLOUD-BASED ATTENDANCE MANAGEMENT SYSTEM
   Teacher Dashboard Logic - Marking, Editing & Reporting Attendance
   ========================================================================== */

let teacherClasses = [];
let teacherSubjects = [];
let classStudents = [];
let currentSessionAttendance = {}; // Maps studentId -> { status: 'present'|'absent', remarks: '' }
let isExistingSession = false;
let teacherHistory = [];

document.addEventListener('DOMContentLoaded', async () => {
  enforceAuthGuard(['teacher', 'admin']);
  startLiveClock('liveClock');
  setupTeacherNavigation();
  initDateInput();
  await loadTeacherCoreData();
  setupAttendanceEventListeners();
});

// Setup Sidebar View Switching
function setupTeacherNavigation() {
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link[data-view]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = link.getAttribute('data-view');
      switchView(targetView);

      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const pageTitle = document.getElementById('pageTitle');
      const pageDesc = document.getElementById('pageDescription');
      if (pageTitle && link.dataset.title) pageTitle.textContent = link.dataset.title;
      if (pageDesc && link.dataset.desc) pageDesc.textContent = link.dataset.desc;
    });
  });
}

function switchView(viewId) {
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  const activeSec = document.getElementById(viewId);
  if (activeSec) activeSec.classList.add('active');
}

// Set Today Date Default
function initDateInput() {
  const dateInput = document.getElementById('attendanceDate');
  if (dateInput) {
    dateInput.value = getTodayDateString();
  }
}

// Load Teacher Classes & Subjects
async function loadTeacherCoreData() {
  const isDemo = sessionStorage.getItem('isDemoMode') === 'true' || !window.isFirebaseConfigured || !window.isFirebaseConfigured();

  if (!isDemo && window.db) {
    try {
      // 1. Fetch Classes
      const classSnap = await window.db.collection('classes').orderBy('name').get();
      teacherClasses = classSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 2. Fetch Subjects
      const subSnap = await window.db.collection('subjects').orderBy('name').get();
      teacherSubjects = subSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      populateTeacherSelects();

      // 3. Listen to Teacher Attendance History
      window.db.collection('attendance').orderBy('date', 'desc').limit(150).onSnapshot(snap => {
        teacherHistory = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTeacherHistoryTable();
        updateTeacherStats();
      });

    } catch (err) {
      console.error("Firestore error:", err);
      showToast('Data Error', err.message, 'error');
    }
  } else {
    // Load Demo Data
    const localClasses = localStorage.getItem('demo_classes');
    if (localClasses) {
      teacherClasses = JSON.parse(localClasses);
      teacherSubjects = JSON.parse(localStorage.getItem('demo_subjects') || '[]');
      teacherHistory = JSON.parse(localStorage.getItem('demo_attendance') || '[]');
    } else {
      teacherClasses = [
        { id: 'cls-1', name: 'B.Tech CSE - 6th Sem', section: 'A' },
        { id: 'cls-2', name: 'B.Tech CSE - 4th Sem', section: 'B' }
      ];
      teacherSubjects = [
        { id: 'sub-1', code: 'CS601', name: 'Cloud Computing & Virtualization', classId: 'cls-1' },
        { id: 'sub-2', code: 'CS602', name: 'Data Structures & Algorithms', classId: 'cls-1' },
        { id: 'sub-3', code: 'CS401', name: 'Database Management Systems', classId: 'cls-2' }
      ];
      teacherHistory = JSON.parse(localStorage.getItem('demo_attendance') || '[]');
    }

    populateTeacherSelects();
    renderTeacherHistoryTable();
    updateTeacherStats();
  }
}

// Populate Class and Subject Select Dropdowns
function populateTeacherSelects() {
  const classSelect = document.getElementById('teacherClassSelect');
  const reportClassSelect = document.getElementById('reportClassSelect');
  if (classSelect) {
    classSelect.innerHTML = '<option value="">-- Choose Class --</option>' +
      teacherClasses.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (Sec ${c.section || 'A'})</option>`).join('');
  }
  if (reportClassSelect) {
    reportClassSelect.innerHTML = '<option value="">-- All Classes --</option>' +
      teacherClasses.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  }

  // Filter subjects when class is selected
  if (classSelect) {
    classSelect.addEventListener('change', () => {
      const selectedClassId = classSelect.value;
      const subSelect = document.getElementById('teacherSubjectSelect');
      if (!subSelect) return;

      const filteredSubjects = teacherSubjects.filter(s => !s.classId || s.classId === selectedClassId);
      subSelect.innerHTML = '<option value="">-- Choose Subject --</option>' +
        filteredSubjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)} (${s.code || ''})</option>`).join('');
      
      resetAttendanceForm();
    });
  }
}

// Setup Event Listeners for Attendance Actions
function setupAttendanceEventListeners() {
  const loadBtn = document.getElementById('loadStudentsBtn');
  if (loadBtn) {
    loadBtn.addEventListener('click', loadClassStudents);
  }

  const markAllPresentBtn = document.getElementById('markAllPresentBtn');
  if (markAllPresentBtn) {
    markAllPresentBtn.addEventListener('click', () => {
      classStudents.forEach(s => {
        currentSessionAttendance[s.id] = { ...currentSessionAttendance[s.id], status: 'present' };
      });
      refreshAttendanceTableRows();
      updateAttendanceCounters();
    });
  }

  const markAllAbsentBtn = document.getElementById('markAllAbsentBtn');
  if (markAllAbsentBtn) {
    markAllAbsentBtn.addEventListener('click', () => {
      classStudents.forEach(s => {
        currentSessionAttendance[s.id] = { ...currentSessionAttendance[s.id], status: 'absent' };
      });
      refreshAttendanceTableRows();
      updateAttendanceCounters();
    });
  }

  const saveBtn = document.getElementById('saveAttendanceBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveAttendanceToCloud);
  }

  // Filter in History View
  const filterBtn = document.getElementById('applyHistoryFilterBtn');
  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      const dateVal = document.getElementById('reportDateFilter').value;
      const classVal = document.getElementById('reportClassSelect').value;
      renderTeacherHistoryTable(dateVal, classVal);
    });
  }
}

// Reset Attendance UI
function resetAttendanceForm() {
  const container = document.getElementById('attendanceSheetContainer');
  const emptyState = document.getElementById('attendanceEmptyNotice');
  const alertBadge = document.getElementById('sessionStatusBadge');

  if (container) container.style.display = 'none';
  if (emptyState) emptyState.style.display = 'block';
  if (alertBadge) alertBadge.innerHTML = '';
  classStudents = [];
  currentSessionAttendance = {};
  isExistingSession = false;
}

// Fetch Students for selected class & check for duplicate session entry
async function loadClassStudents() {
  const classId = document.getElementById('teacherClassSelect').value;
  const subjectId = document.getElementById('teacherSubjectSelect').value;
  const date = document.getElementById('attendanceDate').value;

  if (!classId || !subjectId || !date) {
    showToast('Missing Selection', 'Please select Class, Subject, and Attendance Date first.', 'warning');
    return;
  }

  const loadBtn = document.getElementById('loadStudentsBtn');
  if (loadBtn) loadBtn.innerHTML = `<span class="spinner"></span> Loading Students...`;

  const sessionId = `${date}_${classId}_${subjectId}`;
  isExistingSession = false;

  try {
    const isDemo = sessionStorage.getItem('isDemoMode') === 'true' || !window.isFirebaseConfigured || !window.isFirebaseConfigured();

    if (!isDemo && window.db) {
      // 1. Fetch Students of this class
      const stdSnap = await window.db.collection('students').where('classId', '==', classId).orderBy('rollNo').get();
      classStudents = stdSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 2. Check if Attendance already exists for this exact session
      const sessionDoc = await window.db.collection('attendance').doc(sessionId).get();
      if (sessionDoc.exists) {
        isExistingSession = true;
        const data = sessionDoc.data();
        currentSessionAttendance = {};
        if (data.records) {
          data.records.forEach(r => {
            currentSessionAttendance[r.studentId] = { status: r.status, remarks: r.remarks || '' };
          });
        }
      } else {
        // Fresh session: default all students to 'present'
        currentSessionAttendance = {};
        classStudents.forEach(s => {
          currentSessionAttendance[s.id] = { status: 'present', remarks: '' };
        });
      }
    } else {
      // Demo Mode
      const allStudents = JSON.parse(localStorage.getItem('demo_students') || '[]');
      classStudents = allStudents.filter(s => s.classId === classId);

      const existing = teacherHistory.find(a => a.id === sessionId);
      if (existing) {
        isExistingSession = true;
        currentSessionAttendance = {};
        (existing.records || []).forEach(r => {
          currentSessionAttendance[r.studentId] = { status: r.status, remarks: r.remarks || '' };
        });
      } else {
        currentSessionAttendance = {};
        classStudents.forEach(s => {
          currentSessionAttendance[s.id] = { status: 'present', remarks: '' };
        });
      }
    }

    if (classStudents.length === 0) {
      showToast('No Students', 'No students are currently enrolled in the selected class.', 'info');
      resetAttendanceForm();
      return;
    }

    // Display Sheet Container
    const container = document.getElementById('attendanceSheetContainer');
    const emptyState = document.getElementById('attendanceEmptyNotice');
    const alertBadge = document.getElementById('sessionStatusBadge');

    if (container) container.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    if (alertBadge) {
      if (isExistingSession) {
        alertBadge.innerHTML = `
          <div style="background-color: var(--warning-bg); border: 1px solid var(--warning-border); color: #92400e; padding: 0.75rem 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.75rem;">
            <i class="fa-solid fa-triangle-exclamation fa-lg"></i>
            <div>
              <strong>Attendance Already Marked for this Date & Subject.</strong>
              <div>You are currently in <strong>Edit Mode</strong>. Modifying attendance will update the existing cloud record without duplicates.</div>
            </div>
          </div>
        `;
      } else {
        alertBadge.innerHTML = `
          <div style="background-color: var(--success-bg); border: 1px solid var(--success-border); color: #065f46; padding: 0.75rem 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.75rem;">
            <i class="fa-solid fa-cloud-arrow-up fa-lg"></i>
            <div>
              <strong>New Attendance Session Ready.</strong>
              <div>Defaulted to all students present. Adjust any absentees and click "Submit Attendance to Cloud".</div>
            </div>
          </div>
        `;
      }
    }

    refreshAttendanceTableRows();
    updateAttendanceCounters();

  } catch (err) {
    console.error("Load students error:", err);
    showToast('Error', err.message, 'error');
  } finally {
    if (loadBtn) loadBtn.innerHTML = `<i class="fa-solid fa-users-viewfinder"></i> Load Student Sheet`;
  }
}

// Refresh Table Rows with Toggle Buttons
function refreshAttendanceTableRows() {
  const tbody = document.getElementById('attendanceMarkingTableBody');
  if (!tbody) return;

  tbody.innerHTML = classStudents.map(std => {
    const record = currentSessionAttendance[std.id] || { status: 'present', remarks: '' };
    const isPresent = record.status === 'present';

    return `
      <tr id="row-${std.id}">
        <td><strong>${escapeHtml(std.rollNo)}</strong></td>
        <td>
          <div class="student-cell">
            <div class="student-avatar-mini">${escapeHtml(std.name.substring(0, 2).toUpperCase())}</div>
            <div class="student-meta">
              <div class="student-name">${escapeHtml(std.name)}</div>
              <div class="student-sub">${escapeHtml(std.email || '')}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="attendance-radio-group">
            <button type="button" class="attendance-radio-btn btn-present ${isPresent ? 'selected' : ''}" onclick="setStudentStatus('${std.id}', 'present')">
              <i class="fa-solid fa-check"></i> Present
            </button>
            <button type="button" class="attendance-radio-btn btn-absent ${!isPresent ? 'selected' : ''}" onclick="setStudentStatus('${std.id}', 'absent')">
              <i class="fa-solid fa-xmark"></i> Absent
            </button>
          </div>
        </td>
        <td>
          <input type="text" class="form-control form-control-sm" placeholder="Optional remark (e.g. Leave, Sick)" value="${escapeHtml(record.remarks || '')}" onchange="setStudentRemark('${std.id}', this.value)" style="max-width: 260px;" />
        </td>
      </tr>
    `;
  }).join('');
}

// Interactive Status Setter
function setStudentStatus(studentId, status) {
  if (!currentSessionAttendance[studentId]) {
    currentSessionAttendance[studentId] = { status, remarks: '' };
  } else {
    currentSessionAttendance[studentId].status = status;
  }

  const row = document.getElementById(`row-${studentId}`);
  if (row) {
    const btnPresent = row.querySelector('.btn-present');
    const btnAbsent = row.querySelector('.btn-absent');
    if (status === 'present') {
      btnPresent.classList.add('selected');
      btnAbsent.classList.remove('selected');
    } else {
      btnPresent.classList.remove('selected');
      btnAbsent.classList.add('selected');
    }
  }

  updateAttendanceCounters();
}

function setStudentRemark(studentId, remark) {
  if (!currentSessionAttendance[studentId]) {
    currentSessionAttendance[studentId] = { status: 'present', remarks: remark };
  } else {
    currentSessionAttendance[studentId].remarks = remark;
  }
}

// Live Attendance Counter Bar
function updateAttendanceCounters() {
  const total = classStudents.length;
  let present = 0;
  let absent = 0;

  classStudents.forEach(s => {
    const status = (currentSessionAttendance[s.id] && currentSessionAttendance[s.id].status) || 'present';
    if (status === 'present') present++;
    else absent++;
  });

  const rate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

  const countTotal = document.getElementById('sheetTotalCount');
  const countPresent = document.getElementById('sheetPresentCount');
  const countAbsent = document.getElementById('sheetAbsentCount');
  const countRate = document.getElementById('sheetRateCount');

  if (countTotal) countTotal.textContent = total;
  if (countPresent) countPresent.textContent = present;
  if (countAbsent) countAbsent.textContent = absent;
  if (countRate) countRate.textContent = `${rate}%`;
}

// ==========================================================================
// SAVE ATTENDANCE DIRECTLY TO CLOUD FIRESTORE
// ==========================================================================
async function saveAttendanceToCloud() {
  const classId = document.getElementById('teacherClassSelect').value;
  const subjectId = document.getElementById('teacherSubjectSelect').value;
  const date = document.getElementById('attendanceDate').value;

  if (!classId || !subjectId || !date || classStudents.length === 0) {
    showToast('Invalid State', 'Please select class and load students before saving.', 'error');
    return;
  }

  const selectedClass = teacherClasses.find(c => c.id === classId);
  const selectedSubject = teacherSubjects.find(s => s.id === subjectId);
  const teacherName = sessionStorage.getItem('currentUserName') || 'Faculty';

  const records = classStudents.map(s => {
    const cur = currentSessionAttendance[s.id] || { status: 'present', remarks: '' };
    return {
      studentId: s.id,
      rollNo: s.rollNo,
      studentName: s.name,
      status: cur.status || 'present',
      remarks: cur.remarks || ''
    };
  });

  let presentCount = 0;
  let absentCount = 0;
  records.forEach(r => {
    if (r.status === 'present') presentCount++;
    else absentCount++;
  });

  const sessionId = `${date}_${classId}_${subjectId}`;
  const payload = {
    id: sessionId,
    date,
    classId,
    className: selectedClass ? selectedClass.name : 'Class',
    subjectId,
    subjectName: selectedSubject ? selectedSubject.name : 'Subject',
    teacherName,
    records,
    totalStudents: records.length,
    presentCount,
    absentCount,
    updatedAt: new Date()
  };

  const saveBtn = document.getElementById('saveAttendanceBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="spinner"></span> Syncing with Cloud...`;
  }

  try {
    const isDemo = sessionStorage.getItem('isDemoMode') === 'true' || !window.isFirebaseConfigured || !window.isFirebaseConfigured();

    if (!isDemo && window.db) {
      await window.db.collection('attendance').doc(sessionId).set(payload, { merge: true });
      showToast('Cloud Sync Successful', `Attendance for ${date} has been recorded to Firebase Firestore.`, 'success');
    } else {
      // Demo save to localStorage
      const idx = teacherHistory.findIndex(a => a.id === sessionId);
      if (idx !== -1) {
        teacherHistory[idx] = payload;
      } else {
        teacherHistory.unshift(payload);
      }
      localStorage.setItem('demo_attendance', JSON.stringify(teacherHistory));
      renderTeacherHistoryTable();
      updateTeacherStats();
      showToast('Saved Locally', `Attendance recorded successfully.`, 'success');
    }

    // Refresh UI alerts
    isExistingSession = true;
    const alertBadge = document.getElementById('sessionStatusBadge');
    if (alertBadge) {
      alertBadge.innerHTML = `
        <div style="background-color: var(--success-bg); border: 1px solid var(--success-border); color: #065f46; padding: 0.75rem 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.75rem;">
          <i class="fa-solid fa-circle-check fa-lg"></i>
          <div>
            <strong>Attendance Saved & Synced to Cloud.</strong>
            <div>Total: ${records.length} | Present: ${presentCount} | Absent: ${absentCount}</div>
          </div>
        </div>
      `;
    }

  } catch (err) {
    console.error("Save attendance error:", err);
    showToast('Sync Failed', err.message, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Submit Attendance to Cloud`;
    }
  }
}

// Render Teacher History Table
function renderTeacherHistoryTable(filterDate = '', filterClass = '') {
  const tbody = document.getElementById('teacherHistoryTableBody');
  if (!tbody) return;

  const filtered = teacherHistory.filter(att => {
    const matchesDate = !filterDate || att.date === filterDate;
    const matchesClass = !filterClass || att.classId === filterClass;
    return matchesDate && matchesClass;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No attendance records found matching filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(att => {
    const total = (att.presentCount || 0) + (att.absentCount || 0);
    const pct = total > 0 ? ((att.presentCount / total) * 100).toFixed(0) : '0';

    return `
      <tr>
        <td><strong>${formatDate(att.date)}</strong></td>
        <td>${escapeHtml(att.className)}</td>
        <td>${escapeHtml(att.subjectName)}</td>
        <td>
          <span class="badge badge-present">${att.presentCount} Present</span>
          <span class="badge badge-absent">${att.absentCount} Absent</span>
        </td>
        <td><span class="badge ${pct >= 75 ? 'badge-success' : 'badge-warning'}">${pct}%</span></td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="loadSessionForEditing('${att.date}', '${att.classId}', '${att.subjectId}')">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Quick Edit from History Table
function loadSessionForEditing(date, classId, subjectId) {
  // Switch to Mark Attendance view
  switchView('markAttendanceSection');
  const navMark = document.querySelector('.sidebar-nav .nav-link[data-view="markAttendanceSection"]');
  if (navMark) {
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => l.classList.remove('active'));
    navMark.classList.add('active');
  }

  const classSelect = document.getElementById('teacherClassSelect');
  const dateInput = document.getElementById('attendanceDate');

  if (classSelect) {
    classSelect.value = classId;
    classSelect.dispatchEvent(new Event('change'));
  }
  if (dateInput) {
    dateInput.value = date;
  }

  setTimeout(() => {
    const subSelect = document.getElementById('teacherSubjectSelect');
    if (subSelect) subSelect.value = subjectId;
    loadClassStudents();
  }, 150);
}

// Update Teacher Metric Stat Cards
function updateTeacherStats() {
  const elAssignedClasses = document.getElementById('statTeacherClasses');
  const elTotalSessions = document.getElementById('statTotalSessions');
  const elTodayPresent = document.getElementById('statTeacherPresentToday');
  const elAvgRate = document.getElementById('statTeacherAvgRate');

  if (elAssignedClasses) elAssignedClasses.textContent = teacherClasses.length;
  if (elTotalSessions) elTotalSessions.textContent = teacherHistory.length;

  const today = getTodayDateString();
  const todaySessions = teacherHistory.filter(a => a.date === today);
  let todayPresent = 0;
  todaySessions.forEach(s => todayPresent += (s.presentCount || 0));
  if (elTodayPresent) elTodayPresent.textContent = todayPresent;

  let grandPresent = 0;
  let grandTotal = 0;
  teacherHistory.forEach(s => {
    grandPresent += (s.presentCount || 0);
    grandTotal += ((s.presentCount || 0) + (s.absentCount || 0));
  });

  const avg = grandTotal > 0 ? ((grandPresent / grandTotal) * 100).toFixed(1) : '92.4';
  if (elAvgRate) elAvgRate.textContent = `${avg}%`;
}

// Export Teacher Class Attendance to CSV
function exportTeacherCSV() {
  const rows = [];
  teacherHistory.forEach(att => {
    if (att.records && att.records.length > 0) {
      att.records.forEach(r => {
        rows.push({
          'Date': att.date,
          'Class': att.className,
          'Subject': att.subjectName,
          'Roll Number': r.rollNo,
          'Student Name': r.studentName,
          'Status': r.status.toUpperCase(),
          'Remarks': r.remarks || 'Normal'
        });
      });
    }
  });

  downloadCSV(`Class_Attendance_Report_${getTodayDateString()}`, rows);
}
