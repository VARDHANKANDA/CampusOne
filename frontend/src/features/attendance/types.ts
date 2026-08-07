export interface AttendanceSession {
  id: string;
  faculty_id: string;
  course_code: string;
  qr_token: string;
  expires_at: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  student_name: string;
  scanned_at: string;
}

export interface SessionReport {
  session_id: string;
  course_code: string;
  faculty_id: string;
  created_at: string;
  expires_at: string;
  scan_count: number;
}
