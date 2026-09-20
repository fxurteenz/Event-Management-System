<template>
    <div class="admin-container">
        <div class="header">
            <h2>จัดการข้อมูลนักศึกษา (Students)</h2>
            <NuxtLink to="/admin" class="back-link">กลับหน้าแรก Admin</NuxtLink>
        </div>

        <div class="card form-card">
            <h3>{{ editingId ? 'แก้ไขข้อมูลนักศึกษา' : 'เพิ่มนักศึกษาใหม่' }}</h3>
            <p v-if="!editingId" class="help-text">
                * ระบบจะทำการสร้างบัญชีผู้ใช้ (User) ให้โดยอัตโนมัติ<br>
                (Username และ Password เริ่มต้น คือ รหัสนักศึกษา)
            </p>

            <form @submit.prevent="saveStudent" class="flex-form">
                <input type="text" v-model="form.student_id" placeholder="รหัสนักศึกษา (เช่น 65011...)" required
                    :disabled="editingId !== null" />
                <input type="text" v-model="form.first_name" placeholder="ชื่อ" required />
                <input type="text" v-model="form.last_name" placeholder="นามสกุล" required />

                <!-- เลือกคณะ -->
                <select v-model="form.faculty_id" @change="onFacultyChange" required>
                    <option value="" disabled>-- เลือกคณะ --</option>
                    <option v-for="fac in faculties" :key="fac.faculty_id" :value="fac.faculty_id">
                        {{ fac.faculty_name }}
                    </option>
                </select>

                <!-- เลือกสาขาวิชา (กรองตามคณะที่เลือก) -->
                <select v-model="form.major_id" required :disabled="!form.faculty_id">
                    <option value="" disabled>-- {{ form.faculty_id ? 'เลือกสาขาวิชา' : 'กรุณาเลือกคณะก่อน' }} --
                    </option>
                    <option v-for="maj in filteredMajors" :key="maj.major_id" :value="maj.major_id">
                        {{ maj.major_name }}
                    </option>
                </select>

                <button type="submit" :disabled="isLoading" :class="{ 'btn-update': editingId }">
                    {{ isLoading ? 'กำลังบันทึก...' : (editingId ? 'อัปเดต' : 'เพิ่มข้อมูล') }}
                </button>
                <button v-if="editingId" type="button" @click="cancelEdit" class="btn-cancel"
                    :disabled="isLoading">ยกเลิก</button>
            </form>
        </div>

        <div class="card table-card">
            <h3>รายชื่อนักศึกษาทั้งหมด</h3>
            <p v-if="pending">กำลังโหลดข้อมูล...</p>
            <table v-else class="data-table">
                <thead>
                    <tr>
                        <th>รหัสนักศึกษา</th>
                        <th>ชื่อ-นามสกุล</th>
                        <th>คณะ</th>
                        <th>สาขาวิชา</th>
                        <th>บัญชีผู้ใช้ (Auto)</th>
                        <th>ชั่วโมงกิจกรรม</th>
                        <th>จัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="stu in students" :key="stu.student_id">
                        <td>{{ stu.student_id }}</td>
                        <td>{{ stu.first_name }} {{ stu.last_name }}</td>
                        <td>{{ stu.faculty_name || '-' }}</td>
                        <td>{{ stu.major_name || '-' }}</td>
                        <td>{{ stu.username }}</td>
                        <td>{{ stu.accumulated_hours }}</td>
                        <td>
                            <button class="btn-edit" @click="startEdit(stu)">แก้ไข</button>
                            <button class="btn-danger" @click="deleteStudent(stu.student_id)">ลบ</button>
                        </td>
                    </tr>
                    <tr v-if="students.length === 0">
                        <td colspan="7" class="text-center">ยังไม่มีข้อมูลนักศึกษาในระบบ</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const form = ref({
    student_id: '',
    first_name: '',
    last_name: '',
    faculty_id: '',
    major_id: '',
    accumulated_hours: 0
})
const editingId = ref(null)
const isLoading = ref(false)

