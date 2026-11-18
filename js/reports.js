/* ==========================================================================
   CLOUD-BASED ATTENDANCE MANAGEMENT SYSTEM
   Advanced Reports Engine - Daily/Monthly Reports, Filters & CSV Export
   ========================================================================== */

/**
 * Filter Attendance Collection
 * @param {Array} attendanceList
 * @param {Object} filters { startDate, endDate, classId, subjectId, studentQuery }
 * @returns {Array} Flattened individual student attendance records matching criteria
 */
function filterAttendanceRecords(attendanceList, filters = {}) {
  const { startDate, endDate, classId, subjectId, studentQuery } = filters;
  const flattened = [];

  attendanceList.forEach(session => {
    // Check date range
    if (startDate && session.date < startDate) return;
    if (endDate && session.date > endDate) return;

    // Check class & subject
    if (classId && session.classId !== classId) return;
    if (subjectId && session.subjectId !== subjectId) return;

    if (session.records && Array.isArray(session.records)) {
      session.records.forEach(r => {
        // Check student query (name or roll number)
        if (studentQuery) {
          const q = studentQuery.toLowerCase();
          const matchName = r.studentName && r.studentName.toLowerCase().includes(q);
          const matchRoll = r.rollNo && r.rollNo.toLowerCase().includes(q);
          if (!matchName && !matchRoll) return;
        }

        flattened.push({
          date: session.date,
          classId: session.classId,
          className: session.className,
          subjectId: session.subjectId,
          subjectName: session.subjectName,
          teacherName: session.teacherName || 'Faculty',
          studentId: r.studentId,
          rollNo: r.rollNo,
          studentName: r.studentName,
          status: r.status,
          remarks: r.remarks || ''
        });
      });
    }
  });

  return flattened;
}

/**
 * Compute Aggregated Student Statistics
 * @param {Array} records 
 * @returns {Array} List of students with aggregated stats
 */
function aggregateStudentStatistics(records) {
  const map = {};

  records.forEach(r => {
    const key = r.rollNo || r.studentName;
    if (!map[key]) {
      map[key] = {
        rollNo: r.rollNo,
        name: r.studentName,
        className: r.className,
        totalSessions: 0,
        present: 0,
        absent: 0
      };
    }

    map[key].totalSessions++;
    if (r.status === 'present') map[key].present++;
    else map[key].absent++;
  });

  return Object.values(map).map(item => {
    const percentage = item.totalSessions > 0 ? ((item.present / item.totalSessions) * 100).toFixed(1) : 0;
    return {
      ...item,
      percentage: Number(percentage),
      isEligible: percentage >= 75
    };
  });
}

/**
 * Generate CSV and Trigger Browser Download
 */
function exportFilteredReportToCSV(records, filenamePrefix = 'Attendance_Report') {
  if (!records || !records.length) {
    showToast('Export Error', 'No data matches the selected filters to export.', 'warning');
    return;
  }

  const rows = records.map(r => ({
    'Date': r.date,
    'Class': r.className,
    'Subject': r.subjectName,
    'Teacher': r.teacherName,
    'Roll Number': r.rollNo,
    'Student Name': r.studentName,
    'Status': (r.status || '').toUpperCase(),
    'Remarks': r.remarks || 'Regular'
  }));

  const filename = `${filenamePrefix}_${getTodayDateString()}`;
  downloadCSV(filename, rows);
}

/**
 * Trigger Browser Print Dialog
 */
function printReport() {
  window.print();
}

// Attach to window
window.ReportsEngine = {
  filterAttendanceRecords,
  aggregateStudentStatistics,
  exportFilteredReportToCSV,
  printReport
};
