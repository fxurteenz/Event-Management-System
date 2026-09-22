import db from '../../utils/db';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body || !body.title || !body.start_time || !body.end_time || body.activity_hours === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'กรุณากรอกข้อมูลกิจกรรมให้ครบถ้วน' });
  }

  // Generate a unique QR code data string
  const qrCodeData = body.qr_code_data || `ACT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const maxParticipants = body.max_participants && Number(body.max_participants) > 0 
    ? Number(body.max_participants) 
    : null;

  const targetFacultyIds = Array.isArray(body.target_faculty_ids) 
    ? body.target_faculty_ids.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0)
    : [];

  const targetMajorIds = Array.isArray(body.target_major_ids) 
    ? body.target_major_ids.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0)
    : [];

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [result]: any = await connection.execute(
      `INSERT INTO Activities (
        title, 
        description, 
        category_id, 
        start_time, 
        end_time, 
        activity_hours, 
        qr_code_data,
        max_participants
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.title,
        body.description || null,
        body.category_id ? Number(body.category_id) : null,
        body.start_time,
        body.end_time,
        Number(body.activity_hours) || 0,
        qrCodeData,
        maxParticipants
      ]
    );

    const newActivityId = result.insertId;

    // Insert multiple target faculties
    for (const facId of targetFacultyIds) {
      await connection.execute(
        'INSERT IGNORE INTO Activity_Target_Faculties (activity_id, faculty_id) VALUES (?, ?)',
        [newActivityId, facId]
      );
    }

    // Insert multiple target majors
    for (const majId of targetMajorIds) {
      await connection.execute(
        'INSERT IGNORE INTO Activity_Target_Majors (activity_id, major_id) VALUES (?, ?)',
        [newActivityId, majId]
      );
    }

    await connection.commit();

    return {
      success: true,
      message: 'สร้างกิจกรรมสำเร็จ',
      id: newActivityId
    };
  } catch (error: any) {
    await connection.rollback();
    throw createError({
      statusCode: 500,
      statusMessage: 'Error creating activity',
      data: error.message
    });
  } finally {
    connection.release();
  }
});
