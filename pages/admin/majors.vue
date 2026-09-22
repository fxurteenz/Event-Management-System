<template>
  <div class="redirect-box">
    <p>กำลังนำท่านไปยังหน้าจัดการข้อมูลคณะและสาขาวิชา...</p>
    <NuxtLink to="/admin/faculties#majors-section">คลิกที่นี่หากไม่มีการเปลี่ยนหน้าอัตโนมัติ</NuxtLink>
  </div>
</template>

<script setup>
// Redirect to the combined page
await navigateTo('/admin/faculties#majors-section', { replace: true })
</script>

<style scoped>
.redirect-box {
  padding: 3rem;
  text-align: center;
  font-family: sans-serif;
  color: #64748b;
}
</style>
