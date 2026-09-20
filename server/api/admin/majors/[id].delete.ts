import db from '../../../utils/db';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' });

  const [result]: any = await db.execute('DELETE FROM Majors WHERE major_id = ?', [id]);
  if (result.affectedRows === 0) throw createError({ statusCode: 404, statusMessage: 'Not found' });
  return { success: true, message: 'Major deleted' };
});
