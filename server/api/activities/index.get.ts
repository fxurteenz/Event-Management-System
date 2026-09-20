import db from '../../utils/db';

export default defineEventHandler(async (event) => {
  try {
    // Join Activities with Activity_Categories and Users to get useful data
    const query = `
      SELECT 
        a.activity_id, 
        a.title, 
        a.start_time, 
        a.end_time, 
        a.activity_hours,
        c.category_name,
        u.username as creator_name
      FROM Activities a
      LEFT JOIN Activity_Categories c ON a.category_id = c.category_id
      LEFT JOIN Users u ON a.created_by = u.user_id
      ORDER BY a.start_time DESC
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
