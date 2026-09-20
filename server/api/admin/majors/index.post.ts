import db from '../../../utils/db';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!body || !body.major_name || !body.faculty_id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing fields' });
  }
  const [result]: any = await db.execute(
    'INSERT INTO Majors (major_name, faculty_id) VALUES (?, ?)',
    [body.major_name, body.faculty_id]
  );
  return { success: true, message: 'Major created', id: result.insertId };
});
