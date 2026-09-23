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

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Fetch Student Info (with faculty and major)
        const [studentRows]: any = await connection.execute(
            `SELECT s.student_id, s.first_name, s.last_name, s.faculty_id, s.major_id, f.faculty_name, m.major_name
       FROM Students s
       LEFT JOIN Faculties f ON s.faculty_id = f.faculty_id
       LEFT JOIN Majors m ON s.major_id = m.major_id
       WHERE s.student_id = ?`,
            [student_id],
        );

        if (studentRows.length === 0) {
            throw createError({
                statusCode: 404,
                statusMessage:
                    "ไม่พบข้อมูลประวัตินักศึกษาในระบบ กรุณาติดต่อผู้ดูแลระบบ",
            });
        }

        const student = studentRows[0];

        // 2. Fetch Activity Info
        const [activityRows]: any = await connection.execute(
            "SELECT activity_id, title, max_participants FROM Activities WHERE activity_id = ?",
            [activity_id],
        );

        if (activityRows.length === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: "ไม่พบกิจกรรมที่ต้องการลงทะเบียน",
            });
        }

        const activity = activityRows[0];

        // 3. Check Existing Registration
        const [existingReg]: any = await connection.execute(
            "SELECT registration_id, status FROM Activity_Registrations WHERE activity_id = ? AND student_id = ?",
            [activity_id, student_id],
        );

        if (
            existingReg.length > 0 &&
            (existingReg[0].status || "").toLowerCase() !== "cancelled"
        ) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "ท่านได้ลงทะเบียนเข้าร่วมกิจกรรมนี้เรียบร้อยแล้ว",
            });
        }

        // 4. Check Remaining Seats / Capacity
        if (activity.max_participants && activity.max_participants > 0) {
            const [countRows]: any = await connection.execute(
                `SELECT COUNT(*) as active_count 
         FROM Activity_Registrations 
         WHERE activity_id = ? AND LOWER(status) != 'cancelled'`,
                [activity_id],
            );
            const activeCount = countRows[0]?.active_count || 0;

            if (activeCount >= activity.max_participants) {
                throw createError({
                    statusCode: 400,
                    statusMessage: `ขออภัย ที่นั่งสำหรับกิจกรรมนี้เต็มแล้ว (เปิดรับสมัคร ${activity.max_participants} ที่นั่ง)`,
                });
            }
        }

        // 5. Check Faculty and Major Eligibility
        const [targetFacRows]: any = await connection.execute(
            "SELECT faculty_id FROM Activity_Target_Faculties WHERE activity_id = ?",
            [activity_id],
        );
        const targetFaculties = targetFacRows.map((r: any) =>
            Number(r.faculty_id),
        );

        const [targetMajRows]: any = await connection.execute(
            "SELECT major_id FROM Activity_Target_Majors WHERE activity_id = ?",
            [activity_id],
        );
        const targetMajors = targetMajRows.map((r: any) => Number(r.major_id));

        // If targets are specified, verify student
        if (targetFaculties.length > 0 || targetMajors.length > 0) {
            let isAllowed = false;

            // If specific majors are designated, student must be in one of those majors
            if (targetMajors.length > 0) {
                isAllowed = targetMajors.includes(Number(student.major_id));
            } else if (targetFaculties.length > 0) {
                // If only faculties are designated, student must be in one of those faculties
                isAllowed = targetFaculties.includes(
                    Number(student.faculty_id),
                );
            }

            if (!isAllowed) {
                throw createError({
                    statusCode: 403,
                    statusMessage:
                        "ท่านไม่มีสิทธิ์ลงทะเบียนกิจกรรมนี้ เนื่องจากจำกัดเฉพาะคณะหรือสาขาวิชาที่กำหนด",
                });
            }
        }

        // 6. Save Registration
        await connection.execute(
            `INSERT INTO Activity_Registrations (activity_id, student_id, status, registered_at)
       VALUES (?, ?, 'Registered', CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE status = 'Registered', registered_at = CURRENT_TIMESTAMP`,
            [activity_id, student_id],
        );

        await connection.commit();

        return {
            success: true,
            message: `ลงทะเบียนเข้าร่วมกิจกรรม "${activity.title}" เรียบร้อยแล้ว`,
        };
    } catch (error: any) {
        await connection.rollback();
        if (error.statusCode) throw error;
        throw createError({
            statusCode: 500,
            statusMessage: "เกิดข้อผิดพลาดในการลงทะเบียน",
            data: error.message,
        });
    } finally {
        connection.release();
    }
});
