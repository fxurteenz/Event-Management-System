import db from "../../../utils/db";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    if (
        !body ||
        !body.activity_id ||
        !Array.isArray(body.student_ids) ||
        body.student_ids.length === 0
    ) {
        throw createError({
            statusCode: 400,
            statusMessage:
                "กรุณาระบุรหัสกิจกรรมและรายชื่อนักศึกษาที่ต้องการเพิ่ม",
        });
    }

    const { activity_id, student_ids } = body;
    const role = ((body.role as string) || "").toLowerCase();
    const presidentFacultyId = body.faculty_id ? Number(body.faculty_id) : null;

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Fetch Activity Info
        const [actRows]: any = await connection.execute(
            `SELECT a.activity_id, a.title, a.max_participants, a.category_id, c.category_name
             FROM Activities a
             LEFT JOIN Activity_Categories c ON a.category_id = c.category_id
             WHERE a.activity_id = ?`,
            [activity_id],
        );

        if (actRows.length === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: "ไม่พบกิจกรรมที่ระบุ",
            });
        }

        const activity = actRows[0];
        const isMandatory =
            Number(activity.category_id) === 1 ||
            (activity.category_name || "").includes("บังคับ");
        const registrationStatus = isMandatory ? "Confirmed" : "Registered";

        // 2. Fetch Target Constraints
        const [targetFacRows]: any = await connection.execute(
            "SELECT faculty_id FROM Activity_Target_Faculties WHERE activity_id = ?",
            [activity_id],
        );
        const targetFacultyIds = targetFacRows.map((r: any) =>
            Number(r.faculty_id),
        );

        const [targetMajRows]: any = await connection.execute(
            "SELECT major_id FROM Activity_Target_Majors WHERE activity_id = ?",
            [activity_id],
        );
        const targetMajorIds = targetMajRows.map((r: any) =>
            Number(r.major_id),
        );

        // 3. For Club President, verify if president's faculty is eligible for this activity
        if (role === "club_president") {
            if (!presidentFacultyId) {
                throw createError({
                    statusCode: 403,
                    statusMessage:
                        "ไม่พบข้อมูลสังกัดคณะของประธานสโมสร ไม่สามารถดำเนินการได้",
                });
            }

            if (targetMajorIds.length > 0) {
                const [checkMajRows]: any = await connection.execute(
                    `SELECT major_id FROM Majors 
                     WHERE major_id IN (${targetMajorIds.map(() => "?").join(",")}) 
                     AND faculty_id = ?`,
                    [...targetMajorIds, presidentFacultyId],
                );
                if (checkMajRows.length === 0) {
                    throw createError({
                        statusCode: 403,
                        statusMessage:
                            "กิจกรรมนี้ไม่เปิดรับลงทะเบียนจากคณะของท่าน",
                    });
                }
            } else if (targetFacultyIds.length > 0) {
                if (!targetFacultyIds.includes(presidentFacultyId)) {
                    throw createError({
                        statusCode: 403,
                        statusMessage:
                            "กิจกรรมนี้ไม่เปิดรับลงทะเบียนจากคณะของท่าน",
                    });
                }
            }
        }

        // 4. Fetch Students by IDs to validate eligibility
        const placeholders = student_ids.map(() => "?").join(",");
        const [studentRows]: any = await connection.execute(
            `SELECT 
                s.student_id, 
                s.first_name, 
                s.last_name, 
                COALESCE(s.faculty_id, m.faculty_id) AS faculty_id,
                s.major_id
             FROM Students s
             LEFT JOIN Majors m ON s.major_id = m.major_id
             WHERE s.student_id IN (${placeholders})`,
            student_ids,
        );

        if (studentRows.length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: "ไม่พบข้อมูลนักศึกษาที่เลือกในระบบ",
            });
        }

        // Verify each student against permissions & target constraints
        for (const s of studentRows) {
            const studentFacultyId = Number(s.faculty_id);
            const studentMajorId = Number(s.major_id);

            if (role === "club_president") {
                // Club President can ONLY add students from their own faculty, but can choose from all majors in that faculty
                if (studentFacultyId !== presidentFacultyId) {
                    throw createError({
                        statusCode: 403,
                        statusMessage: `ไม่อนุญาตให้เพิ่มนักศึกษานอกสังกัดคณะ (${s.student_id} ${s.first_name} ${s.last_name})`,
                    });
                }
            } else {
                // For Org President and Admin: Must match Activity Targets
                if (targetMajorIds.length > 0) {
                    if (!targetMajorIds.includes(studentMajorId)) {
                        throw createError({
                            statusCode: 400,
                            statusMessage: `นักศึกษารหัส ${s.student_id} (${s.first_name}) ไม่อยู่ในสาขาวิชาที่กิจกรรมนี้เปิดรับ`,
                        });
                    }
                } else if (targetFacultyIds.length > 0) {
                    if (!targetFacultyIds.includes(studentFacultyId)) {
                        throw createError({
                            statusCode: 400,
                            statusMessage: `นักศึกษารหัส ${s.student_id} (${s.first_name}) ไม่อยู่ในคณะที่กิจกรรมนี้เปิดรับ`,
                        });
                    }
                }
            }
        }

        // 5. Capacity Check (if max_participants is configured)
        if (activity.max_participants && activity.max_participants > 0) {
            const [countRows]: any = await connection.execute(
                `SELECT COUNT(*) as active_count 
                 FROM Activity_Registrations 
                 WHERE activity_id = ? AND LOWER(status) != 'cancelled'`,
                [activity_id],
            );
            const currentActiveCount = Number(countRows[0]?.active_count || 0);

            const [alreadyRegRows]: any = await connection.execute(
                `SELECT student_id 
                 FROM Activity_Registrations 
                 WHERE activity_id = ? AND student_id IN (${placeholders}) AND LOWER(status) != 'cancelled'`,
                [activity_id, ...student_ids],
            );
            const alreadyRegSet = new Set(
                alreadyRegRows.map((r: any) => String(r.student_id)),
            );

            const newRegistrationsCount = student_ids.filter(
                (id: string) => !alreadyRegSet.has(String(id)),
            ).length;

            if (
                currentActiveCount + newRegistrationsCount >
                activity.max_participants
            ) {
                const remaining = Math.max(
                    0,
                    activity.max_participants - currentActiveCount,
                );
                throw createError({
                    statusCode: 400,
                    statusMessage: `จำนวนนักศึกษาที่เลือก (${newRegistrationsCount} คนใหม่) เกินกว่าจำนวนที่นั่งที่เปิดรับ (เหลือ ${remaining} ที่นั่ง จากทั้งหมด ${activity.max_participants} ที่นั่ง)`,
                });
            }
        }

        // 6. Bulk Insert / Update Registrations
        for (const sId of student_ids) {
            await connection.execute(
                `INSERT INTO Activity_Registrations (activity_id, student_id, status, registered_at)
                 VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                 ON DUPLICATE KEY UPDATE status = VALUES(status), registered_at = CURRENT_TIMESTAMP`,
                [activity_id, sId, registrationStatus],
            );
        }

        await connection.commit();

        return {
            success: true,
            message: `เพิ่มรายชื่อนักศึกษาเข้าร่วมกิจกรรมเรียบร้อยแล้ว (${student_ids.length} คน)`,
            count: student_ids.length,
        };
    } catch (error: any) {
        await connection.rollback();
        if (error.statusCode) throw error;
        throw createError({
            statusCode: 500,
            statusMessage: "เกิดข้อผิดพลาดในการเพิ่มรายชื่อนักศึกษา",
            data: error.message,
        });
    } finally {
        connection.release();
    }
});
