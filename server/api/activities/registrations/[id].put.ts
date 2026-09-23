import db from '../../../utils/db';

export default defineEventHandler(async (event) => {
  const regId = getRouterParam(event, 'id');
  if (!regId) {
    throw createError({ statusCode: 400, statusMessage: 'Registration ID is required' });
  }

  const body = await readBody(event);
  if (!body || !body.status) {
    throw createError({ statusCode: 400, statusMessage: 'Status is required' });
  }

  const role = ((body.role as string) || '').toLowerCase();
  const presidentFacultyId = body.faculty_id ? Number(body.faculty_id) : null;
  const statusMap: Record<string, string> = {
    confirmed: 'Confirmed',
    registered: 'Registered',
    cancelled: 'Cancelled'
  };
  const newStatus = statusMap[((body.status as string) || '').toLowerCase()] || body.status;

  try {
    // If Club President, enforce that this student is within their faculty
    if (role === 'club_president') {
      const [checkRows]: any = await db.execute(
        `SELECT s.faculty_id 
         FROM Activity_Registrations ar
         JOIN Students s ON ar.student_id = s.student_id
         WHERE ar.registration_id = ?`,
        [regId]
      );

      if (checkRows.length === 0) {
        throw createError({ statusCode: 404, statusMessage: 'ไม่พบรายการลงทะเบียนนี้' });
      }

      const studentFacultyId = Number(checkRows[0].faculty_id);
      if (studentFacultyId !== presidentFacultyId) {
        throw createError({
          statusCode: 403,
          statusMessage: 'ท่านไม่มีสิทธิ์จัดการข้อมูลนักศึกษานอกสังกัดคณะของท่าน',
        });
      }
    }

    const [result]: any = await db.execute(
      'UPDATE Activity_Registrations SET status = ? WHERE registration_id = ?',
      [newStatus, regId]
    );

    if (result.affectedRows === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Registration not found' });
    }

    return {
      success: true,
      message: 'อัปเดตสถานะการลงทะเบียนสำเร็จ',
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: 'Error updating registration status',
      data: error.message,
    });
  }
});
