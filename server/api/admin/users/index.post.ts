import db from '../../../utils/db';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!body || !body.username || !body.password || !body.role) {
    throw createError({ statusCode: 400, statusMessage: 'Missing fields' });
  }

  try {
    const [result]: any = await db.execute(
      'INSERT INTO Users (username, password_hash, role) VALUES (?, ?, ?)',
      [body.username, body.password, body.role]
    );
    return { success: true, message: 'User created', id: result.insertId };
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') throw createError({ statusCode: 400, statusMessage: 'Username already exists' });
    throw e;
  }
});
