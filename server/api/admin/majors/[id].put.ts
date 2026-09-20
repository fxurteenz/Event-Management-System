import db from "../../../utils/db";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID is required" });

    const body = await readBody(event);
    if (!body || !body.major_name || !body.faculty_id) {
      throw createError({ statusCode: 400, statusMessage: 'Missing fields' });
    }
    const [result]: any = await db.execute(
      'UPDATE Majors SET major_name = ?, faculty_id = ? WHERE major_id = ?',
      [body.major_name, body.faculty_id, id]
    );
    if (result.affectedRows === 0) throw createError({ statusCode: 404, statusMessage: 'Not found' });
    return { success: true, message: 'Major updated' };
  
});