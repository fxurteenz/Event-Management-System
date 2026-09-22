import db from "../../utils/db";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    if (!body) {
        throw createError({
            statusCode: 400,
            statusMessage: "Request body is missing",
        });
    }

    const { username, password } = body;

    if (!username || !password) {
        throw createError({
            statusCode: 400,
            statusMessage: "Username and password are required",
        });
    }

    try {
        const [rows]: any = await db.execute(
            "SELECT * FROM Users WHERE username = ?",
            [username],
        );

        if (rows.length === 0) {
            throw createError({
                statusCode: 401,
                statusMessage: "Invalid credentials",
            });
        }

        const user = rows[0];

        // TODO: Use bcrypt to compare password_hash in real implementation
        // For now, simple string comparison as a placeholder
        if (user.password_hash !== password) {
            throw createError({
                statusCode: 401,
                statusMessage: "Invalid credentials",
            });
        }

        // ค้นหาข้อมูลนักศึกษาและสังกัดคณะ/สาขาที่ผูกกับ User นี้ (ถ้ามี)
        let studentInfo: any = null;
        const [studentRows]: any = await db.execute(
          `SELECT s.student_id, s.first_name, s.last_name, s.faculty_id, s.major_id, f.faculty_name, m.major_name
           FROM Students s
           LEFT JOIN Faculties f ON s.faculty_id = f.faculty_id
           LEFT JOIN Majors m ON s.major_id = m.major_id
           WHERE s.user_id = ?`,
          [user.user_id]
        );
        if (studentRows.length > 0) {
          studentInfo = studentRows[0];
        }

        const facultyId = studentInfo?.faculty_id || user.faculty_id || null;

        return {
            message: "Login successful",
            user: {
                id: user.user_id,
                username: user.username,
                role: user.role,
                faculty_id: facultyId,
                faculty_name: studentInfo?.faculty_name || null,
                student_id: studentInfo?.student_id || null,
                first_name: studentInfo?.first_name || null,
                last_name: studentInfo?.last_name || null,
                major_id: studentInfo?.major_id || null,
                major_name: studentInfo?.major_name || null
            },
            token: "dummy-jwt-token-replace-me",
        };
    } catch (error: any) {
        if (error.statusCode) throw error;
        throw createError({
            statusCode: 500,
            statusMessage: "Internal server error",
            data: error.message,
        });
    }
});
