import db from "../../../utils/db";

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, "id");
    const body = await readBody(event);

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: "Faculty ID is required",
        });
    }

    if (!body || !body.faculty_name) {
        throw createError({
            statusCode: 400,
            statusMessage: "Faculty name is required",
        });
    }

    try {
        const [result]: any = await db.execute(
            "UPDATE Faculties SET faculty_name = ? WHERE faculty_id = ?",
            [body.faculty_name, id],
        );

        if (result.affectedRows === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: "Faculty not found",
            });
        }

        return {
            success: true,
            message: "Faculty updated successfully",
        };
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: "Error updating faculty",
            data: error.message,
        });
    }
});
