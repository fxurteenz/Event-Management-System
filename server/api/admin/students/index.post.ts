import db from "../../../utils/db";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    if (!body) {
        throw createError({
            statusCode: 400,
            statusMessage: "Missing request body",
        });
    }

    const connection = await db.getConnection();

    // BATCH IMPORT
    if (Array.isArray(body.students)) {
        if (!body.major_id) {
            connection.release();
            throw createError({
                statusCode: 400,
                statusMessage: "กรุณาระบุสาขาวิชาสำหรับการนำเข้า",
            });
        }

        const facultyId = body.faculty_id ? Number(body.faculty_id) : null;
        const majorId = Number(body.major_id);
        const students = body.students;

        if (students.length === 0) {
            connection.release();
            throw createError({
                statusCode: 400,
                statusMessage: "ไม่พบรายชื่อนักศึกษาที่ต้องการนำเข้า",
            });
        }

        try {
            await connection.beginTransaction();

            let insertedCount = 0;
            const skipped: any[] = [];

            for (const stu of students) {
                const studentId = String(stu.student_id || "").trim();
                const firstName = String(stu.first_name || "").trim();
                const lastName = String(stu.last_name || "").trim();
                const hours = Number(stu.accumulated_hours) || 0;

                if (!studentId || !firstName || !lastName) {
                    skipped.push({
                        student_id: studentId,
                        reason: "ข้อมูลไม่ครบถ้วน",
                    });
                    continue;
                }

                // Check if student already exists in Students
                const [existingStudent]: any = await connection.execute(
                    "SELECT student_id FROM Students WHERE student_id = ?",
                    [studentId],
                );
                if (existingStudent.length > 0) {
                    skipped.push({
                        student_id: studentId,
                        reason: "รหัสนักศึกษานี้มีอยู่ในระบบแล้ว",
                    });
                    continue;
                }

                // Check or create user account
                const [existingUser]: any = await connection.execute(
                    "SELECT user_id FROM Users WHERE username = ?",
                    [studentId],
                );

                let userId: number;
                if (existingUser.length > 0) {
                    userId = existingUser[0].user_id;
                } else {
                    const [userResult]: any = await connection.execute(
                        "INSERT INTO Users (username, password_hash, role) VALUES (?, ?, ?)",
                        [studentId, studentId, "Student"],
                    );
                    userId = userResult.insertId;
                }

                // Insert Student
                await connection.execute(
                    `INSERT INTO Students (student_id, first_name, last_name, faculty_id, major_id, user_id, accumulated_hours)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        studentId,
                        firstName,
                        lastName,
                        facultyId,
                        majorId,
                        userId,
                        hours,
                    ],
                );

                insertedCount++;
            }

            await connection.commit();

            return {
                success: true,
                inserted_count: insertedCount,
                skipped_count: skipped.length,
                skipped_details: skipped,
                message: `นำเข้ารายชื่อนักศึกษาสำเร็จ ${insertedCount} คน${skipped.length > 0 ? ` (ข้าม ${skipped.length} คน)` : ""}`,
            };
        } catch (e: any) {
            await connection.rollback();
            throw createError({
                statusCode: 500,
                statusMessage:
                    "เกิดข้อผิดพลาดในการนำเข้าข้อมูล: " +
                    (e.sqlMessage || e.message),
            });
        } finally {
            connection.release();
        }
    }

    // SINGLE STUDENT CREATION
    if (
        !body.student_id ||
        !body.first_name ||
        !body.last_name ||
        !body.major_id
    ) {
        connection.release();
        throw createError({ statusCode: 400, statusMessage: "Missing fields" });
    }

    try {
        await connection.beginTransaction();

        const [userResult]: any = await connection.execute(
            "INSERT INTO Users (username, password_hash, role) VALUES (?, ?, ?)",
            [body.student_id, body.student_id, "Student"],
        );

        const newUserId = userResult.insertId;
        const facultyId = body.faculty_id ? Number(body.faculty_id) : null;

        await connection.execute(
            "INSERT INTO Students (student_id, first_name, last_name, faculty_id, major_id, user_id, accumulated_hours) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                body.student_id,
                body.first_name,
                body.last_name,
                facultyId,
                body.major_id,
                newUserId,
                body.accumulated_hours || 0,
            ],
        );

        await connection.commit();
        return {
            success: true,
            message: "Student and User Account created automatically",
        };
    } catch (e: any) {
        await connection.rollback();
        if (e.code === "ER_DUP_ENTRY") {
            throw createError({
                statusCode: 400,
                statusMessage: "Student ID or Username already exists",
            });
        }
        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            data: e.message,
        });
    } finally {
        connection.release();
    }
});
