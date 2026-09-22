import db from "../../../utils/db";

export default defineEventHandler(async () => {
  try {
    const query = `
      SELECT 
        u.user_id, 
        u.username, 
        u.role,
        COALESCE(s.faculty_id, u.faculty_id) AS faculty_id,
        COALESCE(f_stu.faculty_name, f_usr.faculty_name) AS faculty_name,
        s.major_id,
        m.major_name,
        s.student_id,
        s.first_name,
        s.last_name,
        s.accumulated_hours
      FROM Users u
      LEFT JOIN Students s ON (s.user_id = u.user_id OR s.student_id = u.username)
      LEFT JOIN Faculties f_stu ON s.faculty_id = f_stu.faculty_id
      LEFT JOIN Faculties f_usr ON u.faculty_id = f_usr.faculty_id
      LEFT JOIN Majors m ON s.major_id = m.major_id
      ORDER BY u.user_id DESC
    `;
    const [rows]: any = await db.execute(query);
    return { success: true, data: rows };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: "Error fetching users",
      data: error.message,
    });
  }
});