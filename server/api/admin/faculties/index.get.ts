import db from "../../../utils/db";

export default defineEventHandler(async (event) => {
    try {
        const [rows]: any = await db.execute(
            "SELECT * FROM Faculties ORDER BY faculty_id DESC",
        );
        return {
            success: true,
            data: rows,
        };
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: "Error fetching faculties",
            data: error.message,
        });
    }
});
