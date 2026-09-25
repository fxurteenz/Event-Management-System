import db from "../../utils/db";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    if (!body) {
        throw createError({
            statusCode: 400,
            statusMessage: "ไม่พบข้อมูลที่ส่งเข้ามา",
        });
    }

    const activityId = body.activity_id ? Number(body.activity_id) : null;
    const rawData = ((body.qr_data || body.student_id || "") as string).trim();
    const operatorRole = ((body.operator_role as string) || "").toLowerCase();
    const operatorFacultyId = body.operator_faculty_id
        ? Number(body.operator_faculty_id)
        : null;

    if (!activityId || !rawData) {
        throw createError({
            statusCode: 400,
            statusMessage:
                "กรุณาระบุรหัสกิจกรรมและข้อมูล QR Code หรือรหัสนักศึกษา",
        });
    }

    // Parse QR Data (Check for JSON payload from Student Activity Ticket)
    let studentId = rawData;
    let scannedActivityId: number | null = null;

    if (rawData.startsWith("{") && rawData.endsWith("}")) {
        try {
            const parsed = JSON.parse(rawData);
            if (parsed.stu_id) {
                studentId = String(parsed.stu_id).trim();
            } else if (parsed.student_id) {
                studentId = String(parsed.student_id).trim();
            }
            if (parsed.act_id) {
                scannedActivityId = Number(parsed.act_id);
            } else if (parsed.activity_id) {
                scannedActivityId = Number(parsed.activity_id);
            }
        } catch {
            // Not valid JSON, keep as raw string
        }
    } else if (rawData.includes("-")) {
        // E.g. ACT-1-STU-680112418001
        const match = rawData.match(/ACT-(\d+)-STU-([a-zA-Z0-9]+)/i);
        if (match) {
            scannedActivityId = Number(match[1]);
            studentId = match[2];
        }
    }

    // Cross-activity verification: If QR specifically mentions an activity, it MUST match this activity
    if (scannedActivityId && scannedActivityId !== activityId) {
        throw createError({
            statusCode: 400,
            statusMessage: `QR Code นี้เป็นของกิจกรรมอื่น (รหัสกิจกรรม #${scannedActivityId}) ไม่สามารถนำมาใช้เช็คชื่อในกิจกรรมนี้ได้`,
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Fetch Activity Details
        const [actRows]: any = await connection.execute(
            "SELECT activity_id, title, activity_hours FROM Activities WHERE activity_id = ?",
            [activityId],
        );

        if (actRows.length === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: "ไม่พบกิจกรรมที่ต้องการเช็คชื่อในระบบ",
            });
        }

        const activity = actRows[0];
        const hoursToAdd = Number(activity.activity_hours) || 0;

        // 2. Fetch Student Details
        const [stuRows]: any = await connection.execute(
            `SELECT 
         s.student_id, 
         s.first_name, 
         s.last_name, 
         s.faculty_id, 
         s.major_id, 
         s.accumulated_hours,
         f.faculty_name,
         m.major_name
       FROM Students s
       LEFT JOIN Faculties f ON s.faculty_id = f.faculty_id
       LEFT JOIN Majors m ON s.major_id = m.major_id
       WHERE s.student_id = ?`,
            [studentId],
        );

        if (stuRows.length === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: `ไม่พบข้อมูลนักศึกษารหัส "${studentId}" ในฐานข้อมูล`,
            });
        }

        const student = stuRows[0];

        // 3. Faculty scope check for Club President (if applicable)
        if (operatorRole === "club_president" && operatorFacultyId) {
            const studentFacultyId = Number(student.faculty_id);
            if (studentFacultyId !== operatorFacultyId) {
                throw createError({
                    statusCode: 403,
                    statusMessage: `ประธานสโมสรไม่มีสิทธิ์เช็คชื่อให้นักศึกษานอกสังกัดคณะ (${student.faculty_name || "ไม่ระบุคณะ"})`,
                });
            }
        }

        // 4. Fetch Registration Record (Locked for Update)
        const [regRows]: any = await connection.execute(
            `SELECT registration_id, activity_id, student_id, status, check_in_time 
       FROM Activity_Registrations 
       WHERE activity_id = ? AND student_id = ? 
       FOR UPDATE`,
            [activityId, studentId],
        );

        // Rule A: Student MUST be registered for this activity
        if (regRows.length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: `นักศึกษารหัส ${studentId} (${student.first_name} ${student.last_name}) ยังไม่ได้ลงทะเบียนเข้าร่วมกิจกรรมนี้ จึงไม่สามารถเช็คชื่อได้`,
            });
        }

        const registration = regRows[0];
        const regStatus = (registration.status || "").toLowerCase();

        // Rule B: Registration status MUST be 'confirmed'
        if (regStatus !== "confirmed") {
            throw createError({
                statusCode: 400,
                statusMessage: `นักศึกษารหัส ${studentId} (${student.first_name} ${student.last_name}) ลงทะเบียนแล้ว แต่ยังไม่ได้รับการยืนยันสิทธิ์เข้าร่วม (สถานะ: ${registration.status}) กรุณาให้สโมสรยืนยันสิทธิ์ก่อนเช็คชื่อ`,
            });
        }

        // Rule C: Student MUST NOT have already checked in
        if (registration.check_in_time) {
            const checkedDate = new Date(registration.check_in_time);
            const timeStr = checkedDate.toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
            });
            const dateStr = checkedDate.toLocaleDateString("th-TH", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });

            throw createError({
                statusCode: 409,
                statusMessage: `นักศึกษารหัส ${studentId} (${student.first_name} ${student.last_name}) ได้เช็คชื่อเข้าร่วมกิจกรรมไปแล้วเมื่อ ${dateStr} เวลา ${timeStr} น. (ไม่สามารถเช็คชื่อซ้ำได้)`,
            });
        }

        // 5. Record Check-in Timestamp (Status remains 'Confirmed')
        await connection.execute(
            `UPDATE Activity_Registrations 
       SET check_in_time = CURRENT_TIMESTAMP 
       WHERE registration_id = ?`,
            [registration.registration_id],
        );

        // 6. Accumulate Student Activity Hours
        await connection.execute(
            `UPDATE Students 
       SET accumulated_hours = accumulated_hours + ? 
       WHERE student_id = ?`,
            [hoursToAdd, studentId],
        );

        await connection.commit();

        const previousHours = Number(student.accumulated_hours) || 0;
        const newHours = Number((previousHours + hoursToAdd).toFixed(2));

        return {
            success: true,
            message: `เช็คชื่อสำเร็จ: ${student.first_name} ${student.last_name}`,
            data: {
                registration_id: registration.registration_id,
                activity_id: activityId,
                activity_title: activity.title,
                student_id: student.student_id,
                first_name: student.first_name,
                last_name: student.last_name,
                faculty_name: student.faculty_name,
                major_name: student.major_name,
                added_hours: hoursToAdd,
                previous_hours: previousHours,
                new_accumulated_hours: newHours,
                check_in_time: new Date().toISOString(),
            },
        };
    } catch (error: any) {
        await connection.rollback();
        if (error.statusCode) throw error;
        throw createError({
            statusCode: 500,
            statusMessage: "เกิดข้อผิดพลาดในการบันทึกการเช็คชื่อ",
            data: error.message,
        });
    } finally {
        connection.release();
    }
});
