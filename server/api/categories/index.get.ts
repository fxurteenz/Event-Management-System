import db from '../../utils/db';

export default defineEventHandler(async (event) => {
  try {
    let [rows]: any = await db.execute('SELECT * FROM Activity_Categories ORDER BY category_id ASC');
    
    // Seed default categories if empty
    if (rows.length === 0) {
      const defaultCategories = [
        'กิจกรรมบังคับ',
        'กิจกรรมเลือก',
        'กิจกรรมบำเพ็ญประโยชน์',
        'กิจกรรมส่งเสริมวิชาการ',
        'กิจกรรมกีฬาและนันทนาการ'
      ];
      for (const cat of defaultCategories) {
        await db.execute('INSERT INTO Activity_Categories (category_name) VALUES (?)', [cat]);
      }
      const [newRows]: any = await db.execute('SELECT * FROM Activity_Categories ORDER BY category_id ASC');
      rows = newRows;
    }

    return {
      success: true,
      data: rows
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching categories',
      data: error.message
    });
  }
});
