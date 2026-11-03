import db from '../../utils/db'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const studentId = ((query.student_id as string) || '').trim()

    if (!studentId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'จำเป็นต้องระบุรหัสนักศึกษา (student_id)'
        })
    }

    try {
        const [studentRows]: any = await db.execute(
            `SELECT 
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
            WHERE s.student_id = ?`,
            [studentId]
        )

        if (studentRows.length === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: `ไม่พบข้อมูลนักศึกษารหัส ${studentId} ในระบบ`
            })
        }

        const stu = studentRows[0]

        const [regRows]: any = await db.execute(
            `SELECT 
                ar.registration_id,
                ar.activity_id,
                ar.status,
                ar.registered_at,
                ar.check_in_time,
                ar.check_out_time,
                a.title,
                a.description,
                COALESCE(a.activity_hours, 0) AS activity_hours,
                a.category_id,
                c.category_name,
                a.start_time,
                a.end_time,
                a.qr_code_data,
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
            WHERE ar.student_id = ? AND LOWER(ar.status) != 'cancelled'
            ORDER BY 
                CASE WHEN ar.check_in_time IS NOT NULL THEN 0 ELSE 1 END,
                COALESCE(ar.check_in_time, ar.registered_at) DESC`,
            [studentId]
        )

        let calculatedTotalHours = 0
        let facultyMajorHours = 0
        let volunteerHours = 0
        let generalHours = 0

        const formattedActivities = regRows.map((r: any) => {
            const isCheckedIn = !!r.check_in_time
            const hours = Number(r.activity_hours) || 0
            const isFacultyMajor = Number(r.is_target_faculty) === 1 || Number(r.is_target_major) === 1
            const catName = (r.category_name || '').toLowerCase()
            const isVolunteer = catName.includes('บำเพ็ญ') || catName.includes('ประโยชน์') || catName.includes('จิตอาสา')
            const isMandatory = Number(r.category_id) === 1 || catName.includes('บังคับ')

            if (isCheckedIn) {
                calculatedTotalHours += hours
                if (isFacultyMajor) {
                    facultyMajorHours += hours
                }
                if (isVolunteer) {
                    volunteerHours += hours
                } else if (!isFacultyMajor) {
                    generalHours += hours
                }
            }

            return {
                registration_id: r.registration_id,
                activity_id: r.activity_id,
                title: r.title,
                description: r.description,
                category_id: r.category_id,
                category_name: r.category_name || 'กิจกรรมทั่วไป',
                activity_hours: hours,
                start_time: r.start_time,
                end_time: r.end_time,
                registered_at: r.registered_at,
                check_in_time: r.check_in_time,
                check_out_time: r.check_out_time,
                status: r.status,
                is_checked_in: isCheckedIn,
                is_faculty_major: isFacultyMajor,
                is_volunteer: isVolunteer,
                is_mandatory: isMandatory,
                qr_code_data: r.qr_code_data
            }
        })

        const totalHours = Math.max(
            Number(calculatedTotalHours.toFixed(2)),
            Number(Number(stu.recorded_accumulated_hours).toFixed(2))
        )
        const facHours = Number(facultyMajorHours.toFixed(2))
        const volHours = Number(volunteerHours.toFixed(2))
        const genHours = Number(generalHours.toFixed(2))

        const requiredTotalHours = 48.0
        const requiredFacultyHours = 8.0

        const isFacultyPassed = facHours >= requiredFacultyHours
        const isTotalPassed = totalHours >= requiredTotalHours
        const isGradEligible = isFacultyPassed && isTotalPassed

        const remainingTotalHours = Math.max(0, Number((requiredTotalHours - totalHours).toFixed(2)))
        const remainingFacultyHours = Math.max(0, Number((requiredFacultyHours - facHours).toFixed(2)))

        const progressTotalPercent = Math.min(100, Math.round((totalHours / requiredTotalHours) * 100))
        const progressFacultyPercent = Math.min(100, Math.round((facHours / requiredFacultyHours) * 100))

        const attendedActivities = formattedActivities.filter((a: any) => a.is_checked_in)

        return {
            success: true,
            student: {
                student_id: stu.student_id,
                first_name: stu.first_name,
                last_name: stu.last_name,
                full_name: `${stu.first_name || ''} ${stu.last_name || ''}`.trim(),
                faculty_id: stu.faculty_id,
                faculty_name: stu.faculty_name || '-',
                major_id: stu.major_id,
                major_name: stu.major_name || '-'
            },
            summary: {
                total_hours: totalHours,
                faculty_major_hours: facHours,
                volunteer_hours: volHours,
                general_hours: genHours,
                required_total_hours: requiredTotalHours,
                required_faculty_hours: requiredFacultyHours,
                is_faculty_passed: isFacultyPassed,
                is_total_passed: isTotalPassed,
                is_grad_eligible: isGradEligible,
                remaining_total_hours: remainingTotalHours,
                remaining_faculty_hours: remainingFacultyHours,
                progress_total_percent: progressTotalPercent,
                progress_faculty_percent: progressFacultyPercent,
                attended_count: attendedActivities.length,
                registered_count: formattedActivities.length
            },
            attended_activities: attendedActivities,
            all_activities: formattedActivities
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({
            statusCode: 500,
            statusMessage: 'เกิดข้อผิดพลาดในการดึงข้อมูลชั่วโมงและกิจกรรมของนักศึกษา',
            data: error.message
        })
    }
})
