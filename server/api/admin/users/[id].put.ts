import db from "../../../utils/db";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID is required" });

  const body = await readBody(event);
  if (!body || !body.username || !body.role) {
    throw createError({ statusCode: 400, statusMessage: 'Missing fields' });
  }

  const facultyId = body.faculty_id ? Number(body.faculty_id) : null;

  try {
    if (body.password) {
      await db.execute(
        'UPDATE Users SET username = ?, password_hash = ?, role = ?, faculty_id = ? WHERE user_id = ?',
        [body.username, body.password, body.role, facultyId, id]
      );
    } else {
      await db.execute(
        'UPDATE Users SET username = ?, role = ?, faculty_id = ? WHERE user_id = ?',
        [body.username, body.role, facultyId, id]
      );
    }
    return { success: true, message: 'User updated' };
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') throw createError({ statusCode: 400, statusMessage: 'Username already exists' });
    throw e;
  }
});