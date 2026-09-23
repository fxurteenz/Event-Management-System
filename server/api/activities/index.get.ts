import db from "../../utils/db";

export default defineEventHandler(async (event) => {
    try {
        // 1. Ensure junction tables exist
        await db.execute(`
      CREATE TABLE IF NOT EXISTS Activity_Target_Faculties (
        activity_id INT NOT NULL,
        faculty_id INT NOT NULL,
        PRIMARY KEY (activity_id, faculty_id),
        FOREIGN KEY (activity_id) REFERENCES Activities(activity_id) ON DELETE CASCADE,
        FOREIGN KEY (faculty_id) REFERENCES Faculties(faculty_id) ON DELETE CASCADE
      )
    `);

        await db.execute(`
      CREATE TABLE IF NOT EXISTS Activity_Target_Majors (
        activity_id INT NOT NULL,
        major_id INT NOT NULL,
        PRIMARY KEY (activity_id, major_id),
        FOREIGN KEY (activity_id) REFERENCES Activities(activity_id) ON DELETE CASCADE,
        FOREIGN KEY (major_id) REFERENCES Majors(major_id) ON DELETE CASCADE
      )
    `);

        // Migrate any legacy target columns if junction tables are empty
        try {
            await db.execute(`
        INSERT IGNORE INTO Activity_Target_Faculties (activity_id, faculty_id)
        SELECT activity_id, target_faculty_id FROM Activities WHERE target_faculty_id IS NOT NULL
      `);
            await db.execute(`
        INSERT IGNORE INTO Activity_Target_Majors (activity_id, major_id)
        SELECT activity_id, target_major_id FROM Activities WHERE target_major_id IS NOT NULL
      `);
        } catch (e) {
            // Ignore migration if columns were removed or already migrated
        }

        // 2. Query Activities
        const query = `
      SELECT 
        a.activity_id, 
        a.title, 
        a.description,
        a.start_time, 
        a.end_time, 
        a.activity_hours,
        a.category_id,
        c.category_name,
        a.qr_code_data,
        a.max_participants,
        (SELECT COUNT(*) FROM Activity_Registrations ar WHERE ar.activity_id = a.activity_id AND LOWER(ar.status) != 'cancelled') AS registered_count
      FROM Activities a
      LEFT JOIN Activity_Categories c ON a.category_id = c.category_id
      ORDER BY a.start_time ASC
    `;
        const [activities]: any = await db.execute(query);

        if (activities.length === 0) {
            return { success: true, data: [] };
        }

        // 3. Query all target faculties
        const [facultiesRows]: any = await db.execute(`
      SELECT atf.activity_id, f.faculty_id, f.faculty_name
      FROM Activity_Target_Faculties atf
      JOIN Faculties f ON atf.faculty_id = f.faculty_id
    `);

        // 4. Query all target majors
        const [majorsRows]: any = await db.execute(`
      SELECT atm.activity_id, m.major_id, m.major_name, m.faculty_id, f.faculty_name
      FROM Activity_Target_Majors atm
      JOIN Majors m ON atm.major_id = m.major_id
      LEFT JOIN Faculties f ON m.faculty_id = f.faculty_id
    `);

        // Group target faculties and majors by activity_id
        const facultiesByAct: Record<number, any[]> = {};
        for (const r of facultiesRows) {
            if (!facultiesByAct[r.activity_id])
                facultiesByAct[r.activity_id] = [];
            facultiesByAct[r.activity_id].push({
                faculty_id: r.faculty_id,
                faculty_name: r.faculty_name,
            });
        }

        const majorsByAct: Record<number, any[]> = {};
        for (const r of majorsRows) {
            if (!majorsByAct[r.activity_id]) majorsByAct[r.activity_id] = [];
            majorsByAct[r.activity_id].push({
                major_id: r.major_id,
                major_name: r.major_name,
                faculty_id: r.faculty_id,
                faculty_name: r.faculty_name,
            });
        }

        // Attach to activities
        const result = activities.map((act: any) => ({
            ...act,
            target_faculties: facultiesByAct[act.activity_id] || [],
            target_majors: majorsByAct[act.activity_id] || [],
        }));

        return {
            success: true,
            data: result,
        };
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: "Error fetching activities",
            data: error.message,
        });
    }
});
