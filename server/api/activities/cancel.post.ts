import db from "../../utils/db";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    if (!body || !body.activity_id || !body.student_id) {
        throw createError({
            statusCode: 400,
            statusMessage: "กรุณาระบุรหัสกิจกรรมและรหัสนักศึกษา",
        });
    }

    const { activity_id, student_id } = body;

    try {
        // 1. Check if activity is mandatory ("กิจกรรมบังคับ")
        const [actRows]: any = await db.execute(
            `SELECT a.activity_id, a.title, a.category_id, c.category_name 
             FROM Activities a 
             LEFT JOIN Activity_Categories c ON a.category_id = c.category_id 
             WHERE a.activity_id = ?`,
            [activity_id]
        );

        if (actRows.length === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: "ไม่พบกิจกรรมที่ระบุ",
            });
        }

        const activity = actRows[0];
        const isMandatory = Number(activity.category_id) === 1 || 
                            (activity.category_name || '').includes('บังคับ');

        if (isMandatory) {
            throw createError({
                statusCode: 400,
                statusMessage: "ไม่สามารถยกเลิกการลงทะเบียนได้ เนื่องจากเป็นกิจกรรมบังคับ",
            });
        }

        // 2. Perform cancellation
        const [result]: any = await db.execute(
            `UPDATE Activity_Registrations 
       SET status = 'Cancelled' 
       WHERE activity_id = ? AND student_id = ?`,
            [activity_id, student_id],
        );

        if (result.affectedRows === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: "ไม่พบรายการลงทะเบียนของท่านในกิจกรรมนี้",
            });
        }

        return {
            success: true,
            message: "ยกเลิกการลงทะเบียนเรียบร้อยแล้ว",
        };
    } catch (error: any) {
        if (error.statusCode) throw error;
        throw createError({
            statusCode: 500,
            statusMessage: "เกิดข้อผิดพลาดในการยกเลิกการลงทะเบียน",
            data: error.message,
        });
    }
});
