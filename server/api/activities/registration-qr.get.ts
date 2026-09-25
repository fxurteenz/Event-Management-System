import db from "../../utils/db";
import { renderSVG } from "uqr";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const activityId = query.activity_id ? Number(query.activity_id) : null;
    const studentId = ((query.student_id as string) || "").trim();

    if (!activityId || !studentId) {
        throw createError({
            statusCode: 400,
            statusMessage:
                "กรุณาระบุรหัสกิจกรรม (activity_id) และรหัสนักศึกษา (student_id)",
        });
    }

    try {
        // 1. Fetch Activity Info
        const [actRows]: any = await db.execute(
            `SELECT activity_id, title, activity_hours, start_time, end_time 
       FROM Activities WHERE activity_id = ?`,
            [activityId],
        );

        if (actRows.length === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: "ไม่พบข้อมูลกิจกรรมนี้ในระบบ",
            });
        }

        const activity = actRows[0];

        // 2. Fetch Registration Record
        const [regRows]: any = await db.execute(
            `SELECT 
         ar.registration_id,
         ar.activity_id,
         ar.student_id,
         ar.status,
         ar.check_in_time,
         ar.registered_at,
         s.first_name,
         s.last_name,
         f.faculty_name,
         m.major_name
       FROM Activity_Registrations ar
       JOIN Students s ON ar.student_id = s.student_id
       LEFT JOIN Faculties f ON s.faculty_id = f.faculty_id
       LEFT JOIN Majors m ON s.major_id = m.major_id
       WHERE ar.activity_id = ? AND ar.student_id = ?`,
            [activityId, studentId],
        );

        if (regRows.length === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: "ไม่พบรายการลงทะเบียนของนักศึกษาในกิจกรรมนี้",
            });
        }

        const reg = regRows[0];
        const status = (reg.status || "").toLowerCase();

        // 3. Strict Check: Registration MUST be 'confirmed' to generate QR Code!
        if (status !== "confirmed") {
            throw createError({
                statusCode: 403,
                statusMessage: `ไม่สามารถแสดง QR Code ได้ เนื่องจากสถานะการลงทะเบียนของคุณยังไม่ได้รับการยืนยัน (สถานะปัจจุบัน: ${reg.status})`,
            });
        }

        // 4. Generate Activity-Specific QR Code payload
        // Structured JSON payload tying both Activity ID and Student ID
        const qrPayload = JSON.stringify({
            type: "EVENT_CHECKIN",
            act_id: activityId,
            stu_id: studentId,
            reg_id: reg.registration_id,
            gen_at: Date.now(),
        });

        const svg = renderSVG(qrPayload, {
            ecc: "M",
            border: 2,
        });

        return {
            success: true,
            data: {
                registration_id: reg.registration_id,
                activity_id: activity.activity_id,
                activity_title: activity.title,
                activity_hours: activity.activity_hours,
                student_id: reg.student_id,
                student_name: `${reg.first_name} ${reg.last_name}`,
                faculty_name: reg.faculty_name,
                major_name: reg.major_name,
                status: reg.status,
                check_in_time: reg.check_in_time,
                qr_payload: qrPayload,
                qr_svg: svg,
            },
        };
    } catch (error: any) {
        if (error.statusCode) throw error;
        throw createError({
            statusCode: 500,
            statusMessage: "เกิดข้อผิดพลาดในการสร้าง QR Code ประจำกิจกรรม",
            data: error.message,
        });
    }
});
