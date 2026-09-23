import db from "../../utils/db";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const studentId = query.student_id as string;

    if (!studentId) {
        return { success: true, data: [] };
    }

    try {
        const [rows]: any = await db.execute(
            `SELECT 
        ar.registration_id,
        ar.activity_id,
        ar.status,
        ar.registered_at,
        ar.check_in_time,
        ar.check_out_time,
        a.title,
        a.activity_hours,
        a.start_time,
        a.end_time,
        c.category_name
       FROM Activity_Registrations ar
       JOIN Activities a ON ar.activity_id = a.activity_id
       LEFT JOIN Activity_Categories c ON a.category_id = c.category_id
       WHERE ar.student_id = ? AND LOWER(ar.status) != 'cancelled'
       ORDER BY ar.registered_at DESC`,
            [studentId],
        );

        return {
            success: true,
            data: rows,
        };
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: "Error fetching my registrations",
            data: error.message,
        });
    }
});
