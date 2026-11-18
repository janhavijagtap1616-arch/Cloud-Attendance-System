/* ==========================================================================
   CLOUD-BASED ATTENDANCE MANAGEMENT SYSTEM
   Admin Dashboard Logic - CRUD Operations, Stats & Cloud Firestore Sync
   ========================================================================== */

let adminClasses = [];
let adminSubjects = [];
let adminTeachers = [];
let adminStudents = [];
let adminAttendance = [];
let dailyChart = null;
let classChart = null;

// Initialize Admin Dashboard
document.addEventListener('DOMContentLoaded', async () => {
  enforceAuthGuard(['admin']);
  startLiveClock('liveClock');
  setupAdminNavigation();
  setupAdminModals();
  await loadAdminDashboardData();
});

// Setup Sidebar View Switching
function setupAdminNavigation() {
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link[data-view]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = link.getAttribute('data-view');
      switchView(targetView);

      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Update page header
      const pageTitle = document.getElementById('pageTitle');
      const pageDesc = document.getElementById('pageDescription');
      if (pageTitle && link.dataset.title) {
        pageTitle.textContent = link.dataset.title;
      }
      if (pageDesc && link.dataset.desc) {
        pageDesc.textContent = link.dataset.desc;
      }
    });
  });
}

function switchView(viewId) {
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  const activeSec = document.getElementById(viewId);
  if (activeSec) {
    activeSec.classList.add('active');
  }
}

// Load All Core Data from Firestore (or Local Fallback if Demo)
async function loadAdminDashboardData() {
  const isDemo = sessionStorage.getItem('isDemoMode') === 'true' || !window.isFirebaseConfigured || !window.isFirebaseConfigured();

  if (!isDemo && window.db) {
    try {
      // 1. Listen / Fetch Classes
      window.db.collection('classes').orderBy('name').onSnapshot(snap => {
        adminClasses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        populateClassDropdowns();
        renderClassesTable();
        updateAdminStats();
      });

      // 2. Listen / Fetch Subjects
      window.db.collection('subjects').orderBy('name').onSnapshot(snap => {
        adminSubjects = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        populateSubjectDropdowns();
        renderSubjectsTable();
      });

      // 3. Listen / Fetch Teachers
      window.db.collection('teachers').orderBy('name').onSnapshot(snap => {
        adminTeachers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        populateTeacherDropdowns();
        renderTeachersTable();
        updateAdminStats();
      });

      // 4. Listen / Fetch Students
      window.db.collection('students').orderBy('rollNo').onSnapshot(snap => {
        adminStudents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderStudentsTable();
        updateAdminStats();
      });

      // 5. Listen / Fetch Attendance
      window.db.collection('attendance').orderBy('date', 'desc').limit(200).onSnapshot(snap => {
        adminAttendance = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAttendanceLogsTable();
        updateAdminStats();
        renderAdminCharts();
      });

    } catch (err) {
      console.error("Firestore loading error:", err);
      showToast('Cloud Data Error', err.message, 'error');
    }
  } else {
    // Load Demo Seed Data from localStorage or Mock Dataset
    loadAdminDemoData();
  }
}

