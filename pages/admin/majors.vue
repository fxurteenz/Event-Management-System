<template>
  <div class="admin-container">
    <div class="header">
      <h2>จัดการข้อมูลสาขาวิชา (Majors)</h2>
      <NuxtLink to="/admin" class="back-link">กลับหน้าแรก Admin</NuxtLink>
    </div>

    <div class="card form-card">
      <h3>{{ editingId ? 'แก้ไขสาขาวิชา' : 'เพิ่มสาขาวิชาใหม่' }}</h3>
      <form @submit.prevent="saveMajor" class="flex-form">
        <select v-model="form.faculty_id" required>
          <option value="" disabled>-- เลือกคณะ --</option>
          <option v-for="fac in faculties" :key="fac.faculty_id" :value="fac.faculty_id">
            {{ fac.faculty_name }}
          </option>
        </select>
        <input 
          type="text" 
          v-model="form.major_name" 
          placeholder="ชื่อสาขาวิชา" 
          required 
        />
        <button type="submit" :disabled="isLoading" :class="{ 'btn-update': editingId }">
          {{ isLoading ? 'กำลังบันทึก...' : (editingId ? 'อัปเดต' : 'เพิ่มข้อมูล') }}
        </button>
        <button v-if="editingId" type="button" @click="cancelEdit" class="btn-cancel" :disabled="isLoading">ยกเลิก</button>
      </form>
    </div>

    <div class="card table-card">
      <h3>รายชื่อสาขาวิชาทั้งหมด</h3>
      <p v-if="pending">กำลังโหลดข้อมูล...</p>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>ชื่อสาขาวิชา</th>
            <th>คณะ</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="maj in majors" :key="maj.major_id">
            <td>{{ maj.major_id }}</td>
            <td>{{ maj.major_name }}</td>
            <td>{{ maj.faculty_name }}</td>
            <td>
              <button class="btn-edit" @click="startEdit(maj)">แก้ไข</button>
              <button class="btn-danger" @click="deleteMajor(maj.major_id)">ลบ</button>
            </td>
          </tr>
          <tr v-if="majors.length === 0">
            <td colspan="4" class="text-center">ยังไม่มีข้อมูลสาขาวิชาในระบบ</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const form = ref({
  major_name: '',
  faculty_id: ''
})
const editingId = ref(null)
const isLoading = ref(false)

// Fetch faculties for dropdown
const { data: facResponse } = await useFetch('/api/admin/faculties')
const faculties = computed(() => facResponse.value?.data || [])

// Fetch majors
const { data: apiResponse, pending, refresh } = await useFetch('/api/admin/majors')
const majors = computed(() => apiResponse.value?.data || [])

const saveMajor = async () => {
  isLoading.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/admin/majors/${editingId.value}`, {
        method: 'PUT',
        body: form.value
      })
      alert('อัปเดตข้อมูลสำเร็จ')
    } else {
      await $fetch('/api/admin/majors', {
        method: 'POST',
        body: form.value
      })
      alert('เพิ่มสาขาวิชาสำเร็จ')
    }
    cancelEdit()
    refresh()
  } catch (error) {
    alert('เกิดข้อผิดพลาด: ' + (error.data?.statusMessage || ''))
  } finally {
    isLoading.value = false
  }
}

const startEdit = (maj) => {
  editingId.value = maj.major_id
  form.value = { major_name: maj.major_name, faculty_id: maj.faculty_id }
}

const cancelEdit = () => {
  editingId.value = null
  form.value = { major_name: '', faculty_id: '' }
}

const deleteMajor = async (id) => {
  if (!confirm('ยืนยันการลบสาขาวิชานี้?')) return
  isLoading.value = true
  try {
    await $fetch(`/api/admin/majors/${id}`, { method: 'DELETE' })
    alert('ลบข้อมูลสำเร็จ')
    if (editingId.value === id) cancelEdit()
    refresh()
  } catch (error) {
    alert('เกิดข้อผิดพลาดในการลบ: ' + (error.data?.statusMessage || ''))
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* Reuse styles from faculties.vue */
.admin-container { padding: 2rem; max-width: 800px; margin: 0 auto; font-family: sans-serif; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.back-link { color: #3b82f6; text-decoration: none; }
.card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 2rem; }
.flex-form { display: flex; gap: 0.5rem; }
input, select { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; }
input { flex-grow: 1; }
button { padding: 0.5rem 1rem; background-color: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap; }
button:disabled { background-color: #9ca3af; }
.btn-update { background-color: #f59e0b; }
.btn-cancel { background-color: #6b7280; }
.btn-edit { background-color: #f59e0b; padding: 0.25rem 0.5rem; font-size: 0.875rem; margin-right: 0.5rem; }
.btn-danger { background-color: #ef4444; padding: 0.25rem 0.5rem; font-size: 0.875rem; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { border-bottom: 1px solid #e5e7eb; padding: 0.75rem; text-align: left; }
.text-center { text-align: center; }
</style>
