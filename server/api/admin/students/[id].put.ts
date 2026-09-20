import db from "../../../utils/db";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Student ID is required" });

  const body = await readBody(event);
  if (!body || !body.first_name || !body.last_name || !body.major_id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing fields' });
  }
  
  const facultyId = body.faculty_id ? Number(body.faculty_id) : null;

  const [result]: any = await db.execute(
    'UPDATE Students SET first_name = ?, last_name = ?, faculty_id = ?, major_id = ?, accumulated_hours = ? WHERE student_id = ?',
    [body.first_name, body.last_name, facultyId, body.major_id, body.accumulated_hours || 0, id]
  );
  
  if (result.affectedRows === 0) throw createError({ statusCode: 404, statusMessage: 'Not found' });
  return { success: true, message: 'Student updated' };
});