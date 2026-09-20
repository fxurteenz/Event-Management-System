import db from "../../../utils/db";

export default defineEventHandler(async (event) => {
  try {
    const query = `
      SELECT 
        s.student_id,
        s.first_name,
        s.last_name,
        s.accumulated_hours,
        COALESCE(s.faculty_id, m.faculty_id) AS faculty_id,
        COALESCE(f.faculty_name, f_maj.faculty_name) AS faculty_name,
        s.major_id,
        m.major_name,
        u.username
      FROM Students s
      LEFT JOIN Faculties f ON s.faculty_id = f.faculty_id
      LEFT JOIN Majors m ON s.major_id = m.major_id
      LEFT JOIN Faculties f_maj ON m.faculty_id = f_maj.faculty_id
      LEFT JOIN Users u ON s.user_id = u.user_id
      ORDER BY s.student_id ASC
    `;
    const [rows]: any = await db.execute(query);
    return { success: true, data: rows };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: "Error fetching students",
      data: error.message,
    });
  }
});