import db from '../../utils/db';

export default defineEventHandler(async (event) => {
  try {
    const query = `
      SELECT 
        a.activity_id, 
        a.title, 
        a.description,
        a.start_time, 
        a.end_time, 
        a.activity_hours,
        a.category_id,
        c.category_name,
        a.qr_code_data
      FROM Activities a
      LEFT JOIN Activity_Categories c ON a.category_id = c.category_id
      ORDER BY a.start_time ASC
    `;
    const [rows]: any = await db.execute(query);
    
    return {
      success: true,
      data: rows
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching activities',
      data: error.message
    });
  }
});