// Fallback Mock Data for instant demo presentation without cloud setup
function loadAdminDemoData() {
  const localClasses = localStorage.getItem('demo_classes');
  if (localClasses) {
    adminClasses = JSON.parse(localClasses);
    adminSubjects = JSON.parse(localStorage.getItem('demo_subjects') || '[]');
    adminTeachers = JSON.parse(localStorage.getItem('demo_teachers') || '[]');
    adminStudents = JSON.parse(localStorage.getItem('demo_students') || '[]');
    adminAttendance = JSON.parse(localStorage.getItem('demo_attendance') || '[]');
  } else {
    // Generate base demo records
    adminClasses = [
      { id: 'cls-1', name: 'B.Tech CSE - 6th Sem', section: 'A', department: 'Computer Science', academicYear: '2024-2025' },
      { id: 'cls-2', name: 'B.Tech CSE - 4th Sem', section: 'B', department: 'Computer Science', academicYear: '2024-2025' },
      { id: 'cls-3', name: 'BCA - 2nd Year', section: 'A', department: 'Computer Applications', academicYear: '2024-2025' }
    ];

    adminSubjects = [
      { id: 'sub-1', code: 'CS601', name: 'Cloud Computing & Virtualization', classId: 'cls-1', className: 'B.Tech CSE - 6th Sem', teacherName: 'Prof. Sarah Jenkins' },
      { id: 'sub-2', code: 'CS602', name: 'Data Structures & Algorithms', classId: 'cls-1', className: 'B.Tech CSE - 6th Sem', teacherName: 'Dr. Robert Vance' },
      { id: 'sub-3', code: 'CS401', name: 'Database Management Systems', classId: 'cls-2', className: 'B.Tech CSE - 4th Sem', teacherName: 'Prof. Sarah Jenkins' }
    ];

    adminTeachers = [
      { id: 'tch-1', name: 'Prof. Sarah Jenkins', teacherId: 'TCH-101', email: 'teacher@college.edu', department: 'Computer Science', phone: '+1 555-019-2834' },
      { id: 'tch-2', name: 'Dr. Robert Vance', teacherId: 'TCH-102', email: 'admin@college.edu', department: 'Computer Science', phone: '+1 555-019-2835' }
    ];

    adminStudents = [
      { id: 'std-1', rollNo: 'CSE-2024-001', name: 'Alex Johnson', email: 'student@college.edu', classId: 'cls-1', className: 'B.Tech CSE - 6th Sem', section: 'A', phone: '+1 555-010-0001' },
      { id: 'std-2', rollNo: 'CSE-2024-002', name: 'Sophia Martinez', email: 'sophia@college.edu', classId: 'cls-1', className: 'B.Tech CSE - 6th Sem', section: 'A', phone: '+1 555-010-0002' },
      { id: 'std-3', rollNo: 'CSE-2024-003', name: 'Daniel Lee', email: 'daniel@college.edu', classId: 'cls-1', className: 'B.Tech CSE - 6th Sem', section: 'A', phone: '+1 555-010-0003' },
      { id: 'std-4', rollNo: 'CSE-2024-004', name: 'Emma Watson', email: 'emma@college.edu', classId: 'cls-1', className: 'B.Tech CSE - 6th Sem', section: 'A', phone: '+1 555-010-0004' },
      { id: 'std-5', rollNo: 'CSE-2024-005', name: 'Michael Brown', email: 'michael@college.edu', classId: 'cls-2', className: 'B.Tech CSE - 4th Sem', section: 'B', phone: '+1 555-010-0005' }
    ];

    const today = getTodayDateString();
    adminAttendance = [
      {
        id: `${today}_cls-1_sub-1`,
        date: today,
        classId: 'cls-1',
        className: 'B.Tech CSE - 6th Sem',
        subjectId: 'sub-1',
        subjectName: 'Cloud Computing & Virtualization',
        teacherName: 'Prof. Sarah Jenkins',
        totalStudents: 4,
        presentCount: 3,
        absentCount: 1,
        records: [
          { studentId: 'std-1', rollNo: 'CSE-2024-001', studentName: 'Alex Johnson', status: 'present' },
          { studentId: 'std-2', rollNo: 'CSE-2024-002', studentName: 'Sophia Martinez', status: 'present' },
          { studentId: 'std-3', rollNo: 'CSE-2024-003', studentName: 'Daniel Lee', status: 'present' },
          { studentId: 'std-4', rollNo: 'CSE-2024-004', studentName: 'Emma Watson', status: 'absent' }
        ]
      }
    ];

    saveDemoState();
  }

  populateClassDropdowns();
  populateSubjectDropdowns();
  populateTeacherDropdowns();
  renderClassesTable();
  renderSubjectsTable();
  renderTeachersTable();
  renderStudentsTable();
  renderAttendanceLogsTable();
  updateAdminStats();
  renderAdminCharts();
}

function saveDemoState() {
  localStorage.setItem('demo_classes', JSON.stringify(adminClasses));
  localStorage.setItem('demo_subjects', JSON.stringify(adminSubjects));
  localStorage.setItem('demo_teachers', JSON.stringify(adminTeachers));
  localStorage.setItem('demo_students', JSON.stringify(adminStudents));
  localStorage.setItem('demo_attendance', JSON.stringify(adminAttendance));
}

