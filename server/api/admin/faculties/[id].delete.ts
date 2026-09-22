import db from '../../../utils/db';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Faculty ID is required' });
  }

  try {
    const [result]: any = await db.execute('DELETE FROM Faculties WHERE faculty_id = ?', [id]);
    
    if (result.affectedRows === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Faculty not found' });
    }

    return {
      success: true,
      message: 'Faculty deleted successfully'
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error deleting faculty',
      data: error.message
    });
  }
});
