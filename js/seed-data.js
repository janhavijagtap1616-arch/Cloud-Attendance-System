/* ==========================================================================
   CLOUD-BASED ATTENDANCE MANAGEMENT SYSTEM
   Cloud Database Seeder - 1-Click Firestore Initialization & Sample Data
   ========================================================================== */

const SEED_DATA = {
  classes: [
    { id: 'cls-cse-6a', name: 'B.Tech CSE - 6th Sem', section: 'A', department: 'Computer Science & Engineering', academicYear: '2024-2025' },
    { id: 'cls-cse-4b', name: 'B.Tech CSE - 4th Sem', section: 'B', department: 'Computer Science & Engineering', academicYear: '2024-2025' },
    { id: 'cls-bca-2a', name: 'BCA - 2nd Year', section: 'A', department: 'Computer Applications', academicYear: '2024-2025' }
  ],

  subjects: [
    { id: 'sub-cc-601', code: 'CS601', name: 'Cloud Computing & Virtualization', classId: 'cls-cse-6a', className: 'B.Tech CSE - 6th Sem', teacherName: 'Prof. Sarah Jenkins' },
    { id: 'sub-ds-602', code: 'CS602', name: 'Data Structures & Algorithms', classId: 'cls-cse-6a', className: 'B.Tech CSE - 6th Sem', teacherName: 'Dr. Robert Vance' },
    { id: 'sub-db-401', code: 'CS401', name: 'Database Management Systems', classId: 'cls-cse-4b', className: 'B.Tech CSE - 4th Sem', teacherName: 'Prof. Sarah Jenkins' },
    { id: 'sub-cn-402', code: 'CS402', name: 'Computer Networks & Security', classId: 'cls-cse-4b', className: 'B.Tech CSE - 4th Sem', teacherName: 'Prof. Michael Chang' }
  ],

  teachers: [
    { id: 'tch-sarah', teacherId: 'TCH-101', name: 'Prof. Sarah Jenkins', email: 'teacher@college.edu', department: 'Computer Science', phone: '+1 555-019-2834', role: 'teacher' },
    { id: 'tch-robert', teacherId: 'TCH-102', name: 'Dr. Robert Vance (Admin)', email: 'admin@college.edu', department: 'Computer Science', phone: '+1 555-019-2835', role: 'admin' },
    { id: 'tch-michael', teacherId: 'TCH-103', name: 'Prof. Michael Chang', email: 'chang@college.edu', department: 'Information Technology', phone: '+1 555-019-2836', role: 'teacher' }
  ],

  students: [
    { id: 'std-alex', rollNo: 'CSE-2024-001', name: 'Alex Johnson', email: 'student@college.edu', classId: 'cls-cse-6a', className: 'B.Tech CSE - 6th Sem', section: 'A', phone: '+1 555-010-0001', role: 'student' },
    { id: 'std-sophia', rollNo: 'CSE-2024-002', name: 'Sophia Martinez', email: 'sophia@college.edu', classId: 'cls-cse-6a', className: 'B.Tech CSE - 6th Sem', section: 'A', phone: '+1 555-010-0002', role: 'student' },
    { id: 'std-daniel', rollNo: 'CSE-2024-003', name: 'Daniel Lee', email: 'daniel@college.edu', classId: 'cls-cse-6a', className: 'B.Tech CSE - 6th Sem', section: 'A', phone: '+1 555-010-0003', role: 'student' },
    { id: 'std-emma', rollNo: 'CSE-2024-004', name: 'Emma Watson', email: 'emma@college.edu', classId: 'cls-cse-6a', className: 'B.Tech CSE - 6th Sem', section: 'A', phone: '+1 555-010-0004', role: 'student' },
    { id: 'std-liam', rollNo: 'CSE-2024-005', name: 'Liam Smith', email: 'liam@college.edu', classId: 'cls-cse-6a', className: 'B.Tech CSE - 6th Sem', section: 'A', phone: '+1 555-010-0005', role: 'student' },
    { id: 'std-olivia', rollNo: 'CSE-2024-006', name: 'Olivia Taylor', email: 'olivia@college.edu', classId: 'cls-cse-4b', className: 'B.Tech CSE - 4th Sem', section: 'B', phone: '+1 555-010-0006', role: 'student' },
    { id: 'std-noah', rollNo: 'CSE-2024-007', name: 'Noah Davis', email: 'noah@college.edu', classId: 'cls-cse-4b', className: 'B.Tech CSE - 4th Sem', section: 'B', phone: '+1 555-010-0007', role: 'student' },
    { id: 'std-ava', rollNo: 'CSE-2024-008', name: 'Ava Wilson', email: 'ava@college.edu', classId: 'cls-cse-4b', className: 'B.Tech CSE - 4th Sem', section: 'B', phone: '+1 555-010-0008', role: 'student' }
  ]
};

