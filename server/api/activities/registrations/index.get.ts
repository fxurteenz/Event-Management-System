import db from '../../../utils/db';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const activityId = query.activity_id;
  const role = ((query.role as string) || '').toLowerCase();
  const presidentFacultyId = query.faculty_id ? Number(query.faculty_id) : null;

  if (!activityId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Activity ID is required',
    });
  }

  try {
    let sql = `
      SELECT 
        ar.registration_id,
        ar.activity_id,
        ar.student_id,
        ar.status,
        ar.registered_at,
        ar.check_in_time,
        ar.check_out_time,
        s.first_name,
        s.last_name,
        s.faculty_id,
        f.faculty_name,
        s.major_id,
        m.major_name
      FROM Activity_Registrations ar
      JOIN Students s ON ar.student_id = s.student_id
      LEFT JOIN Faculties f ON s.faculty_id = f.faculty_id
      LEFT JOIN Majors m ON s.major_id = m.major_id
      WHERE ar.activity_id = ?
    `;

    const params: any[] = [activityId];

    // Restriction for Club President: ONLY view students from the same faculty!
    if (role === 'club_president') {
      if (!presidentFacultyId) {
        throw createError({
          statusCode: 403,
          statusMessage: 'ไม่พบข้อมูลสังกัดคณะของประธานสโมสร ไม่สามารถเข้าถึงข้อมูลได้',
        });
      }
      sql += ' AND s.faculty_id = ?';
      params.push(presidentFacultyId);
    }

    sql += ' ORDER BY ar.registered_at DESC';

    const [rows]: any = await db.execute(sql, params);

    return {
      success: true,
      data: rows,
      is_restricted_faculty: role === 'club_president',
      filtered_faculty_id: presidentFacultyId
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching registrations',
      data: error.message,
    });
  }
});
