import db from '../../../utils/db';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Student ID is required' });

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Find the linked user_id
    const [rows]: any = await connection.execute(
      'SELECT user_id FROM Students WHERE student_id = ?',
      [id]
    );

    if (rows.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Student not found' });
    }

    const userId = rows[0].user_id;

    // 2. Delete Student record
    await connection.execute('DELETE FROM Students WHERE student_id = ?', [id]);

    // 3. Delete linked User record if exists
    if (userId) {
      await connection.execute('DELETE FROM Users WHERE user_id = ?', [userId]);
    }

    await connection.commit();
    return { success: true, message: 'Student and linked User deleted successfully' };
  } catch (error: any) {
    await connection.rollback();
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: 'Error deleting student',
      data: error.message,
    });
  } finally {
    connection.release();
  }
});
