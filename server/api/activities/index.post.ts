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

    // Check if the activity is a mandatory activity ("กิจกรรมบังคับ")
    let isMandatory = false;
    if (body.category_id) {
      const [catRows]: any = await connection.execute(
        'SELECT category_id, category_name FROM Activity_Categories WHERE category_id = ?',
        [Number(body.category_id)]
      );
      if (catRows.length > 0) {
        const catName = catRows[0].category_name || '';
        if (Number(catRows[0].category_id) === 1 || catName.includes('บังคับ')) {
          isMandatory = true;
        }
      }
    }

    // Auto-enroll and auto-confirm students for mandatory activity
    let enrolledCount = 0;
    if (isMandatory) {
      if (targetMajorIds.length > 0) {
        const [regResult]: any = await connection.query(
          `INSERT INTO Activity_Registrations (activity_id, student_id, status, registered_at)
           SELECT ?, student_id, 'Confirmed', CURRENT_TIMESTAMP
           FROM Students
           WHERE major_id IN (?)
           ON DUPLICATE KEY UPDATE status = 'Confirmed'`,
          [newActivityId, targetMajorIds]
        );
        enrolledCount = regResult.affectedRows || 0;
      } else if (targetFacultyIds.length > 0) {
        const [regResult]: any = await connection.query(
          `INSERT INTO Activity_Registrations (activity_id, student_id, status, registered_at)
           SELECT ?, student_id, 'Confirmed', CURRENT_TIMESTAMP
           FROM Students
           WHERE faculty_id IN (?)
           ON DUPLICATE KEY UPDATE status = 'Confirmed'`,
          [newActivityId, targetFacultyIds]
        );
        enrolledCount = regResult.affectedRows || 0;
      } else {
        const [regResult]: any = await connection.query(
          `INSERT INTO Activity_Registrations (activity_id, student_id, status, registered_at)
           SELECT ?, student_id, 'Confirmed', CURRENT_TIMESTAMP
           FROM Students
           ON DUPLICATE KEY UPDATE status = 'Confirmed'`,
          [newActivityId]
        );
        enrolledCount = regResult.affectedRows || 0;
      }
    }

    await connection.commit();

    return {
      success: true,
      message: isMandatory 
        ? `สร้างกิจกรรมบังคับสำเร็จ และได้ลงทะเบียนพร้อมยืนยันสถานะให้นักศึกษาจำนวน ${enrolledCount} คนโดยอัตโนมัติแล้ว`
        : 'สร้างกิจกรรมสำเร็จ',
      id: newActivityId,
      is_mandatory: isMandatory,
      enrolled_count: enrolledCount
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