// Update Top Metric Stat Cards
function updateAdminStats() {
  const elTotalStudents = document.getElementById('statTotalStudents');
  const elTotalTeachers = document.getElementById('statTotalTeachers');
  const elPresentToday = document.getElementById('statPresentToday');
  const elAbsentToday = document.getElementById('statAbsentToday');
  const elTotalClasses = document.getElementById('statTotalClasses');
  const elAttendanceRate = document.getElementById('statAttendanceRate');

  if (elTotalStudents) elTotalStudents.textContent = adminStudents.length;
  if (elTotalTeachers) elTotalTeachers.textContent = adminTeachers.length;
  if (elTotalClasses) elTotalClasses.textContent = adminClasses.length;

  const today = getTodayDateString();
  const todaySessions = adminAttendance.filter(a => a.date === today);

  let totalPresent = 0;
  let totalAbsent = 0;

  todaySessions.forEach(session => {
    totalPresent += (session.presentCount || 0);
    totalAbsent += (session.absentCount || 0);
  });

  const totalMarked = totalPresent + totalAbsent;
  const rate = totalMarked > 0 ? ((totalPresent / totalMarked) * 100).toFixed(1) : '100.0';

  if (elPresentToday) elPresentToday.textContent = totalPresent;
  if (elAbsentToday) elAbsentToday.textContent = totalAbsent;
  if (elAttendanceRate) elAttendanceRate.textContent = `${rate}%`;
}

