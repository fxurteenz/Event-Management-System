<template>
  <div class="admin-container">
    <!-- Header -->
    <div class="header">
      <div>
        <h2>🔐 จัดการผู้ใช้งาน (Users Management)</h2>
        <p class="subtitle">จัดการบัญชีผู้ใช้ ค้นหา กรองตามคณะ/สาขา และจัดกลุ่มข้อมูลแบบหลายมิติ</p>
      </div>
      <NuxtLink to="/admin" class="back-link">← กลับหน้าแรก Admin</NuxtLink>
    </div>

    <!-- Form: เพิ่ม / แก้ไข ผู้ใช้งาน -->
    <div class="card form-card">
      <div class="form-title-row">
        <h3>{{ editingId ? '✏️ แก้ไขข้อมูลผู้ใช้งาน' : '➕ เพิ่มผู้ใช้งานใหม่' }}</h3>
        <span v-if="editingId" class="badge-editing">กำลังแก้ไข User ID: {{ editingId }}</span>
      </div>

      <form @submit.prevent="saveUser" class="flex-form">
        <div class="form-item input-username">
          <label>Username <span class="required">*</span></label>
          <input 
            type="text" 
            v-model="form.username" 
            placeholder="Username / รหัสนักศึกษา" 
            required 
          />
        </div>

        <div class="form-item input-password">
          <label>Password {{ editingId ? '(เว้นว่างถ้าไม่เปลี่ยน)' : '*' }}</label>
          <input 
            type="password" 
            v-model="form.password" 
            :placeholder="editingId ? 'เว้นว่างถ้าไม่เปลี่ยนรหัสผ่าน' : 'Password'" 
            :required="!editingId" 
          />
        </div>

        <div class="form-item select-role">
          <label>บทบาท (Role) <span class="required">*</span></label>
          <select v-model="form.role" required>
            <option value="" disabled>-- เลือกระดับสิทธิ์ --</option>
            <option value="Student">Student (นักศึกษา)</option>
            <option value="Club_President">Club President (ประธานสโมสร)</option>
            <option value="Org_President">Org President (นายกองค์การ)</option>
            <option value="Admin">Admin (ผู้ดูแลระบบ)</option>
          </select>
        </div>

        <!-- เลือกคณะ (แสดงเมื่อเป็นประธานสโมสร หรือต้องการระบุคณะ) -->
        <div v-if="form.role === 'Club_President'" class="form-item select-faculty">
          <label>คณะต้นสังกัด (สำหรับประธานสโมสร) <span class="required">*</span></label>
          <select v-model="form.faculty_id" required>
            <option value="" disabled>-- เลือกคณะที่ดูแล --</option>
            <option v-for="fac in faculties" :key="fac.faculty_id" :value="fac.faculty_id">
              🏢 {{ fac.faculty_name }}
            </option>
          </select>
        </div>

        <div class="form-btn-group">
          <button type="submit" :disabled="isLoading" :class="{ 'btn-update': editingId }">
            {{ isLoading ? 'กำลังบันทึก...' : (editingId ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้งาน') }}
          </button>
          <button v-if="editingId" type="button" @click="cancelEdit" class="btn-cancel" :disabled="isLoading">
            ยกเลิก
          </button>
        </div>
      </form>
    </div>

    <!-- แผงค้นหา กรอง และจัดกลุ่มผู้ใช้งาน -->
    <div class="card control-card">
      <div class="control-header">
        <div>
          <h3>🔍 ค้นหาและกรองผู้ใช้งาน</h3>
          <span class="count-badge">พบ {{ filteredUsers.length }} จาก {{ users.length }} ผู้ใช้</span>
        </div>
        <button 
          v-if="searchQuery || filterFaculty || filterMajor || filterRole || hasActiveGrouping" 
          class="btn-reset-filters" 
          @click="resetAllFiltersAndGrouping"
        >
          🔄 ล้างตัวกรองและการจัดกลุ่ม
        </button>
      </div>

      <!-- แถวที่ 1: ค้นหา และ ตัวกรอง คณะ / สาขา / Role -->
      <div class="filters-grid">
        <div class="filter-col search-col">
          <label class="filter-label">ค้นหา:</label>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="🔍 พิมพ์ชื่อ, นามสกุล, หรือรหัสนักศึกษา / Username..." 
            class="input-search"
          />
        </div>

        <div class="filter-col">
          <label class="filter-label">กรองตามคณะ:</label>
          <select v-model="filterFaculty" @change="filterMajor = ''">
            <option value="">-- ทุกคณะ --</option>
            <option v-for="fac in faculties" :key="fac.faculty_id" :value="fac.faculty_id">
              {{ fac.faculty_name }}
            </option>
          </select>
        </div>

        <div class="filter-col">
          <label class="filter-label">กรองตามสาขาวิชา:</label>
          <select v-model="filterMajor" :disabled="!filterFaculty">
            <option value="">-- ทุกสาขาวิชา --</option>
            <option v-for="maj in filteredFilterMajors" :key="maj.major_id" :value="maj.major_id">
              {{ maj.major_name }}
            </option>
          </select>
        </div>

        <div class="filter-col">
          <label class="filter-label">กรองตามบทบาท:</label>
          <select v-model="filterRole">
            <option value="">-- ทุกบทบาท --</option>
            <option value="Student">Student (นักศึกษา)</option>
            <option value="Club_President">Club President (ประธานสโมสร)</option>
            <option value="Org_President">Org President (นายกองค์การ)</option>
            <option value="Admin">Admin (ผู้ดูแลระบบ)</option>
          </select>
        </div>
      </div>

      <!-- แถวที่ 2: ตัวเลือกจัดกลุ่มพร้อมกัน (Multi-Grouping Controls) -->
      <div class="grouping-bar">
        <div class="grouping-left">
          <span class="grouping-title">🧩 จัดกลุ่มข้อมูลตาม (เลือกพร้อมกันได้):</span>
          <div class="grouping-options">
            <label class="checkbox-pill" :class="{ active: groupByFaculty }">
              <input type="checkbox" v-model="groupByFaculty" />
              <span>🏢 คณะ</span>
            </label>
            <label class="checkbox-pill" :class="{ active: groupByMajor }">
              <input type="checkbox" v-model="groupByMajor" />
              <span>🎓 สาขาวิชา</span>
            </label>
            <label class="checkbox-pill" :class="{ active: groupByRole }">
              <input type="checkbox" v-model="groupByRole" />
              <span>🔐 บทบาท (Role)</span>
            </label>
          </div>
        </div>

        <div v-if="hasActiveGrouping" class="grouping-actions">
          <button type="button" class="btn-group-toggle" @click="expandAllGroups">
            ➕ ขยายทุกกลุ่ม
          </button>
          <button type="button" class="btn-group-toggle" @click="collapseAllGroups">
            ➖ ยุบทุกกลุ่ม
          </button>
        </div>
      </div>
    </div>

    <!-- ส่วนแสดงผลรายการผู้ใช้งาน (แบ่งเป็น Grouped View หรือ Flat Table) -->
    <div class="card table-card">
      <div v-if="pending" class="loading-state">กำลังโหลดข้อมูลผู้ใช้งาน...</div>

      <!-- กรณีที่ 1: มีการจัดกลุ่ม (Grouped View) -->
      <div v-else-if="hasActiveGrouping" class="grouped-container">
        <div v-if="groupedUsers.length === 0" class="empty-state">
          <p>ไม่พบข้อมูลผู้ใช้งานตามเงื่อนไขตัวกรองที่กำหนด</p>
        </div>

        <div 
          v-for="group in groupedUsers" 
          :key="group.key" 
          class="group-block"
        >
          <!-- Group Header -->
          <div class="group-header" @click="toggleGroup(group.key)">
            <div class="group-badges-wrap">
              <span class="group-toggle-icon">{{ isGroupCollapsed(group.key) ? '▶' : '▼' }}</span>
              <span 
                v-for="(badge, bIdx) in group.labels" 
                :key="bIdx" 
                class="group-tag"
                :class="'tag-' + badge.type"
              >
                {{ badge.icon }} {{ badge.label }}
              </span>
              <span class="group-count">({{ group.users.length }} คน)</span>
            </div>
            <span class="group-state-hint">{{ isGroupCollapsed(group.key) ? 'คลิกเพื่อดูรายชื่อ' : 'คลิกเพื่อยุบ' }}</span>
          </div>

          <!-- Group Content Table -->
          <div v-show="!isGroupCollapsed(group.key)" class="group-content table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 70px;">ID</th>
                  <th>Username</th>
                  <th>รหัสนักศึกษา</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>คณะ</th>
                  <th>สาขาวิชา</th>
                  <th style="width: 130px;">บทบาท</th>
                  <th style="width: 120px; text-align: center;">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in group.users" :key="user.user_id">
                  <td><code>{{ user.user_id }}</code></td>
                  <td><strong>{{ user.username }}</strong></td>
                  <td>
                    <code v-if="user.student_id">{{ user.student_id }}</code>
                    <span v-else class="text-muted">-</span>
                  </td>
                  <td>
                    <span v-if="user.first_name || user.last_name" class="font-medium">
                      {{ user.first_name }} {{ user.last_name }}
                    </span>
                    <span v-else class="text-muted">-</span>
                  </td>
                  <td>{{ user.faculty_name || '-' }}</td>
                  <td>{{ user.major_name || '-' }}</td>
                  <td>
                    <span class="badge" :class="'badge-' + (user.role || '').toLowerCase()">
                      {{ user.role }}
                    </span>
                  </td>
                  <td class="text-center">
                    <div class="action-buttons">
                      <button class="btn-edit" @click="startEdit(user)">แก้ไข</button>
                      <button class="btn-danger" @click="deleteUser(user.user_id)">ลบ</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- กรณีที่ 2: แสดงแบบตารางปกติ (Flat Table View) -->
      <div v-else class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 70px;">ID</th>
              <th>Username</th>
              <th>รหัสนักศึกษา</th>
              <th>ชื่อ-นามสกุล</th>
              <th>คณะ</th>
              <th>สาขาวิชา</th>
              <th style="width: 130px;">บทบาท (Role)</th>
              <th style="width: 120px; text-align: center;">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.user_id">
              <td><code>{{ user.user_id }}</code></td>
              <td><strong>{{ user.username }}</strong></td>
              <td>
                <code v-if="user.student_id">{{ user.student_id }}</code>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <span v-if="user.first_name || user.last_name" class="font-medium">
                  {{ user.first_name }} {{ user.last_name }}
                </span>
                <span v-else class="text-muted">-</span>
              </td>
              <td>{{ user.faculty_name || '-' }}</td>
              <td>{{ user.major_name || '-' }}</td>
              <td>
                <span class="badge" :class="'badge-' + (user.role || '').toLowerCase()">
                  {{ user.role }}
                </span>
              </td>
              <td class="text-center">
                <div class="action-buttons">
                  <button class="btn-edit" @click="startEdit(user)">แก้ไข</button>
                  <button class="btn-danger" @click="deleteUser(user.user_id)">ลบ</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredUsers.length === 0">
              <td colspan="8" class="text-center empty-cell">
                <span v-if="searchQuery || filterFaculty || filterMajor || filterRole">
                  ไม่พบข้อมูลผู้ใช้งานตามเงื่อนไขตัวกรอง
                </span>
                <span v-else>ยังไม่มีข้อมูลผู้ใช้งานในระบบ</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// ==========================================
// 1. DATA STATE & FETCHING
// ==========================================
const form = ref({ 
  username: '', 
  password: '', 
  role: '',
  faculty_id: '' 
})
const editingId = ref(null)
const isLoading = ref(false)

// Fetch Users
const { data: apiResponse, pending, refresh } = await useFetch('/api/admin/users')
const users = computed(() => apiResponse.value?.data || [])

// Fetch Faculties & Majors for filters and form
const { data: facRes } = await useFetch('/api/admin/faculties')
const faculties = computed(() => facRes.value?.data || [])

const { data: majRes } = await useFetch('/api/admin/majors')
const majors = computed(() => majRes.value?.data || [])

// ==========================================
// 2. SEARCH & FILTER STATE
// ==========================================
const searchQuery = ref('')
const filterFaculty = ref('')
const filterMajor = ref('')
const filterRole = ref('')

// Majors filtered by selected faculty dropdown
const filteredFilterMajors = computed(() => {
  if (!filterFaculty.value) return []
  return majors.value.filter(m => Number(m.faculty_id) === Number(filterFaculty.value))
})

// Filtered users matching search and filters
const filteredUsers = computed(() => {
  return users.value.filter(user => {
    // 1. Faculty filter
    if (filterFaculty.value && Number(user.faculty_id) !== Number(filterFaculty.value)) {
      return false
    }
    // 2. Major filter
    if (filterMajor.value && Number(user.major_id) !== Number(filterMajor.value)) {
      return false
    }
    // 3. Role filter
    if (filterRole.value && (user.role || '').toLowerCase() !== filterRole.value.toLowerCase()) {
      return false
    }
    // 4. Search query (username, student_id, first_name, last_name)
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      const matchUsername = (user.username || '').toLowerCase().includes(q)
      const matchStudentId = (user.student_id || '').toLowerCase().includes(q)
      const matchFirstName = (user.first_name || '').toLowerCase().includes(q)
      const matchLastName = (user.last_name || '').toLowerCase().includes(q)
      const matchFullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(q)
      return matchUsername || matchStudentId || matchFirstName || matchLastName || matchFullName
    }
    return true
  })
})

// ==========================================
// 3. MULTI-GROUPING STATE & COMPUTED
// ==========================================
const groupByFaculty = ref(false)
const groupByMajor = ref(false)
const groupByRole = ref(false)

const hasActiveGrouping = computed(() => {
  return groupByFaculty.value || groupByMajor.value || groupByRole.value
})

const collapsedGroups = ref(new Set())

const toggleGroup = (groupKey) => {
  if (collapsedGroups.value.has(groupKey)) {
    collapsedGroups.value.delete(groupKey)
  } else {
    collapsedGroups.value.add(groupKey)
  }
}

const isGroupCollapsed = (groupKey) => {
  return collapsedGroups.value.has(groupKey)
}

const expandAllGroups = () => {
  collapsedGroups.value.clear()
}

const collapseAllGroups = () => {
  for (const group of groupedUsers.value) {
    collapsedGroups.value.add(group.key)
  }
}

// Grouped users computation
const groupedUsers = computed(() => {
  if (!hasActiveGrouping.value) return []

  const groupMap = new Map()

  for (const user of filteredUsers.value) {
    const keyParts = []
    const labels = []

    if (groupByFaculty.value) {
      const facName = user.faculty_name || 'ไม่ระบุคณะ'
      keyParts.push(`fac:${facName}`)
      labels.push({ type: 'faculty', icon: '🏢', label: facName })
    }

    if (groupByMajor.value) {
      const majName = user.major_name || 'ไม่ระบุสาขาวิชา'
      keyParts.push(`maj:${majName}`)
      labels.push({ type: 'major', icon: '🎓', label: majName })
    }

    if (groupByRole.value) {
      const roleName = user.role || 'ไม่ระบุสิทธิ์'
      keyParts.push(`role:${roleName}`)
      labels.push({ type: 'role', icon: '🔐', label: roleName })
    }

    const groupKey = keyParts.join(' ___ ')

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        key: groupKey,
        labels,
        users: []
      })
    }
    groupMap.get(groupKey).users.push(user)
  }

  return Array.from(groupMap.values())
})