// Fetch Faculties
const { data: facRes } = await useFetch('/api/admin/faculties')
const faculties = computed(() => facRes.value?.data || [])

// Fetch Majors
const { data: majRes } = await useFetch('/api/admin/majors')
const majors = computed(() => majRes.value?.data || [])

// Filter majors by selected faculty
const filteredMajors = computed(() => {
    if (!form.value.faculty_id) return []
    return majors.value.filter(m => Number(m.faculty_id) === Number(form.value.faculty_id))
})

const onFacultyChange = () => {
    if (form.value.major_id) {
        const currentMajor = majors.value.find(m => Number(m.major_id) === Number(form.value.major_id))
        if (currentMajor && Number(currentMajor.faculty_id) !== Number(form.value.faculty_id)) {
            form.value.major_id = ''
        }
    }
};

// Fetch Students
const { data: apiResponse, pending, refresh } = await useFetch('/api/admin/students')
const students = computed(() => apiResponse.value?.data || [])

const saveStudent = async () => {
    isLoading.value = true
    try {
        const payload = {
            student_id: form.value.student_id,
            first_name: form.value.first_name,
            last_name: form.value.last_name,
            faculty_id: form.value.faculty_id,
            major_id: form.value.major_id,
            accumulated_hours: form.value.accumulated_hours
        }

        if (editingId.value) {
            await $fetch(`/api/admin/students/${editingId.value}`, {
                method: 'PUT',
                body: payload
            })
            alert('อัปเดตข้อมูลสำเร็จ')
        } else {
            await $fetch('/api/admin/students', {
                method: 'POST',
                body: payload
            })
            alert('เพิ่มข้อมูลนักศึกษา และสร้างบัญชีผู้ใช้สำเร็จ!')
        }
        cancelEdit()
        refresh()
    } catch (error) {
        alert('เกิดข้อผิดพลาด: ' + (error.data?.statusMessage || ''))
    } finally {
        isLoading.value = false
    }
};

const startEdit = (stu) => {
    editingId.value = stu.student_id

    // Resolve faculty_id if not present directly
    let facId = stu.faculty_id
    if (!facId && stu.major_id) {
        const foundMajor = majors.value.find(m => Number(m.major_id) === Number(stu.major_id))
        if (foundMajor) facId = foundMajor.faculty_id
    }

    form.value = {
        student_id: stu.student_id,
        first_name: stu.first_name,
        last_name: stu.last_name,
        faculty_id: facId || '',
        major_id: stu.major_id || '',
        accumulated_hours: stu.accumulated_hours
    }
};

const cancelEdit = () => {
    editingId.value = null
    form.value = {
        student_id: '',
        first_name: '',
        last_name: '',
        faculty_id: '',
        major_id: '',
        accumulated_hours: 0
    }
};

const deleteStudent = async (id) => {
    if (!confirm('ยืนยันการลบนักศึกษานี้?')) return
    isLoading.value = true
    try {
        await $fetch(`/api/admin/students/${id}`, { method: 'DELETE' })
        alert('ลบข้อมูลนักศึกษาสำเร็จ')
        if (editingId.value === id) cancelEdit()
        refresh()
    } catch (error) {
        alert('เกิดข้อผิดพลาดในการลบ: ' + (error.data?.statusMessage || ''))
    } finally {
        isLoading.value = false
    }
};
</script>

<style scoped>
.admin-container {
    padding: 2rem;
    max-width: 1050px;
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
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
}

.help-text {
    font-size: 0.875rem;
    color: #10b981;
    margin-bottom: 1rem;
    margin-top: -0.5rem;
}

.flex-form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
}

input,
select {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    width: 100%;
    box-sizing: border-box;
}

button {
    padding: 0.5rem 1rem;
    background-color: #10b981;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

button:disabled {
    background-color: #9ca3af;
}

.btn-update {
    background-color: #f59e0b;
}

.btn-cancel {
    background-color: #6b7280;
}

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

.data-table th,
.data-table td {
    border-bottom: 1px solid #e5e7eb;
    padding: 0.75rem;
    text-align: left;
}

.text-center {
    text-align: center;
}
</style>
