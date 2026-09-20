import db from '../../utils/db';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Activity ID is required' });

  try {
    const [result]: any = await db.execute('DELETE FROM Activities WHERE activity_id = ?', [id]);
    if (result.affectedRows === 0) throw createError({ statusCode: 404, statusMessage: 'Activity not found' });
    return { success: true, message: 'Activity deleted' };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error deleting activity',
      data: error.message
    });
  }
});
