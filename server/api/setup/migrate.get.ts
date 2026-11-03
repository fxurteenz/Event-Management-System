import db from "../../utils/db";

export default defineEventHandler(async () => {
    const results: any[] = [];
    try {
        // 1. Check & Add registered_at to Activity_Registrations
        try {
            await db.execute(
                `ALTER TABLE Activity_Registrations ADD COLUMN registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
            );
            results.push(
                "Added registered_at column to Activity_Registrations",
            );
        } catch (e: any) {
            results.push("registered_at column ready");
        }

        // 2. Check Activity_Target_Faculties table
        try {
            await db.execute(`
        CREATE TABLE IF NOT EXISTS Activity_Target_Faculties (
          activity_id INT NOT NULL,
          faculty_id INT NOT NULL,
          PRIMARY KEY (activity_id, faculty_id),
          FOREIGN KEY (activity_id) REFERENCES Activities(activity_id) ON DELETE CASCADE,
          FOREIGN KEY (faculty_id) REFERENCES Faculties(faculty_id) ON DELETE CASCADE
        )
      `);
            results.push("Activity_Target_Faculties table ready");
        } catch (e: any) {
            results.push(
                "Activity_Target_Faculties check: " +
                    (e.sqlMessage || e.message),
            );
        }

        // 3. Check Activity_Target_Majors table
        try {
            await db.execute(`
        CREATE TABLE IF NOT EXISTS Activity_Target_Majors (
          activity_id INT NOT NULL,
          major_id INT NOT NULL,
          PRIMARY KEY (activity_id, major_id),
          FOREIGN KEY (activity_id) REFERENCES Activities(activity_id) ON DELETE CASCADE,
          FOREIGN KEY (major_id) REFERENCES Majors(major_id) ON DELETE CASCADE
        )
      `);
            results.push("Activity_Target_Majors table ready");
        } catch (e: any) {
            results.push(
                "Activity_Target_Majors check: " + (e.sqlMessage || e.message),
            );
        }

        // 4. Check max_participants in Activities
        try {
            await db.execute(`
        ALTER TABLE Activities ADD COLUMN max_participants INT DEFAULT NULL
      `);
            results.push("Added max_participants column to Activities");
        } catch (e: any) {
            results.push("max_participants column ready");
        }

        // 5. Check faculty_id in Users
        try {
            await db.execute(`
        ALTER TABLE Users ADD COLUMN faculty_id INT DEFAULT NULL
      `);
            results.push("Added faculty_id column to Users");
        } catch (e: any) {
            results.push("faculty_id column ready");
        }

        return {
            success: true,
            migrations: results,
        };
    } catch (err: any) {
        return {
            success: false,
            error: err.message,
        };
    }
});
