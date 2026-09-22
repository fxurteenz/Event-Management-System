import db from "../../../utils/db";

export default defineEventHandler(async (event) => {

    const query = `
      SELECT m.major_id, m.major_name, m.faculty_id, f.faculty_name 
      FROM Majors m 
      LEFT JOIN Faculties f ON m.faculty_id = f.faculty_id 
      ORDER BY m.major_id DESC
    `;
    const [rows]: any = await db.execute(query);
    return { success: true, data: rows };
  
});