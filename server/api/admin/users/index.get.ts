import db from "../../../utils/db";

export default defineEventHandler(async (event) => {
  try {
    const query = `
      SELECT user_id, username, role
      FROM Users
      ORDER BY user_id DESC
    `;
    const [rows]: any = await db.execute(query);
    return { success: true, data: rows };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: "Error fetching users",
      data: error.message,
    });
  }
});