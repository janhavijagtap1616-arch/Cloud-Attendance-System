/* ==========================================================================
   CLOUD-BASED ATTENDANCE MANAGEMENT SYSTEM
   Student Dashboard Logic - Personal Profile, Daily & Monthly Attendance
   ========================================================================== */

let currentStudent = null;
let studentAttendanceRecords = []; // All attendance entries where this student is present
let studentChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  enforceAuthGuard(['student', 'admin']);
  startLiveClock('liveClock');
  setupStudentNavigation();
  initStudentDatePicker();
  await loadStudentProfileAndAttendance();
  setupStudentEventListeners();
});

// Setup Sidebar View Switching
function setupStudentNavigation() {
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

function initStudentDatePicker() {
  const dateInput = document.getElementById('studentDailyDate');
  if (dateInput) {
    dateInput.value = getTodayDateString();
  }
}

// Load Profile and Attendance Records from Cloud Firestore
async function loadStudentProfileAndAttendance() {
  const isDemo = sessionStorage.getItem('isDemoMode') === 'true' || !window.isFirebaseConfigured || !window.isFirebaseConfigured();
  const currentEmail = (sessionStorage.getItem('currentUserEmail') || 'student@college.edu').toLowerCase();

  if (!isDemo && window.db) {
    try {
      // 1. Fetch Student Profile by email
      const stdSnap = await window.db.collection('students').where('email', '==', currentEmail).limit(1).get();
      if (!stdSnap.empty) {
        currentStudent = { id: stdSnap.docs[0].id, ...stdSnap.docs[0].data() };
      } else {
        // Fallback: fetch from users
        const userUid = sessionStorage.getItem('currentUserId');
        if (userUid) {
          const uDoc = await window.db.collection('users').doc(userUid).get();
          if (uDoc.exists) currentStudent = uDoc.data();
        }
      }

      if (!currentStudent) {
        currentStudent = {
          name: sessionStorage.getItem('currentUserName') || 'Student',
          rollNo: 'CSE-2024-001',
          email: currentEmail,
          className: 'B.Tech CSE - 6th Sem',
          section: 'A'
        };
      }

      renderProfileCard();

      // 2. Fetch All Attendance Documents from Firestore
      window.db.collection('attendance').orderBy('date', 'desc').onSnapshot(snap => {
        studentAttendanceRecords = [];

        snap.docs.forEach(doc => {
          const session = doc.data();
          if (session.records && Array.isArray(session.records)) {
            // Find student's record in this session
            const myRecord = session.records.find(r => 
              (currentStudent.id && r.studentId === currentStudent.id) ||
              (currentStudent.rollNo && r.rollNo === currentStudent.rollNo) ||
              (r.studentName && currentStudent.name && r.studentName.toLowerCase() === currentStudent.name.toLowerCase())
            );

            if (myRecord) {
              studentAttendanceRecords.push({
                date: session.date,
                className: session.className,
                subjectId: session.subjectId,
                subjectName: session.subjectName,
                teacherName: session.teacherName,
                status: myRecord.status,
                remarks: myRecord.remarks || ''
              });
            }
          }
        });

        updateStudentStatsAndUI();
      });

    } catch (err) {
      console.error("Student load error:", err);
      showToast('Error', err.message, 'error');
    }
  } else {
    // Load Demo Student Profile & Sample Attendance
    loadStudentDemoData();
  }
}

// Fallback Demo Student Data
function loadStudentDemoData() {
  currentStudent = {
    id: 'std-1',
    rollNo: 'CSE-2024-001',
    name: 'Alex Johnson',
    email: 'student@college.edu',
    className: 'B.Tech CSE - 6th Sem',
    section: 'A',
    department: 'Computer Science & Engineering',
    academicYear: '2024-2025',
    phone: '+1 555-010-0001'
  };

  renderProfileCard();

  const allAttendance = JSON.parse(localStorage.getItem('demo_attendance') || '[]');
  studentAttendanceRecords = [];

  allAttendance.forEach(session => {
    if (session.records) {
      const myRecord = session.records.find(r => r.studentId === currentStudent.id || r.rollNo === currentStudent.rollNo);
      if (myRecord) {
        studentAttendanceRecords.push({
          date: session.date,
          className: session.className,
          subjectId: session.subjectId,
          subjectName: session.subjectName,
          teacherName: session.teacherName,
          status: myRecord.status,
          remarks: myRecord.remarks || ''
        });
      }
    }
  });

  // If list is small in demo, add representative monthly attendance entries for visualization
  if (studentAttendanceRecords.length <= 1) {
    const sampleSubjects = [
      'Cloud Computing & Virtualization',
      'Data Structures & Algorithms',
      'Database Management Systems',
      'Computer Networks'
    ];

    for (let day = 1; day <= 12; day++) {
      const d = new Date();
      d.setDate(d.getDate() - day);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      const dStr = `${yr}-${mo}-${da}`;

      sampleSubjects.forEach((sub, sIdx) => {
        const isAbsent = (day % 4 === 0 && sIdx === 1);
        studentAttendanceRecords.push({
          date: dStr,
          className: 'B.Tech CSE - 6th Sem',
          subjectId: `sub-${sIdx}`,
          subjectName: sub,
          teacherName: 'Prof. Sarah Jenkins',
          status: isAbsent ? 'absent' : 'present',
          remarks: isAbsent ? 'Medical Leave' : 'Attended'
        });
      });
    }
  }

  updateStudentStatsAndUI();
}

// Render Personal Profile Information
function renderProfileCard() {
  if (!currentStudent) return;

  const nameEls = document.querySelectorAll('.student-profile-name');
  const rollEls = document.querySelectorAll('.student-profile-roll');
  const classEls = document.querySelectorAll('.student-profile-class');
  const emailEls = document.querySelectorAll('.student-profile-email');
  const deptEls = document.querySelectorAll('.student-profile-dept');

  nameEls.forEach(el => el.textContent = currentStudent.name || 'Alex Johnson');
  rollEls.forEach(el => el.textContent = currentStudent.rollNo || 'CSE-2024-001');
  classEls.forEach(el => el.textContent = `${currentStudent.className || 'B.Tech CSE'} (Sec ${currentStudent.section || 'A'})`);
  emailEls.forEach(el => el.textContent = currentStudent.email || 'student@college.edu');
  deptEls.forEach(el => el.textContent = currentStudent.department || 'Computer Science');
}

// Update Top Metrics, Subject Breakdown & Charts
function updateStudentStatsAndUI() {
  const totalClasses = studentAttendanceRecords.length;
  let presentDays = 0;
  let absentDays = 0;

  studentAttendanceRecords.forEach(r => {
    if (r.status === 'present') presentDays++;
    else absentDays++;
  });

  const overallPct = totalClasses > 0 ? ((presentDays / totalClasses) * 100).toFixed(1) : 0;

  // Stat Elements
  const elTotal = document.getElementById('statStudentTotalClasses');
  const elPresent = document.getElementById('statStudentPresent');
  const elAbsent = document.getElementById('statStudentAbsent');
  const elRate = document.getElementById('statStudentPercentage');
  const elNotice = document.getElementById('studentAttendanceAlert');

  if (elTotal) elTotal.textContent = totalClasses;
  if (elPresent) elPresent.textContent = presentDays;
  if (elAbsent) elAbsent.textContent = absentDays;
  if (elRate) elRate.textContent = `${overallPct}%`;

  if (elNotice) {
    if (overallPct >= 75) {
      elNotice.innerHTML = `
        <div style="background-color: var(--success-bg); border: 1px solid var(--success-border); color: #065f46; padding: 0.85rem 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
          <i class="fa-solid fa-circle-check fa-lg"></i>
          <div>
            <strong>Great Job! Your attendance is in Good Standing (${overallPct}%).</strong>
            <div>You are safely above the minimum college attendance threshold of 75%.</div>
          </div>
        </div>
      `;
    } else {
      elNotice.innerHTML = `
        <div style="background-color: var(--danger-bg); border: 1px solid var(--danger-border); color: #991b1b; padding: 0.85rem 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
          <i class="fa-solid fa-triangle-exclamation fa-lg"></i>
          <div>
            <strong>Warning: Attendance is Below 75% (${overallPct}%).</strong>
            <div>Please contact your class counselor or attend upcoming lectures to maintain eligibility.</div>
          </div>
        </div>
      `;
    }
  }

  renderDailyAttendanceTable();
  renderSubjectBreakdownTable();
  renderMonthlyHistoryTable();
  renderStudentChart(presentDays, absentDays);
}

// Render Daily Attendance for Selected Date
function renderDailyAttendanceTable() {
  const dateInput = document.getElementById('studentDailyDate');
  const selectedDate = dateInput ? dateInput.value : getTodayDateString();
  const tbody = document.getElementById('studentDailyTableBody');
  if (!tbody) return;

  const dailyRecords = studentAttendanceRecords.filter(r => r.date === selectedDate);

  if (dailyRecords.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No lectures recorded for ${formatDate(selectedDate)}.</td></tr>`;
    return;
  }

  tbody.innerHTML = dailyRecords.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.subjectName)}</strong></td>
      <td>${escapeHtml(r.teacherName || 'Faculty')}</td>
      <td>${formatDate(r.date)}</td>
      <td>${getAttendanceBadge(r.status)}</td>
      <td>${escapeHtml(r.remarks || 'Regular Session')}</td>
    </tr>
  `).join('');
}

// Subject-Wise Attendance Breakdown Table
function renderSubjectBreakdownTable() {
  const tbody = document.getElementById('subjectBreakdownTableBody');
  if (!tbody) return;

  // Group by Subject Name
  const subjectMap = {};
  studentAttendanceRecords.forEach(r => {
    if (!subjectMap[r.subjectName]) {
      subjectMap[r.subjectName] = { total: 0, present: 0, absent: 0 };
    }
    subjectMap[r.subjectName].total++;
    if (r.status === 'present') subjectMap[r.subjectName].present++;
    else subjectMap[r.subjectName].absent++;
  });

  const subjects = Object.keys(subjectMap);
  if (subjects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No subject attendance records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = subjects.map(subName => {
    const st = subjectMap[subName];
    const pct = st.total > 0 ? ((st.present / st.total) * 100).toFixed(1) : 0;
    const isGood = pct >= 75;

    return `
      <tr>
        <td><strong>${escapeHtml(subName)}</strong></td>
        <td>${st.total}</td>
        <td><span class="badge badge-present">${st.present}</span></td>
        <td><span class="badge badge-absent">${st.absent}</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="progress-container" style="flex: 1; max-width: 140px;">
              <div class="progress-bar ${isGood ? 'success' : 'danger'}" style="width: ${pct}%"></div>
            </div>
            <strong>${pct}%</strong>
          </div>
        </td>
        <td>
          <span class="badge ${isGood ? 'badge-success' : 'badge-danger'}">
            ${isGood ? '<i class="fa-solid fa-check"></i> Eligible' : '<i class="fa-solid fa-triangle-exclamation"></i> Low'}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Monthly Attendance History
function renderMonthlyHistoryTable() {
  const tbody = document.getElementById('studentMonthlyTableBody');
  if (!tbody) return;

  if (studentAttendanceRecords.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No attendance history available.</td></tr>`;
    return;
  }

  tbody.innerHTML = studentAttendanceRecords.map(r => `
    <tr>
      <td><strong>${formatDate(r.date)}</strong></td>
      <td>${escapeHtml(r.subjectName)}</td>
      <td>${escapeHtml(r.className)}</td>
      <td>${escapeHtml(r.teacherName || 'Faculty')}</td>
      <td>${getAttendanceBadge(r.status)}</td>
      <td>${escapeHtml(r.remarks || 'Regular')}</td>
    </tr>
  `).join('');
}

// Render Chart.js Donut Visual
function renderStudentChart(present, absent) {
  const canvas = document.getElementById('studentAttendanceDonut');
  if (!canvas || typeof Chart === 'undefined') return;

  if (studentChart) studentChart.destroy();

  const total = present + absent;
  if (total === 0) {
    present = 1;
    absent = 0;
  }

  studentChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Present Sessions', 'Absent Sessions'],
      datasets: [{
        data: [present, absent],
        backgroundColor: ['#10b981', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { weight: 600 } } }
      }
    }
  });
}

// Setup Event Listeners
function setupStudentEventListeners() {
  const dailyDateInput = document.getElementById('studentDailyDate');
  if (dailyDateInput) {
    dailyDateInput.addEventListener('change', renderDailyAttendanceTable);
  }
}

// Export Student's Attendance to CSV
function exportStudentAttendanceCSV() {
  const rows = studentAttendanceRecords.map(r => ({
    'Date': r.date,
    'Student Roll No': currentStudent ? currentStudent.rollNo : 'CSE-2024-001',
    'Student Name': currentStudent ? currentStudent.name : 'Alex Johnson',
    'Class': r.className,
    'Subject': r.subjectName,
    'Teacher': r.teacherName || 'Faculty',
    'Status': r.status.toUpperCase(),
    'Remarks': r.remarks || 'Normal'
  }));

  downloadCSV(`My_Attendance_Report_${getTodayDateString()}`, rows);
}
