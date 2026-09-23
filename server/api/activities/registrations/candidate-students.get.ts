import db from "../../../utils/db";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const activityId = Number(query.activity_id);
    const role = ((query.role as string) || "").toLowerCase();
    const presidentFacultyId = query.faculty_id
        ? Number(query.faculty_id)
        : null;

    if (!activityId) {
        throw createError({
            statusCode: 400,
            statusMessage: "Activity ID is required",
        });
    }

    try {
        // 1. Fetch Activity Info
        const [activityRows]: any = await db.execute(
            "SELECT activity_id, title, max_participants, category_id FROM Activities WHERE activity_id = ?",
            [activityId]
        );

        if (activityRows.length === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: "ไม่พบกิจกรรมที่ระบุ",
            });
        }

        const activity = activityRows[0];

        // 2. Fetch target faculties & majors for this activity
        const [targetFacRows]: any = await db.execute(
            "SELECT faculty_id FROM Activity_Target_Faculties WHERE activity_id = ?",
            [activityId]
        );
        const targetFacultyIds = targetFacRows.map((r: any) =>
            Number(r.faculty_id)
        );

        const [targetMajRows]: any = await db.execute(
            "SELECT major_id FROM Activity_Target_Majors WHERE activity_id = ?",
            [activityId]
        );
        const targetMajorIds = targetMajRows.map((r: any) =>
            Number(r.major_id)
        );

        // 3. For Club President, verify if the president's faculty is eligible for this activity
        if (role === "club_president") {
            if (!presidentFacultyId) {
                throw createError({
                    statusCode: 403,
                    statusMessage:
                        "ไม่พบข้อมูลสังกัดคณะของประธานสโมสร ไม่สามารถเข้าถึงข้อมูลได้",
                });
            }

            // Check eligibility:
            // If target majors are designated, at least one major must belong to the president's faculty
            if (targetMajorIds.length > 0) {
                const [checkMajRows]: any = await db.execute(
                    `SELECT major_id FROM Majors 
                     WHERE major_id IN (${targetMajorIds.map(() => "?").join(",")}) 
                     AND faculty_id = ?`,
                    [...targetMajorIds, presidentFacultyId]
                );
                if (checkMajRows.length === 0) {
                    throw createError({
                        statusCode: 403,
                        statusMessage:
                            "กิจกรรมนี้ไม่เปิดรับลงทะเบียนจากคณะของท่าน",
                    });
                }
            } else if (targetFacultyIds.length > 0) {
                // If only faculties are designated, president's faculty must be included
                if (!targetFacultyIds.includes(presidentFacultyId)) {
                    throw createError({
                        statusCode: 403,
                        statusMessage:
                            "กิจกรรมนี้ไม่เปิดรับลงทะเบียนจากคณะของท่าน",
                    });
                }
            }
            // If neither is designated, it's open to all faculties
        }

        // 4. Fetch students who already registered (active)
        const [regRows]: any = await db.execute(
            `SELECT student_id, status 
             FROM Activity_Registrations 
             WHERE activity_id = ? AND LOWER(status) != 'cancelled'`,
            [activityId]
        );
        const registeredStudentIds = new Set(
            regRows.map((r: any) => String(r.student_id))
        );

        // 5. Query candidate students
        let sql = `
          SELECT 
            s.student_id,
            s.first_name,
            s.last_name,
            s.accumulated_hours,
            COALESCE(s.faculty_id, m.faculty_id) AS faculty_id,
            COALESCE(f.faculty_name, f_maj.faculty_name) AS faculty_name,
            s.major_id,
            m.major_name
          FROM Students s
          LEFT JOIN Faculties f ON s.faculty_id = f.faculty_id
          LEFT JOIN Majors m ON s.major_id = m.major_id
          LEFT JOIN Faculties f_maj ON m.faculty_id = f_maj.faculty_id
          WHERE 1=1
        `;

        const params: any[] = [];

        // Apply restrictions based on role
        if (role === "club_president") {
            // "ประธานสโมสรเลือกได้จากสาขาทั้งหมดของคณะที่สังกัดเลย"
            sql += " AND (s.faculty_id = ? OR m.faculty_id = ?)";
            params.push(presidentFacultyId, presidentFacultyId);
        } else {
            // For Org President & Admin: Apply Activity Target Major or Faculty restrictions
            if (targetMajorIds.length > 0) {
                sql += ` AND s.major_id IN (${targetMajorIds.map(() => "?").join(",")})`;
                params.push(...targetMajorIds);
            } else if (targetFacultyIds.length > 0) {
                sql += ` AND (s.faculty_id IN (${targetFacultyIds.map(() => "?").join(",")}) OR m.faculty_id IN (${targetFacultyIds.map(() => "?").join(",")}))`;
                params.push(...targetFacultyIds, ...targetFacultyIds);
            }
        }

        sql += " ORDER BY s.student_id ASC";

        const [students]: any = await db.execute(sql, params);

        // 6. Map students with registration status
        const result = students.map((s: any) => ({
            ...s,
            is_already_registered: registeredStudentIds.has(
                String(s.student_id)
            ),
        }));

        return {
            success: true,
            data: result,
            total_candidates: result.length,
            already_registered_count: registeredStudentIds.size,
            max_participants: activity.max_participants,
            available_seats: activity.max_participants
                ? Math.max(
                      0,
                      activity.max_participants - registeredStudentIds.size
                  )
                : null,
        };
    } catch (error: any) {
        if (error.statusCode) throw error;
        throw createError({
            statusCode: 500,
            statusMessage: "Error fetching candidate students",
            data: error.message,
        });
    }
});