/**
 * Generate 10 Days of Realistic Attendance History
 */
function generateHistoricalAttendance() {
  const attendanceList = [];
  const classAStudents = SEED_DATA.students.filter(s => s.classId === 'cls-cse-6a');
  const classBStudents = SEED_DATA.students.filter(s => s.classId === 'cls-cse-4b');

  for (let i = 9; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yr}-${mo}-${da}`;

    // Session 1: Cloud Computing for Class 6A
    const records1 = classAStudents.map((s, idx) => {
      // Alex is present almost every day, Emma has 2 absent days
      const isAbsent = (s.rollNo === 'CSE-2024-004' && (i === 2 || i === 5)) ||
                       (s.rollNo === 'CSE-2024-003' && i === 1);
      return {
        studentId: s.id,
        rollNo: s.rollNo,
        studentName: s.name,
        status: isAbsent ? 'absent' : 'present',
        remarks: isAbsent ? 'Medical Leave' : 'Present'
      };
    });

    let p1 = 0, a1 = 0;
    records1.forEach(r => r.status === 'present' ? p1++ : a1++);

    attendanceList.push({
      id: `${dateStr}_cls-cse-6a_sub-cc-601`,
      date: dateStr,
      classId: 'cls-cse-6a',
      className: 'B.Tech CSE - 6th Sem',
      subjectId: 'sub-cc-601',
      subjectName: 'Cloud Computing & Virtualization',
      teacherName: 'Prof. Sarah Jenkins',
      records: records1,
      totalStudents: records1.length,
      presentCount: p1,
      absentCount: a1,
      updatedAt: new Date()
    });

    // Session 2: Data Structures for Class 6A
    const records2 = classAStudents.map(s => {
      const isAbsent = (s.rollNo === 'CSE-2024-005' && i === 3);
      return {
        studentId: s.id,
        rollNo: s.rollNo,
        studentName: s.name,
        status: isAbsent ? 'absent' : 'present',
        remarks: isAbsent ? 'Unexcused' : 'Present'
      };
    });

    let p2 = 0, a2 = 0;
    records2.forEach(r => r.status === 'present' ? p2++ : a2++);

    attendanceList.push({
      id: `${dateStr}_cls-cse-6a_sub-ds-602`,
      date: dateStr,
      classId: 'cls-cse-6a',
      className: 'B.Tech CSE - 6th Sem',
      subjectId: 'sub-ds-602',
      subjectName: 'Data Structures & Algorithms',
      teacherName: 'Dr. Robert Vance',
      records: records2,
      totalStudents: records2.length,
      presentCount: p2,
      absentCount: a2,
      updatedAt: new Date()
    });

    // Session 3: Database Management for Class 4B
    const records3 = classBStudents.map(s => {
      const isAbsent = (s.rollNo === 'CSE-2024-007' && i === 4);
      return {
        studentId: s.id,
        rollNo: s.rollNo,
        studentName: s.name,
        status: isAbsent ? 'absent' : 'present',
        remarks: isAbsent ? 'Sick' : 'Present'
      };
    });

    let p3 = 0, a3 = 0;
    records3.forEach(r => r.status === 'present' ? p3++ : a3++);

    attendanceList.push({
      id: `${dateStr}_cls-cse-4b_sub-db-401`,
      date: dateStr,
      classId: 'cls-cse-4b',
      className: 'B.Tech CSE - 4th Sem',
      subjectId: 'sub-db-401',
      subjectName: 'Database Management Systems',
      teacherName: 'Prof. Sarah Jenkins',
      records: records3,
      totalStudents: records3.length,
      presentCount: p3,
      absentCount: a3,
      updatedAt: new Date()
    });
  }

  return attendanceList;
}

/**
 * Execute Cloud Firestore Seeding Process
 */
async function seedCloudFirestore(logCallback) {
  if (!window.isFirebaseConfigured || !window.isFirebaseConfigured() || !window.db) {
    throw new Error('Firebase configuration keys not found in js/firebase-config.js. Please insert your keys before seeding.');
  }

  const db = window.db;
  const attendanceData = generateHistoricalAttendance();

  logCallback('🚀 Starting Cloud Database Seeding on Firestore...');

  // 1. Seed Classes
  logCallback(`📁 Seeding ${SEED_DATA.classes.length} classes into collection 'classes'...`);
  for (const c of SEED_DATA.classes) {
    await db.collection('classes').doc(c.id).set(c);
  }
  logCallback('✅ Classes seeded successfully.');

  // 2. Seed Subjects
  logCallback(`📁 Seeding ${SEED_DATA.subjects.length} subjects into collection 'subjects'...`);
  for (const s of SEED_DATA.subjects) {
    await db.collection('subjects').doc(s.id).set(s);
  }
  logCallback('✅ Subjects seeded successfully.');

  // 3. Seed Teachers & Users
  logCallback(`📁 Seeding ${SEED_DATA.teachers.length} faculty members into 'teachers' and 'users'...`);
  for (const t of SEED_DATA.teachers) {
    await db.collection('teachers').doc(t.id).set(t);
    await db.collection('users').doc(t.id).set({
      uid: t.id,
      name: t.name,
      email: t.email,
      role: t.role,
      teacherId: t.teacherId,
      department: t.department,
      createdAt: new Date()
    });
  }
  logCallback('✅ Faculty records created.');

  // 4. Seed Students & Users
  logCallback(`📁 Seeding ${SEED_DATA.students.length} students into 'students' and 'users'...`);
  for (const s of SEED_DATA.students) {
    await db.collection('students').doc(s.id).set(s);
    await db.collection('users').doc(s.id).set({
      uid: s.id,
      name: s.name,
      email: s.email,
      role: 'student',
      rollNo: s.rollNo,
      classId: s.classId,
      className: s.className,
      createdAt: new Date()
    });
  }
  logCallback('✅ Students seeded successfully.');

  // 5. Seed Attendance Sessions
  logCallback(`📁 Seeding ${attendanceData.length} attendance sessions into collection 'attendance'...`);
  for (const a of attendanceData) {
    await db.collection('attendance').doc(a.id).set(a);
  }
  logCallback('✅ Attendance sessions seeded successfully.');

  logCallback('🎉 Firestore Cloud Database Seeding Complete! All collections are live.');
}

/**
 * Seed Local Demo Storage (For immediate testing without Firebase keys)
 */
function seedLocalDemoStorage() {
  const attendanceData = generateHistoricalAttendance();
  localStorage.setItem('demo_classes', JSON.stringify(SEED_DATA.classes));
  localStorage.setItem('demo_subjects', JSON.stringify(SEED_DATA.subjects));
  localStorage.setItem('demo_teachers', JSON.stringify(SEED_DATA.teachers));
  localStorage.setItem('demo_students', JSON.stringify(SEED_DATA.students));
  localStorage.setItem('demo_attendance', JSON.stringify(attendanceData));
}

window.seedCloudFirestore = seedCloudFirestore;
window.seedLocalDemoStorage = seedLocalDemoStorage;
window.SEED_DATA = SEED_DATA;
