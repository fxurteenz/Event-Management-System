import db from '../../../utils/db';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  if (!body || !body.student_id || !body.first_name || !body.last_name || !body.major_id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing fields' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Create User Account for the student automatically
    // Using student_id as both username and initial password
    const [userResult]: any = await connection.execute(
      'INSERT INTO Users (username, password_hash, role) VALUES (?, ?, ?)',
      [body.student_id, body.student_id, 'Student']
    );

    const newUserId = userResult.insertId;
    const facultyId = body.faculty_id ? Number(body.faculty_id) : null;

    // 2. Create Student Profile linking to Faculty, Major, and User Account
    await connection.execute(
      'INSERT INTO Students (student_id, first_name, last_name, faculty_id, major_id, user_id, accumulated_hours) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [body.student_id, body.first_name, body.last_name, facultyId, body.major_id, newUserId, body.accumulated_hours || 0]
    );

    await connection.commit();
    return { success: true, message: 'Student and User Account created automatically' };

  } catch (e: any) {
    await connection.rollback();
    
    if (e.code === 'ER_DUP_ENTRY') {
      throw createError({ statusCode: 400, statusMessage: 'Student ID or Username already exists' });
    }
    
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error', data: e.message });
  } finally {
    connection.release();
  }
});
