import db from '../../utils/db';

export default defineEventHandler(async (event) => {
  try {
    // Check if admin already exists
    const [rows]: any = await db.execute('SELECT * FROM Users WHERE username = ?', ['admin']);
    
    if (rows.length > 0) {
      return { message: 'Admin user already exists.' };
    }

    // Insert mock admin user
    await db.execute(
      "INSERT INTO Users (username, password_hash, role) VALUES (?, ?, ?)",
      ['admin', 'admin123', 'admin']
    );

    return { message: 'Seed successful! Mock admin user created. You can now login.' };
  } catch (error: any) {
    return { error: true, message: error.message };
  }
});