// Render Students Table
function renderStudentsTable(filterText = '', filterClass = '') {
  const tbody = document.getElementById('studentsTableBody');
  if (!tbody) return;

  const filtered = adminStudents.filter(std => {
    const matchesText = !filterText || 
      std.name.toLowerCase().includes(filterText.toLowerCase()) || 
      std.rollNo.toLowerCase().includes(filterText.toLowerCase()) ||
      std.email.toLowerCase().includes(filterText.toLowerCase());
    const matchesClass = !filterClass || std.classId === filterClass;
    return matchesText && matchesClass;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No students found matching current filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(std => `
    <tr>
      <td><strong>${escapeHtml(std.rollNo)}</strong></td>
      <td>
        <div class="student-cell">
          <div class="student-avatar-mini">${escapeHtml(std.name.substring(0, 2).toUpperCase())}</div>
          <div class="student-meta">
            <div class="student-name">${escapeHtml(std.name)}</div>
            <div class="student-sub">${escapeHtml(std.email)}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-primary">${escapeHtml(std.className || 'General')}</span></td>
      <td>${escapeHtml(std.section || 'A')}</td>
      <td>${escapeHtml(std.phone || '-')}</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-secondary" onclick="editStudentModal('${std.id}')" title="Edit Student">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteStudentRecord('${std.id}')" title="Delete Student">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Render Teachers Table
function renderTeachersTable(filterText = '') {
  const tbody = document.getElementById('teachersTableBody');
  if (!tbody) return;

  const filtered = adminTeachers.filter(tch => {
    return !filterText || 
      tch.name.toLowerCase().includes(filterText.toLowerCase()) ||
      tch.email.toLowerCase().includes(filterText.toLowerCase()) ||
      tch.department.toLowerCase().includes(filterText.toLowerCase());
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No teachers recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(tch => `
    <tr>
      <td><strong>${escapeHtml(tch.teacherId || 'TCH')}</strong></td>
      <td>
        <div class="student-cell">
          <div class="student-avatar-mini" style="background:#e0e7ff; color:#3730a3;">
            ${escapeHtml(tch.name.substring(0, 2).toUpperCase())}
          </div>
          <div class="student-meta">
            <div class="student-name">${escapeHtml(tch.name)}</div>
            <div class="student-sub">${escapeHtml(tch.email)}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-info">${escapeHtml(tch.department || 'Academics')}</span></td>
      <td>${escapeHtml(tch.phone || '-')}</td>
      <td><span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Active</span></td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-secondary" onclick="editTeacherModal('${tch.id}')" title="Edit Teacher">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteTeacherRecord('${tch.id}')" title="Delete Teacher">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Render Classes Table
function renderClassesTable() {
  const tbody = document.getElementById('classesTableBody');
  if (!tbody) return;

  if (adminClasses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No classes created yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = adminClasses.map(cls => {
    const studentCount = adminStudents.filter(s => s.classId === cls.id).length;
    return `
      <tr>
        <td><strong>${escapeHtml(cls.name)}</strong></td>
        <td>Section ${escapeHtml(cls.section || 'A')}</td>
        <td>${escapeHtml(cls.department || 'General')}</td>
        <td><span class="badge badge-primary">${studentCount} Students</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-secondary" onclick="editClassModal('${cls.id}')" title="Edit Class">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteClassRecord('${cls.id}')" title="Delete Class">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Subjects Table
function renderSubjectsTable() {
  const tbody = document.getElementById('subjectsTableBody');
  if (!tbody) return;

  if (adminSubjects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No subjects registered yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = adminSubjects.map(sub => `
    <tr>
      <td><code>${escapeHtml(sub.code || 'SUB')}</code></td>
      <td><strong>${escapeHtml(sub.name)}</strong></td>
      <td><span class="badge badge-primary">${escapeHtml(sub.className || 'All Classes')}</span></td>
      <td>${escapeHtml(sub.teacherName || 'Not Assigned')}</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-secondary" onclick="editSubjectModal('${sub.id}')" title="Edit Subject">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteSubjectRecord('${sub.id}')" title="Delete Subject">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Render Attendance Logs Table
function renderAttendanceLogsTable(filterDate = '', filterClass = '', filterSubject = '') {
  const tbody = document.getElementById('attendanceLogsTableBody');
  if (!tbody) return;

  const filtered = adminAttendance.filter(att => {
    const matchesDate = !filterDate || att.date === filterDate;
    const matchesClass = !filterClass || att.classId === filterClass;
    const matchesSubject = !filterSubject || att.subjectId === filterSubject;
    return matchesDate && matchesClass && matchesSubject;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No attendance records found for selected criteria.</td></tr>`;
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
        <td>${escapeHtml(att.teacherName || 'Faculty')}</td>
        <td>
          <span class="badge badge-present">${att.presentCount} Present</span>
          <span class="badge badge-absent">${att.absentCount} Absent</span>
        </td>
        <td>
          <span class="badge ${pct >= 75 ? 'badge-success' : 'badge-warning'}">${pct}%</span>
        </td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="viewAttendanceSessionModal('${att.id}')">
            <i class="fa-solid fa-eye"></i> View Detail
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Populate Class and Subject Dropdowns
function populateClassDropdowns() {
  const selects = document.querySelectorAll('select.class-dropdown');
  selects.forEach(select => {
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Select Class --</option>' +
      adminClasses.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (Sec ${c.section || 'A'})</option>`).join('');
    if (currentVal) select.value = currentVal;
  });
}

function populateSubjectDropdowns() {
  const selects = document.querySelectorAll('select.subject-dropdown');
  selects.forEach(select => {
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Select Subject --</option>' +
      adminSubjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)} (${s.code || ''})</option>`).join('');
    if (currentVal) select.value = currentVal;
  });
}

function populateTeacherDropdowns() {
  const selects = document.querySelectorAll('select.teacher-dropdown');
  selects.forEach(select => {
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Select Teacher --</option>' +
      adminTeachers.map(t => `<option value="${t.name}">${escapeHtml(t.name)}</option>`).join('');
    if (currentVal) select.value = currentVal;
  });
}

// ==========================================================================
// MODAL SETUP & CRUD FORM SUBMISSIONS
// ==========================================================================
function setupAdminModals() {
  // Student Form Submit
  const studentForm = document.getElementById('studentForm');
  if (studentForm) {
    studentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('studentIdInput').value;
      const rollNo = document.getElementById('studentRollNo').value.trim();
      const name = document.getElementById('studentName').value.trim();
      const email = document.getElementById('studentEmail').value.trim();
      const classId = document.getElementById('studentClassSelect').value;
      const section = document.getElementById('studentSection').value.trim();
      const phone = document.getElementById('studentPhone').value.trim();

      const selectedClass = adminClasses.find(c => c.id === classId);
      const className = selectedClass ? selectedClass.name : 'Unassigned';

      const studentData = { rollNo, name, email, classId, className, section, phone, role: 'student', updatedAt: new Date() };

      try {
        if (window.isFirebaseConfigured && window.isFirebaseConfigured() && window.db) {
          if (id) {
            await window.db.collection('students').doc(id).update(studentData);
            showToast('Student Updated', `${name} updated in Cloud Firestore.`, 'success');
          } else {
            studentData.createdAt = new Date();
            const newRef = await window.db.collection('students').add(studentData);
            // Also store in 'users' collection so student can log in
            await window.db.collection('users').doc(newRef.id).set({
              uid: newRef.id,
              name,
              email: email.toLowerCase(),
              role: 'student',
              rollNo,
              classId,
              className,
              createdAt: new Date()
            });
            showToast('Student Added', `${name} registered to Cloud Firestore.`, 'success');
          }
        } else {
          // Demo fallback
          if (id) {
            const idx = adminStudents.findIndex(s => s.id === id);
            if (idx !== -1) adminStudents[idx] = { ...adminStudents[idx], ...studentData };
          } else {
            studentData.id = 'std-' + Date.now();
            adminStudents.push(studentData);
          }
          saveDemoState();
          renderStudentsTable();
          updateAdminStats();
          showToast('Student Saved', `${name} saved successfully.`, 'success');
        }

        closeModal('studentModal');
        studentForm.reset();
        document.getElementById('studentIdInput').value = '';
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    });
  }

  // Teacher Form Submit
  const teacherForm = document.getElementById('teacherForm');
  if (teacherForm) {
    teacherForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('teacherIdInput').value;
      const teacherId = document.getElementById('teacherCode').value.trim();
      const name = document.getElementById('teacherName').value.trim();
      const email = document.getElementById('teacherEmail').value.trim();
      const department = document.getElementById('teacherDept').value.trim();
      const phone = document.getElementById('teacherPhone').value.trim();

      const teacherData = { teacherId, name, email, department, phone, role: 'teacher', updatedAt: new Date() };

      try {
        if (window.isFirebaseConfigured && window.isFirebaseConfigured() && window.db) {
          if (id) {
            await window.db.collection('teachers').doc(id).update(teacherData);
            showToast('Teacher Updated', `${name} updated in Cloud Firestore.`, 'success');
          } else {
            teacherData.createdAt = new Date();
            const newRef = await window.db.collection('teachers').add(teacherData);
            // Also add to 'users' collection
            await window.db.collection('users').doc(newRef.id).set({
              uid: newRef.id,
              name,
              email: email.toLowerCase(),
              role: 'teacher',
              teacherId,
              department,
              createdAt: new Date()
            });
            showToast('Teacher Registered', `${name} added to Cloud Firestore.`, 'success');
          }
        } else {
          // Demo fallback
          if (id) {
            const idx = adminTeachers.findIndex(t => t.id === id);
            if (idx !== -1) adminTeachers[idx] = { ...adminTeachers[idx], ...teacherData };
          } else {
            teacherData.id = 'tch-' + Date.now();
            adminTeachers.push(teacherData);
          }
          saveDemoState();
          populateTeacherDropdowns();
          renderTeachersTable();
          updateAdminStats();
          showToast('Teacher Saved', `${name} saved successfully.`, 'success');
        }

        closeModal('teacherModal');
        teacherForm.reset();
        document.getElementById('teacherIdInput').value = '';
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    });
  }

  // Class Form Submit
  const classForm = document.getElementById('classForm');
  if (classForm) {
    classForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('classIdInput').value;
      const name = document.getElementById('className').value.trim();
      const section = document.getElementById('classSection').value.trim();
      const department = document.getElementById('classDept').value.trim();
      const academicYear = document.getElementById('classYear').value.trim();

      const classData = { name, section, department, academicYear, updatedAt: new Date() };

      try {
        if (window.isFirebaseConfigured && window.isFirebaseConfigured() && window.db) {
          if (id) {
            await window.db.collection('classes').doc(id).update(classData);
            showToast('Class Updated', `${name} updated.`, 'success');
          } else {
            classData.createdAt = new Date();
            await window.db.collection('classes').add(classData);
            showToast('Class Created', `${name} added to Cloud.`, 'success');
          }
        } else {
          if (id) {
            const idx = adminClasses.findIndex(c => c.id === id);
            if (idx !== -1) adminClasses[idx] = { ...adminClasses[idx], ...classData };
          } else {
            classData.id = 'cls-' + Date.now();
            adminClasses.push(classData);
          }
          saveDemoState();
          populateClassDropdowns();
          renderClassesTable();
          updateAdminStats();
          showToast('Class Saved', `${name} saved.`, 'success');
        }
        closeModal('classModal');
        classForm.reset();
        document.getElementById('classIdInput').value = '';
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    });
  }

  // Subject Form Submit
  const subjectForm = document.getElementById('subjectForm');
  if (subjectForm) {
    subjectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('subjectIdInput').value;
      const code = document.getElementById('subjectCode').value.trim();
      const name = document.getElementById('subjectName').value.trim();
      const classId = document.getElementById('subjectClassSelect').value;
      const teacherName = document.getElementById('subjectTeacherSelect').value;

      const selectedClass = adminClasses.find(c => c.id === classId);
      const className = selectedClass ? selectedClass.name : 'General';

      const subjectData = { code, name, classId, className, teacherName, updatedAt: new Date() };

      try {
        if (window.isFirebaseConfigured && window.isFirebaseConfigured() && window.db) {
          if (id) {
            await window.db.collection('subjects').doc(id).update(subjectData);
            showToast('Subject Updated', `${name} updated.`, 'success');
          } else {
            subjectData.createdAt = new Date();
            await window.db.collection('subjects').add(subjectData);
            showToast('Subject Created', `${name} added to Cloud.`, 'success');
          }
        } else {
          if (id) {
            const idx = adminSubjects.findIndex(s => s.id === id);
            if (idx !== -1) adminSubjects[idx] = { ...adminSubjects[idx], ...subjectData };
          } else {
            subjectData.id = 'sub-' + Date.now();
            adminSubjects.push(subjectData);
          }
          saveDemoState();
          populateSubjectDropdowns();
          renderSubjectsTable();
          showToast('Subject Saved', `${name} saved.`, 'success');
        }
        closeModal('subjectModal');
        subjectForm.reset();
        document.getElementById('subjectIdInput').value = '';
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    });
  }
}

// Edit Modal Openers
function editStudentModal(studentId) {
  const std = adminStudents.find(s => s.id === studentId);
  if (!std) return;

  document.getElementById('studentModalTitle').textContent = 'Edit Student Details';
  document.getElementById('studentIdInput').value = std.id;
  document.getElementById('studentRollNo').value = std.rollNo || '';
  document.getElementById('studentName').value = std.name || '';
  document.getElementById('studentEmail').value = std.email || '';
  document.getElementById('studentClassSelect').value = std.classId || '';
  document.getElementById('studentSection').value = std.section || 'A';
  document.getElementById('studentPhone').value = std.phone || '';
  openModal('studentModal');
}

function openAddStudentModal() {
  document.getElementById('studentModalTitle').textContent = 'Add New Student';
  document.getElementById('studentForm').reset();
  document.getElementById('studentIdInput').value = '';
  openModal('studentModal');
}

function editTeacherModal(teacherId) {
  const tch = adminTeachers.find(t => t.id === teacherId);
  if (!tch) return;

  document.getElementById('teacherModalTitle').textContent = 'Edit Faculty Details';
  document.getElementById('teacherIdInput').value = tch.id;
  document.getElementById('teacherCode').value = tch.teacherId || '';
  document.getElementById('teacherName').value = tch.name || '';
  document.getElementById('teacherEmail').value = tch.email || '';
  document.getElementById('teacherDept').value = tch.department || '';
  document.getElementById('teacherPhone').value = tch.phone || '';
  openModal('teacherModal');
}

function openAddTeacherModal() {
  document.getElementById('teacherModalTitle').textContent = 'Add New Faculty / Teacher';
  document.getElementById('teacherForm').reset();
  document.getElementById('teacherIdInput').value = '';
  openModal('teacherModal');
}

function editClassModal(classId) {
  const cls = adminClasses.find(c => c.id === classId);
  if (!cls) return;

  document.getElementById('classModalTitle').textContent = 'Edit Class';
  document.getElementById('classIdInput').value = cls.id;
  document.getElementById('className').value = cls.name || '';
  document.getElementById('classSection').value = cls.section || 'A';
  document.getElementById('classDept').value = cls.department || '';
  document.getElementById('classYear').value = cls.academicYear || '';
  openModal('classModal');
}

function openAddClassModal() {
  document.getElementById('classModalTitle').textContent = 'Create New Class';
  document.getElementById('classForm').reset();
  document.getElementById('classIdInput').value = '';
  openModal('classModal');
}

function editSubjectModal(subjectId) {
  const sub = adminSubjects.find(s => s.id === subjectId);
  if (!sub) return;

  document.getElementById('subjectModalTitle').textContent = 'Edit Subject';
  document.getElementById('subjectIdInput').value = sub.id;
  document.getElementById('subjectCode').value = sub.code || '';
  document.getElementById('subjectName').value = sub.name || '';
  document.getElementById('subjectClassSelect').value = sub.classId || '';
  document.getElementById('subjectTeacherSelect').value = sub.teacherName || '';
  openModal('subjectModal');
}

function openAddSubjectModal() {
  document.getElementById('subjectModalTitle').textContent = 'Add New Subject';
  document.getElementById('subjectForm').reset();
  document.getElementById('subjectIdInput').value = '';
  openModal('subjectModal');
}

// Delete Record Handlers
async function deleteStudentRecord(studentId) {
  if (!confirm('Are you sure you want to delete this student record? This cannot be undone.')) return;
  try {
    if (window.isFirebaseConfigured && window.isFirebaseConfigured() && window.db) {
      await window.db.collection('students').doc(studentId).delete();
      await window.db.collection('users').doc(studentId).delete().catch(() => {});
    } else {
      adminStudents = adminStudents.filter(s => s.id !== studentId);
      saveDemoState();
      renderStudentsTable();
      updateAdminStats();
    }
    showToast('Record Deleted', 'Student has been removed from cloud database.', 'success');
  } catch (err) {
    showToast('Delete Error', err.message, 'error');
  }
}

async function deleteTeacherRecord(teacherId) {
  if (!confirm('Are you sure you want to delete this teacher?')) return;
  try {
    if (window.isFirebaseConfigured && window.isFirebaseConfigured() && window.db) {
      await window.db.collection('teachers').doc(teacherId).delete();
      await window.db.collection('users').doc(teacherId).delete().catch(() => {});
    } else {
      adminTeachers = adminTeachers.filter(t => t.id !== teacherId);
      saveDemoState();
      renderTeachersTable();
      populateTeacherDropdowns();
      updateAdminStats();
    }
    showToast('Record Deleted', 'Teacher deleted successfully.', 'success');
  } catch (err) {
    showToast('Delete Error', err.message, 'error');
  }
}

async function deleteClassRecord(classId) {
  if (!confirm('Are you sure you want to delete this class? Associated subjects may need reallocation.')) return;
  try {
    if (window.isFirebaseConfigured && window.isFirebaseConfigured() && window.db) {
      await window.db.collection('classes').doc(classId).delete();
    } else {
      adminClasses = adminClasses.filter(c => c.id !== classId);
      saveDemoState();
      renderClassesTable();
      populateClassDropdowns();
      updateAdminStats();
    }
    showToast('Class Deleted', 'Class removed.', 'success');
  } catch (err) {
    showToast('Delete Error', err.message, 'error');
  }
}

async function deleteSubjectRecord(subjectId) {
  if (!confirm('Are you sure you want to delete this subject?')) return;
  try {
    if (window.isFirebaseConfigured && window.isFirebaseConfigured() && window.db) {
      await window.db.collection('subjects').doc(subjectId).delete();
    } else {
      adminSubjects = adminSubjects.filter(s => s.id !== subjectId);
      saveDemoState();
      renderSubjectsTable();
      populateSubjectDropdowns();
    }
    showToast('Subject Deleted', 'Subject removed.', 'success');
  } catch (err) {
    showToast('Delete Error', err.message, 'error');
  }
}

// Attendance Session Detail Modal
function viewAttendanceSessionModal(sessionId) {
  const session = adminAttendance.find(a => a.id === sessionId);
  if (!session) return;

  const content = document.getElementById('sessionDetailContent');
  if (!content) return;

  const records = session.records || [];
  const pct = (records.length > 0) ? (((session.presentCount || 0) / records.length) * 100).toFixed(1) : 0;

  content.innerHTML = `
    <div style="margin-bottom: 1.5rem; background: var(--bg-muted); padding: 1rem 1.25rem; border-radius: var(--radius-md);">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;">
        <div><strong>Date:</strong> ${formatDate(session.date)}</div>
        <div><strong>Class:</strong> ${escapeHtml(session.className)}</div>
        <div><strong>Subject:</strong> ${escapeHtml(session.subjectName)}</div>
        <div><strong>Teacher:</strong> ${escapeHtml(session.teacherName || 'Faculty')}</div>
        <div><strong>Present:</strong> <span class="badge badge-present">${session.presentCount}</span></div>
        <div><strong>Absent:</strong> <span class="badge badge-absent">${session.absentCount}</span></div>
        <div><strong>Rate:</strong> <span class="badge badge-primary">${pct}%</span></div>
      </div>
    </div>
    <div class="table-responsive" style="max-height: 350px;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Roll No</th>
            <th>Student Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(r => `
            <tr>
              <td><strong>${escapeHtml(r.rollNo)}</strong></td>
              <td>${escapeHtml(r.studentName)}</td>
              <td>${getAttendanceBadge(r.status)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  openModal('sessionDetailModal');
}

// ==========================================================================
// CHARTS & VISUAL ANALYTICS (CHART.JS)
// ==========================================================================
function renderAdminCharts() {
  const dailyCanvas = document.getElementById('adminDailyChart');
  const classCanvas = document.getElementById('adminClassChart');
  if (!dailyCanvas || !classCanvas || typeof Chart === 'undefined') return;

  // 1. Daily Attendance Trend Chart (Last 7 Days)
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    last7Days.push(`${yr}-${mo}-${da}`);
  }

  const dailyRates = last7Days.map(dateStr => {
    const sessions = adminAttendance.filter(a => a.date === dateStr);
    let p = 0;
    let t = 0;
    sessions.forEach(s => {
      p += (s.presentCount || 0);
      t += ((s.presentCount || 0) + (s.absentCount || 0));
    });
    return t > 0 ? ((p / t) * 100).toFixed(1) : 0;
  });

  if (dailyChart) dailyChart.destroy();
  dailyChart = new Chart(dailyCanvas, {
    type: 'line',
    data: {
      labels: last7Days.map(d => formatDate(d)),
      datasets: [{
        label: 'Attendance Rate (%)',
        data: dailyRates,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#1d4ed8',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 100, ticks: { callback: v => `${v}%` } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  // 2. Class-Wise Attendance Distribution Chart
  const classLabels = adminClasses.map(c => c.name);
  const classRates = adminClasses.map(cls => {
    const sessions = adminAttendance.filter(a => a.classId === cls.id);
    let p = 0;
    let t = 0;
    sessions.forEach(s => {
      p += (s.presentCount || 0);
      t += ((s.presentCount || 0) + (s.absentCount || 0));
    });
    return t > 0 ? ((p / t) * 100).toFixed(1) : 85; // default benchmark if fresh
  });

  if (classChart) classChart.destroy();
  classChart = new Chart(classCanvas, {
    type: 'bar',
    data: {
      labels: classLabels,
      datasets: [{
        label: 'Average Attendance (%)',
        data: classRates,
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 100, ticks: { callback: v => `${v}%` } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// Export All Attendance Logs to CSV
function exportAllAttendanceCSV() {
  const rows = [];
  adminAttendance.forEach(att => {
    if (att.records && att.records.length > 0) {
      att.records.forEach(r => {
        rows.push({
          'Date': att.date,
          'Class': att.className,
          'Subject': att.subjectName,
          'Teacher': att.teacherName || 'Faculty',
          'Roll Number': r.rollNo,
          'Student Name': r.studentName,
          'Status': r.status.toUpperCase(),
          'Remarks': r.remarks || 'Normal'
        });
      });
    } else {
      rows.push({
        'Date': att.date,
        'Class': att.className,
        'Subject': att.subjectName,
        'Teacher': att.teacherName || 'Faculty',
        'Roll Number': '-',
        'Student Name': 'Session Summary',
        'Status': `Present: ${att.presentCount}, Absent: ${att.absentCount}`,
        'Remarks': '-'
      });
    }
  });

  downloadCSV(`College_Attendance_Report_${getTodayDateString()}`, rows);
}
