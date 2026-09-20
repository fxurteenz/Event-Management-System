import db from "../../../utils/db";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID is required" });

  const body = await readBody(event);
  if (!body || !body.username || !body.role) {
    throw createError({ statusCode: 400, statusMessage: 'Missing fields' });
  }

  try {
    if (body.password) {
      await db.execute(
        'UPDATE Users SET username = ?, password_hash = ?, role = ? WHERE user_id = ?',
        [body.username, body.password, body.role, id]
      );
    } else {
      await db.execute(
        'UPDATE Users SET username = ?, role = ? WHERE user_id = ?',
        [body.username, body.role, id]
      );
    }
    return { success: true, message: 'User updated' };
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') throw createError({ statusCode: 400, statusMessage: 'Username already exists' });
    throw e;
  }
});