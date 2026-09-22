import db from '../../utils/db';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Activity ID is required' });

  const body = await readBody(event);

  if (!body || !body.title || !body.start_time || !body.end_time || body.activity_hours === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'กรุณากรอกข้อมูลกิจกรรมให้ครบถ้วน' });
  }

  const maxParticipants = body.max_participants && Number(body.max_participants) > 0 
    ? Number(body.max_participants) 
    : null;

  const targetFacultyIds = Array.isArray(body.target_faculty_ids) 
    ? body.target_faculty_ids.map((fid: any) => Number(fid)).filter((fid: number) => !isNaN(fid) && fid > 0)
    : [];

  const targetMajorIds = Array.isArray(body.target_major_ids) 
    ? body.target_major_ids.map((mid: any) => Number(mid)).filter((mid: number) => !isNaN(mid) && mid > 0)
    : [];

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [result]: any = await connection.execute(
      `UPDATE Activities SET
        title = ?,
        description = ?,
        category_id = ?,
        start_time = ?,
        end_time = ?,
        activity_hours = ?,
        max_participants = ?
       WHERE activity_id = ?`,
      [
        body.title,
        body.description || null,
        body.category_id ? Number(body.category_id) : null,
        body.start_time,
        body.end_time,
        Number(body.activity_hours) || 0,
        maxParticipants,
        id
      ]
    );

    if (result.affectedRows === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Activity not found' });
    }

    // Replace target faculties
    await connection.execute('DELETE FROM Activity_Target_Faculties WHERE activity_id = ?', [id]);
    for (const facId of targetFacultyIds) {
      await connection.execute(
        'INSERT IGNORE INTO Activity_Target_Faculties (activity_id, faculty_id) VALUES (?, ?)',
        [id, facId]
      );
    }

    // Replace target majors
    await connection.execute('DELETE FROM Activity_Target_Majors WHERE activity_id = ?', [id]);
    for (const majId of targetMajorIds) {
      await connection.execute(
        'INSERT IGNORE INTO Activity_Target_Majors (activity_id, major_id) VALUES (?, ?)',
        [id, majId]
      );
    }

    await connection.commit();

    return {
      success: true,
      message: 'อัปเดตข้อมูลกิจกรรมสำเร็จ'
    };
  } catch (error: any) {
    await connection.rollback();
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: 'Error updating activity',
      data: error.message
    });
  } finally {
    connection.release();
  }
});
