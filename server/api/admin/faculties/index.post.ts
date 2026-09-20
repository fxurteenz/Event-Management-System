import db from "../../../utils/db";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    if (!body || !body.faculty_name) {
        throw createError({
            statusCode: 400,
            statusMessage: "Faculty name is required",
        });
    }

    try {
        const [result]: any = await db.execute(
            "INSERT INTO Faculties (faculty_name) VALUES (?)",
            [body.faculty_name],
        );

        return {
            success: true,
            message: "Faculty created successfully",
            id: result.insertId,
        };
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: "Error creating faculty",
            data: error.message,
        });
    }
});
