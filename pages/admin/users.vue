<template>
  <div class="admin-container">
    <div class="header">
      <h2>จัดการผู้ใช้งาน (Users)</h2>
      <NuxtLink to="/admin" class="back-link">กลับหน้าแรก Admin</NuxtLink>
    </div>

    <div class="card form-card">
      <h3>{{ editingId ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่' }}</h3>
      <form @submit.prevent="saveUser" class="flex-form">
        <input 
          type="text" 
          v-model="form.username" 
          placeholder="Username" 
          required 
        />
        <input 
          type="password" 
          v-model="form.password" 
          :placeholder="editingId ? 'เว้นว่างถ้าไม่เปลี่ยนรหัสผ่าน' : 'Password'" 
          :required="!editingId" 
        />
        <select v-model="form.role" required>
          <option value="" disabled>-- เลือกระดับสิทธิ์ --</option>
          <option value="Student">Student (นักศึกษา)</option>
          <option value="Club_President">Club President (ประธานสโมสร)</option>
          <option value="Org_President">Org President (นายกองค์การ)</option>
          <option value="Admin">Admin (ผู้ดูแลระบบ)</option>
        </select>
        <button type="submit" :disabled="isLoading" :class="{ 'btn-update': editingId }">
          {{ isLoading ? 'กำลังบันทึก...' : (editingId ? 'อัปเดต' : 'เพิ่มผู้ใช้งาน') }}
        </button>
        <button v-if="editingId" type="button" @click="cancelEdit" class="btn-cancel" :disabled="isLoading">ยกเลิก</button>
      </form>
    </div>

    <div class="card table-card">
      <h3>รายชื่อผู้ใช้งานทั้งหมด</h3>
      <p v-if="pending">กำลังโหลดข้อมูล...</p>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Role</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.user_id">
            <td>{{ user.user_id }}</td>
            <td>{{ user.username }}</td>
            <td>
              <span class="badge" :class="'badge-' + (user.role || '').toLowerCase()">{{ user.role }}</span>
            </td>
            <td>
              <button class="btn-edit" @click="startEdit(user)">แก้ไข</button>
              <button class="btn-danger" @click="deleteUser(user.user_id)">ลบ</button>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="4" class="text-center">ยังไม่มีข้อมูลผู้ใช้งานในระบบ</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const form = ref({ username: '', password: '', role: '' })
const editingId = ref(null)
const isLoading = ref(false)

// Fetch users
const { data: apiResponse, pending, refresh } = await useFetch('/api/admin/users')
const users = computed(() => apiResponse.value?.data || [])

const saveUser = async () => {
  isLoading.value = true
  try {
    const payload = {
      username: form.value.username,
      password: form.value.password,
      role: form.value.role
    }

    if (editingId.value) {
      await $fetch(`/api/admin/users/${editingId.value}`, {
        method: 'PUT',
        body: payload
      })
      alert('อัปเดตข้อมูลสำเร็จ')
    } else {
      await $fetch('/api/admin/users', {
        method: 'POST',
        body: payload
      })
      alert('เพิ่มผู้ใช้งานสำเร็จ')
    }
    cancelEdit()
    refresh()
  } catch (error) {
    alert('เกิดข้อผิดพลาด: ' + (error.data?.statusMessage || ''))
  } finally {
    isLoading.value = false
  }
}

const startEdit = (user) => {
  editingId.value = user.user_id
  form.value = {
    username: user.username,
    password: '',
    role: user.role
  }
}

const cancelEdit = () => {
  editingId.value = null
  form.value = { username: '', password: '', role: '' }
}

const deleteUser = async (id) => {
  if (!confirm('ยืนยันการลบผู้ใช้งานนี้?')) return
  isLoading.value = true
  try {
    await $fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
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
.admin-container { padding: 2rem; max-width: 900px; margin: 0 auto; font-family: sans-serif; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.back-link { color: #3b82f6; text-decoration: none; }
.card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 2rem; }
.flex-form { display: flex; flex-wrap: wrap; gap: 0.5rem; }
input, select { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; }
input { flex-grow: 1; min-width: 150px; }
select { min-width: 160px; }
button { padding: 0.5rem 1rem; background-color: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap; }
button:disabled { background-color: #9ca3af; }
.btn-update { background-color: #f59e0b; }
.btn-cancel { background-color: #6b7280; }
.btn-edit { background-color: #f59e0b; padding: 0.25rem 0.5rem; font-size: 0.875rem; margin-right: 0.5rem; }
.btn-danger { background-color: #ef4444; padding: 0.25rem 0.5rem; font-size: 0.875rem; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { border-bottom: 1px solid #e5e7eb; padding: 0.75rem; text-align: left; }
.text-center { text-align: center; }

.badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: bold; }
.badge-admin { background-color: #fecdd3; color: #be123c; }
.badge-student { background-color: #dbeafe; color: #1d4ed8; }
.badge-club_president { background-color: #fef3c7; color: #b45309; }
.badge-org_president { background-color: #e0e7ff; color: #4338ca; }
</style>
