import db from '../../utils/db';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body || !body.title || !body.start_time || !body.end_time || body.activity_hours === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'กรุณากรอกข้อมูลกิจกรรมให้ครบถ้วน' });
  }

  // Generate a unique QR code data string
  const qrCodeData = body.qr_code_data || `ACT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  try {
    const [result]: any = await db.execute(
      `INSERT INTO Activities (title, description, category_id, start_time, end_time, activity_hours, qr_code_data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        body.title,
        body.description || null,
        body.category_id ? Number(body.category_id) : null,
        body.start_time,
        body.end_time,
        Number(body.activity_hours) || 0,
        qrCodeData
      ]
    );

    return {
      success: true,
      message: 'สร้างกิจกรรมสำเร็จ',
      id: result.insertId
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error creating activity',
      data: error.message
    });
  }
});
