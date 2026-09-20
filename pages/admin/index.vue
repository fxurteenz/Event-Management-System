<template>
  <div class="admin-container">
    <div class="header">
      <h2>ผู้ดูแลระบบ (Admin Dashboard)</h2>
      <p>เลือกเมนูเพื่อจัดการข้อมูลพื้นฐานของระบบ</p>
    </div>

    <div class="menu-grid">
      <NuxtLink to="/admin/faculties" class="menu-card">
        <h3>🏢 จัดการข้อมูลคณะ</h3>
        <p>เพิ่ม แก้ไข ลบ ข้อมูลคณะ (Faculties)</p>
      </NuxtLink>

      <NuxtLink to="/admin/majors" class="menu-card">
        <h3>📚 จัดการข้อมูลสาขาวิชา</h3>
        <p>เพิ่ม แก้ไข ลบ ข้อมูลสาขาวิชา (Majors)</p>
      </NuxtLink>

      <NuxtLink to="/admin/users" class="menu-card">
        <h3>🔐 จัดการผู้ใช้งาน</h3>
        <p>จัดการบัญชีผู้ใช้และสิทธิ์ (Users)</p>
      </NuxtLink>

      <NuxtLink to="/admin/students" class="menu-card">
        <h3>🎓 จัดการข้อมูลนักศึกษา</h3>
        <p>จัดการประวัตินักศึกษา (Students)</p>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.admin-container {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
  font-family: sans-serif;
  background-color: #f9fafb;
  min-height: 100vh;
}
.header {
  margin-bottom: 3rem;
  text-align: center;
}
.header h2 {
  font-size: 2rem;
  color: #1f2937;
  margin-bottom: 0.5rem;
}
.header p {
  color: #6b7280;
}
.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}
.menu-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid #e5e7eb;
}
.menu-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  border-color: #3b82f6;
}
.menu-card h3 {
  margin-top: 0;
  color: #3b82f6;
  font-size: 1.25rem;
}
.menu-card p {
  color: #4b5563;
  font-size: 0.875rem;
  margin-bottom: 0;
}
</style>
