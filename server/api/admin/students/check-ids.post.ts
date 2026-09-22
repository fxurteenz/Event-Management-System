import db from "../../../utils/db";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const ids: string[] = body?.student_ids || [];

    if (!Array.isArray(ids) || ids.length === 0) {
        return { success: true, existing_ids: [] };
    }

    // Sanitize IDs: strings only, trim
    const cleanIds = ids
        .map((id) => String(id).trim())
        .filter((id) => id.length > 0);
    if (cleanIds.length === 0) {
        return { success: true, existing_ids: [] };
    }

    try {
        // Check both Students and Users table
        const placeholders = cleanIds.map(() => "?").join(",");
        const [rows]: any = await db.query(
            `SELECT student_id FROM Students WHERE student_id IN (${placeholders})
       UNION
       SELECT username as student_id FROM Users WHERE username IN (${placeholders})`,
            [...cleanIds, ...cleanIds],
        );

        const existingIds = rows.map((r: any) => String(r.student_id));
        return {
            success: true,
            existing_ids: existingIds,
        };
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: "Error checking student IDs",
            data: error.message,
        });
    }
});
