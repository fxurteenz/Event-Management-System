import db from "../../utils/db";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const search = ((query.search as string) || "").trim().toLowerCase();
    const role = ((query.role as string) || "").toLowerCase();
    const userFacultyId = query.user_faculty_id
        ? Number(query.user_faculty_id)
        : null;
    const requestedFacultyId = query.faculty_id
        ? Number(query.faculty_id)
        : null;
    const majorId = query.major_id ? String(query.major_id) : "";
    const statusFilter = ((query.status as string) || "all").toLowerCase(); // 'all', 'passed', 'pending'

    // Determine effective faculty scope based on role
    let effectiveFacultyId: number | null = null;
    if (role === "club_president") {
        if (!userFacultyId) {
            throw createError({
                statusCode: 403,
                statusMessage:
                    "ไม่พบข้อมูลสังกัดคณะของประธานสโมสร ไม่สามารถเข้าถึงข้อมูลได้",
            });
        }
        effectiveFacultyId = userFacultyId;
    } else {
        effectiveFacultyId = requestedFacultyId;
    }

    try {
        // 1. Fetch Students
        let studentSql = `
            SELECT 
                s.student_id,
                s.first_name,
                s.last_name,
                s.faculty_id,
                f.faculty_name,
                s.major_id,
                m.major_name,
                COALESCE(s.accumulated_hours, 0) AS recorded_accumulated_hours
            FROM Students s
            LEFT JOIN Faculties f ON s.faculty_id = f.faculty_id
            LEFT JOIN Majors m ON s.major_id = m.major_id
            WHERE 1=1
        `;
        const studentParams: any[] = [];

        if (effectiveFacultyId) {
            studentSql += ` AND s.faculty_id = ?`;
            studentParams.push(effectiveFacultyId);
        }

        if (majorId) {
            studentSql += ` AND s.major_id = ?`;
            studentParams.push(Number(majorId));
        }

        studentSql += ` ORDER BY s.student_id ASC`;

        const [studentRows]: any = await db.execute(studentSql, studentParams);

        if (studentRows.length === 0) {
            return {
                success: true,
                summary: {
                    total_students: 0,
                    passed_count: 0,
                    pending_count: 0,
                    pass_rate: 0,
                    total_volunteer_hours: 0,
                    total_activity_hours: 0,
                    avg_hours: 0,
                },
                students: [],
            };
        }

        // 2. Query checked-in registrations with target scopes and categories
        const [regRows]: any = await db.execute(`
            SELECT 
                ar.student_id,
                ar.activity_id,
                a.title AS activity_title,
                COALESCE(a.activity_hours, 0) AS activity_hours,
                a.category_id,
                c.category_name,
                ar.check_in_time,
                EXISTS (
                    SELECT 1 FROM Activity_Target_Faculties atf
                    WHERE atf.activity_id = a.activity_id AND atf.faculty_id = s.faculty_id
                ) AS is_target_faculty,
                EXISTS (
                    SELECT 1 FROM Activity_Target_Majors atm
                    WHERE atm.activity_id = a.activity_id AND atm.major_id = s.major_id
                ) AS is_target_major
            FROM Activity_Registrations ar
            JOIN Activities a ON ar.activity_id = a.activity_id
            JOIN Students s ON ar.student_id = s.student_id
            LEFT JOIN Activity_Categories c ON a.category_id = c.category_id
            WHERE ar.check_in_time IS NOT NULL AND LOWER(ar.status) != 'cancelled'
        `);

        // Group activity registrations by student_id
        const regMap: Record<string, any[]> = {};
        for (const row of regRows) {
            if (!regMap[row.student_id]) {
                regMap[row.student_id] = [];
            }
            regMap[row.student_id].push(row);
        }

        // 3. Calculate Hours and Criteria for each Student
        let processedStudents = studentRows.map((stu: any) => {
            const regs = regMap[stu.student_id] || [];

            let calculatedTotalHours = 0;
            let facultyMajorHours = 0;
            let volunteerHours = 0;

            for (const r of regs) {
                const hours = Number(r.activity_hours) || 0;
                calculatedTotalHours += hours;

                // Specific Faculty/Major activity check
                if (
                    Number(r.is_target_faculty) === 1 ||
                    Number(r.is_target_major) === 1
                ) {
                    facultyMajorHours += hours;
                }

                // Volunteer / Loan activity check
                const catName = (r.category_name || "").toLowerCase();
                if (
                    catName.includes("บำเพ็ญ") ||
                    catName.includes("ประโยชน์") ||
                    catName.includes("จิตอาสา")
                ) {
                    volunteerHours += hours;
                }
            }

            // In case student has accumulated_hours from direct import/legacy
            const totalHours = Math.max(
                Number(calculatedTotalHours.toFixed(2)),
                Number(Number(stu.recorded_accumulated_hours).toFixed(2)),
            );

            const facHours = Number(facultyMajorHours.toFixed(2));
            const volHours = Number(volunteerHours.toFixed(2));

            // Criteria:
            // 1. Faculty/Major Specific >= 8 hrs
            // 2. Total Hours >= 48 hrs
            const isFacultyPassed = facHours >= 8.0;
            const isTotalPassed = totalHours >= 48.0;
            const isGradEligible = isFacultyPassed && isTotalPassed;

            return {
                student_id: stu.student_id,
                first_name: stu.first_name,
                last_name: stu.last_name,
                full_name:
                    `${stu.first_name || ""} ${stu.last_name || ""}`.trim(),
                faculty_id: stu.faculty_id,
                faculty_name: stu.faculty_name || "-",
                major_id: stu.major_id,
                major_name: stu.major_name || "-",
                total_hours: totalHours,
                faculty_major_hours: facHours,
                volunteer_hours: volHours,
                is_faculty_passed: isFacultyPassed,
                is_total_passed: isTotalPassed,
                is_grad_eligible: isGradEligible,
                activities_count: regs.length,
                activities: regs.map((r) => ({
                    activity_id: r.activity_id,
                    title: r.activity_title,
                    hours: Number(r.activity_hours) || 0,
                    category_name: r.category_name || "ทั่วไป",
                    check_in_time: r.check_in_time,
                    is_faculty_major:
                        Number(r.is_target_faculty) === 1 ||
                        Number(r.is_target_major) === 1,
                })),
            };
        });

        // 4. Apply in-memory search if requested
        if (search) {
            processedStudents = processedStudents.filter((s: any) => {
                const sId = (s.student_id || "").toLowerCase();
                const fName = s.full_name.toLowerCase();
                return sId.includes(search) || fName.includes(search);
            });
        }

        // 5. Apply status filter
        if (statusFilter === "passed") {
            processedStudents = processedStudents.filter(
                (s: any) => s.is_grad_eligible,
            );
        } else if (statusFilter === "pending") {
            processedStudents = processedStudents.filter(
                (s: any) => !s.is_grad_eligible,
            );
        }

        // 6. Compute Summary Statistics for Current Filtered Set
        const totalCount = processedStudents.length;
        const passedCount = processedStudents.filter(
            (s: any) => s.is_grad_eligible,
        ).length;
        const pendingCount = totalCount - passedCount;
        const passRate =
            totalCount > 0
                ? Number(((passedCount / totalCount) * 100).toFixed(1))
                : 0;
        const totalVolunteerHours = processedStudents.reduce(
            (sum: number, s: any) => sum + s.volunteer_hours,
            0,
        );
        const totalActivityHours = processedStudents.reduce(
            (sum: number, s: any) => sum + s.total_hours,
            0,
        );
        const avgHours =
            totalCount > 0
                ? Number((totalActivityHours / totalCount).toFixed(1))
                : 0;

        return {
            success: true,
            summary: {
                total_students: totalCount,
                passed_count: passedCount,
                pending_count: pendingCount,
                pass_rate: passRate,
                total_volunteer_hours: Number(totalVolunteerHours.toFixed(1)),
                total_activity_hours: Number(totalActivityHours.toFixed(1)),
                avg_hours: avgHours,
            },
            students: processedStudents,
        };
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage:
                "Error calculating graduation criteria dashboard: " +
                error.message,
            data: error.message,
        });
    }
});
