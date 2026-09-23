import db from '../../../utils/db';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!body || !Array.isArray(body.registration_ids) || body.registration_ids.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'กรุณาเลือกรายการที่ต้องการดำเนินการ' });
  }

  if (!body.status) {
    throw createError({ statusCode: 400, statusMessage: 'จำเป็นต้องระบุสถานะ' });
  }

  const role = ((body.role as string) || '').toLowerCase();
  const presidentFacultyId = body.faculty_id ? Number(body.faculty_id) : null;
  const statusMap: Record<string, string> = {
    confirmed: 'Confirmed',
    registered: 'Registered',
    cancelled: 'Cancelled'
  };
  const newStatus = statusMap[((body.status as string) || '').toLowerCase()] || body.status;

  const regIds = body.registration_ids.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0);
  if (regIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'ไม่พบรายการที่ถูกต้อง' });
  }

  try {
    // If Club President, enforce that all selected students belong to their faculty
    if (role === 'club_president') {
      if (!presidentFacultyId) {
        throw createError({
          statusCode: 403,
          statusMessage: 'ไม่พบข้อมูลคณะของท่าน ไม่สามารถดำเนินการได้',
        });
      }

      const placeholders = regIds.map(() => '?').join(',');
      const [checkRows]: any = await db.execute(
        `SELECT ar.registration_id, s.faculty_id 
         FROM Activity_Registrations ar
         JOIN Students s ON ar.student_id = s.student_id
         WHERE ar.registration_id IN (${placeholders})`,
        regIds
      );

      const unauthorized = checkRows.some((r: any) => Number(r.faculty_id) !== presidentFacultyId);
      if (unauthorized || checkRows.length !== regIds.length) {
        throw createError({
          statusCode: 403,
          statusMessage: 'มีบางรายการอยู่นอกสังกัดคณะของท่าน ไม่สามารถดำเนินการได้',
        });
      }
    }

    const placeholders = regIds.map(() => '?').join(',');
    const [result]: any = await db.execute(
      `UPDATE Activity_Registrations SET status = ? WHERE registration_id IN (${placeholders})`,
      [newStatus, ...regIds]
    );

    return {
      success: true,
      affectedRows: result.affectedRows,
      message: `อัปเดตสถานะสำเร็จ ${result.affectedRows} รายการ`,
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    console.error('Error updating bulk registrations:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'เกิดข้อผิดพลาดในการอัปเดตสถานะแบบกลุ่ม',
    });
  }
});
