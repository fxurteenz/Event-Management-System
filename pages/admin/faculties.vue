<template>
  <div class="admin-container">
    <div class="header">
      <h2>จัดการข้อมูลคณะ (Faculties)</h2>
      <NuxtLink to="/admin" class="back-link">กลับหน้าแรก Admin</NuxtLink>
    </div>

    <div class="card form-card">
      <h3>{{ editingId ? 'แก้ไขข้อมูลคณะ' : 'เพิ่มคณะใหม่' }}</h3>
      <form @submit.prevent="saveFaculty" class="flex-form">
        <input 
          type="text" 
          v-model="facultyNameInput" 
          placeholder="ชื่อคณะ" 
          required 
        />
        <button type="submit" :disabled="isLoading" :class="{ 'btn-update': editingId }">
          {{ isLoading ? 'กำลังบันทึก...' : (editingId ? 'อัปเดตข้อมูล' : 'เพิ่มข้อมูล') }}
        </button>
        <button v-if="editingId" type="button" @click="cancelEdit" class="btn-cancel" :disabled="isLoading">
          ยกเลิก
        </button>
      </form>
    </div>

    <div class="card table-card">
      <h3>รายชื่อคณะทั้งหมด</h3>
      <p v-if="pending">กำลังโหลดข้อมูล...</p>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>ชื่อคณะ</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fac in faculties" :key="fac.faculty_id">
            <td>{{ fac.faculty_id }}</td>
            <td>{{ fac.faculty_name }}</td>
            <td>
              <button class="btn-edit" @click="startEdit(fac)">แก้ไข</button>
              <button class="btn-danger" @click="deleteFaculty(fac.faculty_id)">ลบ</button>
            </td>
          </tr>
          <tr v-if="faculties.length === 0">
            <td colspan="3" class="text-center">ยังไม่มีข้อมูลคณะในระบบ</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const facultyNameInput = ref('')
const editingId = ref(null)
const isLoading = ref(false)

// Fetch faculties data using useFetch (Nuxt 3)
const { data: apiResponse, pending, refresh } = await useFetch('/api/admin/faculties')
const faculties = computed(() => apiResponse.value?.data || [])

const saveFaculty = async () => {
  isLoading.value = true
  try {
    if (editingId.value) {
      // Update (PUT)
      await $fetch(`/api/admin/faculties/${editingId.value}`, {
        method: 'PUT',
        body: { faculty_name: facultyNameInput.value }
      })
      alert('อัปเดตข้อมูลสำเร็จ')
    } else {
      // Create (POST)
      await $fetch('/api/admin/faculties', {
        method: 'POST',
        body: { faculty_name: facultyNameInput.value }
      })
      alert('เพิ่มคณะสำเร็จ')
    }
    
    cancelEdit()
    refresh() // โหลดข้อมูลตารางใหม่
  } catch (error) {
    alert('เกิดข้อผิดพลาด: ' + (error.data?.statusMessage || ''))
  } finally {
    isLoading.value = false
  }
}

const startEdit = (fac) => {
  editingId.value = fac.faculty_id
  facultyNameInput.value = fac.faculty_name
}

const cancelEdit = () => {
  editingId.value = null
  facultyNameInput.value = ''
}

const deleteFaculty = async (id) => {
  if (!confirm('คุณแน่ใจหรือไม่ที่จะลบคณะนี้? (ข้อมูลสาขาที่ผูกกับคณะนี้จะถูกลบไปด้วย)')) return
  
  isLoading.value = true
  try {
    await $fetch(`/api/admin/faculties/${id}`, {
      method: 'DELETE'
    })
    alert('ลบข้อมูลสำเร็จ')
    
    // ถ้ากำลังแก้ไขข้อมูลที่ถูกลบอยู่ ให้ยกเลิกการแก้ไข
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
.admin-container {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  font-family: sans-serif;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
.back-link {
  color: #3b82f6;
  text-decoration: none;
}
.card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}
.flex-form {
  display: flex;
  gap: 0.5rem;
}
input {
  flex-grow: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}
button {
  padding: 0.5rem 1rem;
  background-color: #10b981; /* Green */
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}
button:disabled { background-color: #9ca3af; }
.btn-update { background-color: #f59e0b; /* Yellow/Orange */ }
.btn-cancel { background-color: #6b7280; /* Gray */ }
.btn-edit {
  background-color: #f59e0b;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  margin-right: 0.5rem;
}
.btn-danger {
  background-color: #ef4444;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th, .data-table td {
  border-bottom: 1px solid #e5e7eb;
  padding: 0.75rem;
  text-align: left;
}
.text-center { text-align: center; }
</style>
