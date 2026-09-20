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

        // In a real app, you would sign a JWT here
        // For this boilerplate, we'll return the user info
        return {
            message: "Login successful",
            user: {
                id: user.user_id,
                username: user.username,
                role: user.role,
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
