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