const resetAllFiltersAndGrouping = () => {
  searchQuery.value = ''
  filterFaculty.value = ''
  filterMajor.value = ''
  filterRole.value = ''
  groupByFaculty.value = false
  groupByMajor.value = false
  groupByRole.value = false
  collapsedGroups.value.clear()
}

// ==========================================
// 4. USER CRUD METHODS
// ==========================================
const saveUser = async () => {
  isLoading.value = true
  try {
    const payload = {
      username: form.value.username,
      password: form.value.password,
      role: form.value.role,
      faculty_id: form.value.faculty_id || null
    }

    if (editingId.value) {
      await $fetch(`/api/admin/users/${editingId.value}`, {
        method: 'PUT',
        body: payload
      })
      alert('อัปเดตข้อมูลผู้ใช้งานสำเร็จ')
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
    alert('เกิดข้อผิดพลาด: ' + (error.data?.statusMessage || error.message))
  } finally {
    isLoading.value = false
  }
}

const startEdit = (user) => {
  editingId.value = user.user_id
  form.value = {
    username: user.username,
    password: '',
    role: user.role,
    faculty_id: user.faculty_id || ''
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const cancelEdit = () => {
  editingId.value = null
  form.value = { 
    username: '', 
    password: '', 
    role: '', 
    faculty_id: '' 
  }
}

const deleteUser = async (id) => {
  if (!confirm(`ยืนยันการลบผู้ใช้งาน ID: ${id} ?`)) return
  isLoading.value = true
  try {
    await $fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    alert('ลบข้อมูลผู้ใช้งานสำเร็จ')
    if (editingId.value === id) cancelEdit()
    refresh()
  } catch (error) {
    alert('เกิดข้อผิดพลาดในการลบ: ' + (error.data?.statusMessage || error.message))
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.admin-container {
  padding: 2rem;
  max-width: 1100px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #1e293b;
  background-color: #f8fafc;
  min-height: 100vh;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header h2 {
  margin: 0;
  font-size: 1.75rem;
  color: #0f172a;
}

.subtitle {
  margin: 0.35rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.back-link {
  color: #3b82f6;
  text-decoration: none;
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  transition: all 0.15s;
}
.back-link:hover {
  background: #eff6ff;
}

/* Cards */
.card {
  background: white;
  padding: 1.5rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  margin-bottom: 2rem;
}

.form-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.form-title-row h3 {
  margin: 0;
  font-size: 1.15rem;
  color: #1e293b;
}

.badge-editing {
  background: #fef3c7;
  color: #b45309;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

/* Form Styles */
.flex-form {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-item label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
}

.required {
  color: #ef4444;
}

.input-username { flex: 1 1 180px; }
.input-password { flex: 1 1 180px; }
.select-role { flex: 1 1 180px; }
.select-faculty { flex: 1 1 200px; }

.form-btn-group {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

input, select {
  padding: 0.55rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
}
input:focus, select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

button {
  padding: 0.55rem 1rem;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 600;
  font-size: 0.875rem;
  transition: background-color 0.15s;
}
button:hover:not(:disabled) {
  background-color: #059669;
}
button:disabled {
  background-color: #94a3b8;
  cursor: not-allowed;
}

.btn-update { background-color: #f59e0b; }
.btn-update:hover:not(:disabled) { background-color: #d97706; }

.btn-cancel { background-color: #64748b; }
.btn-cancel:hover:not(:disabled) { background-color: #475569; }

/* Control Card (Filters & Grouping) */
.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.control-header h3 {
  margin: 0;
  font-size: 1.15rem;
  color: #0f172a;
  display: inline-block;
}

.count-badge {
  background: #f1f5f9;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  margin-left: 0.5rem;
}

.btn-reset-filters {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
  font-size: 0.8rem;
  padding: 0.35rem 0.65rem;
}
.btn-reset-filters:hover {
  background: #e2e8f0;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.filter-col {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.search-col {
  grid-column: 1 / -1;
}

.filter-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
}

.input-search {
  width: 100%;
  box-sizing: border-box;
}

/* Grouping Bar */
.grouping-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.grouping-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.grouping-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #334155;
}

.grouping-options {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.checkbox-pill {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: white;
  border: 1px solid #cbd5e1;
  padding: 0.3rem 0.7rem;
  border-radius: 9999px;
  font-size: 0.825rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s;
}

.checkbox-pill input {
  cursor: pointer;
}

.checkbox-pill.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.grouping-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-group-toggle {
  background: white;
  color: #475569;
  border: 1px solid #cbd5e1;
  padding: 0.3rem 0.6rem;
  font-size: 0.775rem;
  border-radius: 6px;
}
.btn-group-toggle:hover {
  background: #e2e8f0;
}

/* Grouped View */
.grouped-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.group-block {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.group-header {
  background: #f8fafc;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  border-bottom: 1px solid #e2e8f0;
  user-select: none;
  transition: background-color 0.15s;
}
.group-header:hover {
  background: #f1f5f9;
}

.group-badges-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.group-toggle-icon {
  font-size: 0.8rem;
  color: #64748b;
  width: 16px;
}

.group-tag {
  font-size: 0.825rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
}
.tag-faculty { background: #dbeafe; color: #1e40af; }
.tag-major { background: #e0e7ff; color: #4338ca; }
.tag-role { background: #fef3c7; color: #b45309; }

.group-count {
  font-size: 0.825rem;
  color: #64748b;
  font-weight: 600;
}

.group-state-hint {
  font-size: 0.775rem;
  color: #94a3b8;
}

/* Table */
.table-responsive {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.data-table th {
  background-color: #f8fafc;
  color: #475569;
  font-weight: 600;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

.data-table td {
  border-bottom: 1px solid #f1f5f9;
  padding: 0.75rem 1rem;
  vertical-align: middle;
}

.data-table code {
  background: #f1f5f9;
  padding: 0.2rem 0.45rem;
  border-radius: 4px;
  font-size: 0.825rem;
  color: #334155;
}

.font-medium {
  font-weight: 600;
  color: #0f172a;
}

.text-muted {
  color: #94a3b8;
}

/* Role Badges */
.badge {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
}
.badge-admin { background-color: #fee2e2; color: #dc2626; }
.badge-student { background-color: #dbeafe; color: #1d4ed8; }
.badge-club_president { background-color: #fef3c7; color: #b45309; }
.badge-org_president { background-color: #e0e7ff; color: #4338ca; }

/* Action Buttons */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 0.4rem;
}

.btn-edit {
  background-color: #f59e0b;
  padding: 0.25rem 0.55rem;
  font-size: 0.775rem;
  border-radius: 4px;
}
.btn-edit:hover { background-color: #d97706; }

.btn-danger {
  background-color: #ef4444;
  padding: 0.25rem 0.55rem;
  font-size: 0.775rem;
  border-radius: 4px;
}
.btn-danger:hover { background-color: #dc2626; }

.text-center {
  text-align: center;
}

.empty-cell {
  padding: 3rem 1rem;
  color: #94a3b8;
}

.loading-state {
  text-align: center;
  color: #64748b;
  padding: 2.5rem;
}
</style>
