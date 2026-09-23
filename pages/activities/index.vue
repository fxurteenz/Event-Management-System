<template>
  <div class="activities-container">
    <!-- Navbar / Header -->
    <div class="top-nav">
      <div class="nav-brand">
        <h2>ระบบจัดการกิจกรรมนักศึกษา</h2>
      </div>
      <div class="nav-links">
        <NuxtLink to="/" class="nav-link">📅 ปฏิทินกิจกรรม (หน้าแรก)</NuxtLink>
        <NuxtLink v-if="isAdmin" to="/admin" class="nav-link">⚙️ ผู้ดูแลระบบ (Admin)</NuxtLink>
        <span v-if="currentUser" class="user-badge">
          👤 {{ currentUser.username }} ({{ currentUser.role }})
        </span>
        <button v-if="currentUser" @click="handleLogout" class="btn-logout">ออกจากระบบ</button>
        <NuxtLink v-else to="/login" class="btn-login-link">เข้าสู่ระบบ</NuxtLink>
      </div>
    </div>

    <div class="content-header">
      <div>
        <h1>รายการกิจกรรมทั้งหมด (Activities Management)</h1>
        <p class="subtitle">จัดการกิจกรรมสำหรับองค์การนักศึกษา</p>
      </div>

      <!-- ปุ่มสร้างกิจกรรม: แสดงเฉพาะองค์การนักศึกษา หรือ Admin -->
      <div class="actions">
        <button 
          v-if="canCreateActivity" 
          class="btn-create" 
          @click="openCreateModal"
        >
          ➕ สร้างกิจกรรมใหม่
        </button>
      </div>
    </div>

    <!-- แจ้งเตือนสิทธิ์สำหรับประธานสโมสรนักศึกษา -->
    <div v-if="userRole === 'club_president'" class="permission-notice notice-club">
      <p>🛡️ <strong>สิทธิ์ประธานสโมสรนักศึกษา:</strong> ท่านสามารถตรวจสอบและยืนยันรายชื่อนักศึกษาในสังกัด <strong>{{ currentUser.faculty_name ? (currentUser.faculty_name.startsWith('คณะ') ? currentUser.faculty_name : 'คณะ' + currentUser.faculty_name) : 'คณะที่ท่านดูแล' }}</strong> ได้ที่ปุ่ม <strong>"👥 ผู้ลงทะเบียน"</strong> ในแต่ละกิจกรรม</p>
    </div>

    <!-- แจ้งเตือนสิทธิ์การเข้าถึงสำหรับนักศึกษา/ผู้ใช้ทั่วไป -->
    <div v-else-if="!canCreateActivity" class="permission-notice">
      <p>ℹ️ <strong>สิทธิ์การใช้งาน:</strong> เฉพาะ <strong>นายกองค์การนักศึกษา (Org President)</strong> เท่านั้นที่สามารถสร้างกิจกรรมใหม่ได้</p>
      <p>นักศึกษาสามารถดูตารางกิจกรรมในรูปแบบปฏิทินได้ที่ <NuxtLink to="/">หน้าแรกของเว็บไซต์</NuxtLink></p>
    </div>

    <!-- Modal ฟอร์มสร้าง/แก้ไขกิจกรรม -->
    <div v-if="showCreateModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ editingActivityId ? 'แก้ไขข้อมูลกิจกรรม' : 'สร้างกิจกรรมใหม่' }}</h3>
          <button class="btn-close" @click="closeModal">&times;</button>
        </div>

        <form @submit.prevent="saveActivity" class="activity-form">
          <div class="form-group">
            <label>ชื่อกิจกรรม *</label>
            <input 
              type="text" 
              v-model="newActivity.title" 
              placeholder="ระบุชื่อกิจกรรม เช่น กิจกรรมรับน้องสร้างสรรค์ 2026" 
              required 
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>หมวดหมู่กิจกรรม *</label>
              <select v-model="newActivity.category_id" required>
                <option value="" disabled>-- เลือกหมวดหมู่ --</option>
                <option v-for="cat in categories" :key="cat.category_id" :value="cat.category_id">
                  {{ cat.category_name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>ชั่วโมงกิจกรรมที่ได้รับ (ชม.) *</label>
              <input 
                type="number" 
                v-model.number="newActivity.activity_hours" 
                min="1" 
                max="100" 
                required 
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>วัน-เวลาเริ่มต้น *</label>
              <input 
                type="datetime-local" 
                v-model="newActivity.start_time" 
                required 
              />
            </div>

            <div class="form-group">
              <label>วัน-เวลาสิ้นสุด *</label>
              <input 
                type="datetime-local" 
                v-model="newActivity.end_time" 
                required 
              />
            </div>
          </div>

          <!-- กำหนดจำนวนผู้เข้าร่วม -->
          <div class="form-group">
            <label>จำนวนผู้เข้าร่วมสูงสุด (คน)</label>
            <input 
              type="number" 
              v-model.number="newActivity.max_participants" 
              placeholder="เว้นว่างไว้หากไม่จำกัดจำนวนผู้เข้าร่วม" 
              min="1" 
            />
            <small class="hint-text">* เว้นว่างไว้หากสามารถเข้าร่วมได้ไม่จำกัดจำนวน</small>
          </div>

          <!-- กำหนดเงื่อนไขสิทธิ์คณะและสาขาวิชา (เลือกได้หลายคณะ/หลายสาขา) -->
          <div class="scope-selection-card">
            <h4>🎯 สิทธิ์คณะและสาขาวิชาที่สามารถเข้าร่วมได้</h4>

            <!-- 1. ตัวเลือกคณะ -->
            <div class="form-group mb-3">
              <div class="scope-header">
                <label>คณะที่สามารถเข้าร่วมได้:</label>
                <div class="scope-options-toggle">
                  <label class="radio-label">
                    <input type="radio" :value="true" v-model="scopeAllFaculties" @change="onToggleAllFaculties" />
                    🌍 ทุกคณะ (ไม่จำกัด)
                  </label>
                  <label class="radio-label">
                    <input type="radio" :value="false" v-model="scopeAllFaculties" />
                    🏢 ระบุคณะ (เลือกได้หลายคณะ)
                  </label>
                </div>
              </div>

              <!-- รายการ Checkbox คณะ -->
              <div v-if="!scopeAllFaculties" class="checkbox-box">
                <span class="hint-small">เลือกคณะที่เปิดรับสมัคร:</span>
                <div class="checkbox-grid">
                  <label 
                    v-for="fac in faculties" 
                    :key="fac.faculty_id" 
                    class="checkbox-item"
                    :class="{ 'item-checked': newActivity.target_faculty_ids.includes(fac.faculty_id) }"
                  >
                    <input 
                      type="checkbox" 
                      :value="fac.faculty_id" 
                      v-model="newActivity.target_faculty_ids"
                      @change="onFacultySelectionChange"
                    />
                    <span>{{ fac.faculty_name }}</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- 2. ตัวเลือกสาขาวิชา -->
            <div class="form-group">
              <div class="scope-header">
                <label>สาขาวิชาที่สามารถเข้าร่วมได้:</label>
                <div class="scope-options-toggle">
                  <label class="radio-label">
                    <input type="radio" :value="true" v-model="scopeAllMajors" @change="newActivity.target_major_ids = []" />
                    📚 ทุกสาขาวิชา (ไม่จำกัด)
                  </label>
                  <label class="radio-label">
                    <input type="radio" :value="false" v-model="scopeAllMajors" />
                    🎓 ระบุสาขาวิชา (เลือกได้หลายสาขา)
                  </label>
                </div>
              </div>

              <!-- รายการ Checkbox สาขาวิชา -->
              <div v-if="!scopeAllMajors" class="checkbox-box">
                <span class="hint-small">เลือกสาขาวิชาที่เปิดรับสมัคร:</span>
                <div class="checkbox-grid">
                  <label 
                    v-for="maj in selectableMajors" 
                    :key="maj.major_id" 
                    class="checkbox-item"
                    :class="{ 'item-checked': newActivity.target_major_ids.includes(maj.major_id) }"
                  >
                    <input 
                      type="checkbox" 
                      :value="maj.major_id" 
                      v-model="newActivity.target_major_ids" 
                    />
                    <span>{{ maj.major_name }} <small class="text-muted">({{ maj.faculty_name }})</small></span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>รายละเอียดกิจกรรม</label>
            <textarea 
              v-model="newActivity.description" 
              rows="3" 
              placeholder="รายละเอียด เงื่อนไข หรือสถานที่จัดกิจกรรม..."
            ></textarea>
          </div>

          <!-- แจ้งเตือนกรณีเลือกกิจกรรมบังคับ -->
          <div v-if="isMandatorySelected" class="mandatory-notice-box">
            ⚡ <strong>ระบบลงทะเบียนอัตโนมัติ (กิจกรรมบังคับ):</strong> เมื่อบันทึกกิจกรรม ระบบจะเพิ่มรายชื่อและ <strong>ยืนยันสถานะสิทธิ์ (Confirmed)</strong> ให้นักศึกษาในสังกัดคณะ/สาขาวิชาที่ระบุทันที และนักศึกษาจะไม่สามารถยกเลิกกิจกรรมนี้ได้
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" @click="closeModal">ยกเลิก</button>
            <button type="submit" class="btn-submit" :disabled="isSubmitting">
              {{ isSubmitting ? 'กำลังบันทึก...' : (editingActivityId ? 'บันทึกการแก้ไข' : 'ยืนยันสร้างกิจกรรม') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- รายการกิจกรรม -->
    <div class="card">
      <p v-if="pending">กำลังโหลดข้อมูลกิจกรรม...</p>
      
      <div v-else class="grid">
        <div v-for="act in activities" :key="act.activity_id" class="activity-card">
          <div class="card-top">
            <span class="badge">{{ act.category_name || 'กิจกรรมทั่วไป' }}</span>
            <span class="hours-badge">⭐ {{ act.activity_hours }} ชั่วโมง</span>
          </div>

          <h3>{{ act.title }}</h3>
          <p v-if="act.description" class="desc">{{ act.description }}</p>

          <div class="datetime-info">
            <p>🕒 <strong>เริ่ม:</strong> {{ formatDateTime(act.start_time) }}</p>
            <p>⏳ <strong>สิ้นสุด:</strong> {{ formatDateTime(act.end_time) }}</p>
          </div>

          <!-- ข้อมูลเงื่อนไขจำนวนและคณะ/สาขา -->
          <div class="scope-info">
            <p>
              👥 <strong>จำนวนรับ:</strong> 
              <span class="val-pill">
                {{ act.max_participants ? act.max_participants + ' คน' : 'ไม่จำกัดจำนวน' }}
              </span>
            </p>
            <div class="scope-line">
              <span class="scope-title">🎯 <strong>สิทธิ์เข้าร่วม:</strong></span>
              <div class="scope-tags">
                <span v-if="(!act.target_faculties || act.target_faculties.length === 0) && (!act.target_majors || act.target_majors.length === 0)" class="scope-badge scope-all">
                  🌍 ทุกคณะและสาขา
                </span>
                <template v-else>
                  <span v-for="fac in act.target_faculties" :key="'f-'+fac.faculty_id" class="scope-badge scope-faculty">
                    🏢 {{ fac.faculty_name }}
                  </span>
                  <span v-for="maj in act.target_majors" :key="'m-'+maj.major_id" class="scope-badge scope-major">
                    🎓 {{ maj.major_name }}
                  </span>
                </template>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <span class="qr-label">รหัส QR: <code>{{ act.qr_code_data }}</code></span>
            <div class="card-actions">
              <button 
                v-if="canManageRegistrations" 
                class="btn-registrations" 
                @click="openRegistrationsModal(act)"
              >
                👥 ผู้ลงทะเบียน ({{ act.registered_count || 0 }})
              </button>
              <button v-if="canCreateActivity" class="btn-edit" @click="openEditModal(act)">แก้ไข</button>
              <button v-if="canCreateActivity" class="btn-delete" @click="deleteActivity(act.activity_id)">ลบ</button>
            </div>
          </div>
        </div>

        <div v-if="activities.length === 0" class="empty-state">
          <h3>ยังไม่มีกิจกรรมในระบบ</h3>
          <p v-if="canCreateActivity">กดปุ่ม <strong>"+ สร้างกิจกรรมใหม่"</strong> ด้านบนเพื่อเพิ่มกิจกรรมแรก</p>
        </div>
      </div>
    </div>

    <!-- Modal จัดการรายชื่อผู้ลงทะเบียน (สำหรับ Org President & Club President) -->
    <div v-if="showRegistrationsModal" class="modal-backdrop" @click.self="showRegistrationsModal = false">
      <div class="modal-card modal-card-lg">
        <div class="modal-header">
          <div>
            <h3>รายชื่อผู้ลงทะเบียน: {{ currentManagingActivity?.title }}</h3>
            <p class="subtitle-small">
              ชั่วโมงกิจกรรม: {{ currentManagingActivity?.activity_hours }} ชม. | 
              จำนวนรับ: {{ currentManagingActivity?.max_participants ? currentManagingActivity?.max_participants + ' คน' : 'ไม่จำกัด' }} | 
              ผู้เข้าร่วมปัจจุบัน: {{ activeRegistrationsCount }} คน
            </p>
          </div>
          <button class="btn-close" @click="showRegistrationsModal = false">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Club President Scope Notice -->
          <div v-if="userRole === 'club_president'" class="role-scope-alert">
            🛡️ <strong>มุมมองประธานสโมสร:</strong> ระบบแสดงเฉพาะรายชื่อนักศึกษาในสังกัด <strong>{{ currentUser.faculty_name ? (currentUser.faculty_name.startsWith('คณะ') ? currentUser.faculty_name : 'คณะ' + currentUser.faculty_name) : 'คณะของท่าน' }}</strong> ตามสิทธิ์การดูแล
          </div>
          <div v-else class="role-scope-alert alert-admin">
            🌐 <strong>มุมมององค์การนักศึกษา / ผู้ดูแลระบบ:</strong> แสดงรายชื่อผู้ลงทะเบียนทั้งหมดทุกคณะ
          </div>

          <!-- Filter Tabs -->
          <div v-if="!loadingRegistrations && registrationsList.length > 0" class="reg-filter-tabs">
            <button 
              type="button" 
              class="reg-tab-btn" 
              :class="{ active: registrationStatusFilter === 'active' }"
              @click="registrationStatusFilter = 'active'"
            >
              ✅ ผู้เข้าร่วมปัจจุบัน ({{ activeRegistrationsCount }})
            </button>
            <button 
              type="button" 
              class="reg-tab-btn" 
              :class="{ active: registrationStatusFilter === 'all' }"
              @click="registrationStatusFilter = 'all'"
            >
              📋 ทั้งหมด ({{ registrationsList.length }})
            </button>
            <button 
              type="button" 
              class="reg-tab-btn" 
              :class="{ active: registrationStatusFilter === 'cancelled' }"
              @click="registrationStatusFilter = 'cancelled'"
            >
              ❌ ยกเลิกแล้ว ({{ cancelledRegistrationsCount }})
            </button>
          </div>

          <div v-if="loadingRegistrations" class="loading-box">กำลังโหลดรายชื่อผู้ลงทะเบียน...</div>

          <div v-else-if="displayedRegistrations.length === 0" class="empty-registrations">
            <p v-if="registrationsList.length === 0">ยังไม่มีรายชื่อนักศึกษาลงทะเบียนในส่วนนี้</p>
            <p v-else>ไม่มีข้อมูลในตัวกรองที่เลือก</p>
          </div>

          <div v-else class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>รหัสนักศึกษา</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>คณะ</th>
                  <th>สาขาวิชา</th>
                  <th>วันที่ลงทะเบียน</th>
                  <th>สถานะ</th>
                  <th>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="reg in displayedRegistrations" :key="reg.registration_id">
                  <td><code>{{ reg.student_id }}</code></td>
                  <td>{{ reg.first_name }} {{ reg.last_name }}</td>
                  <td>{{ reg.faculty_name || '-' }}</td>
                  <td>{{ reg.major_name || '-' }}</td>
                  <td>{{ formatDateTime(reg.registered_at) }}</td>
                  <td>
                    <span class="status-pill" :class="'status-' + (reg.status || '').toLowerCase()">
                      {{ (reg.status || '').toLowerCase() === 'confirmed' ? '✅ ยืนยันแล้ว' : ((reg.status || '').toLowerCase() === 'cancelled' ? '❌ ยกเลิก' : '⏳ รอการยืนยัน') }}
                    </span>
                  </td>
                  <td>
                    <div class="action-btns">
                      <button 
                        v-if="(reg.status || '').toLowerCase() !== 'confirmed'"
                        class="btn-act-confirm" 
                        @click="updateRegistrationStatus(reg.registration_id, 'confirmed')"
                      >
                        ยืนยัน
                      </button>
                      <button 
                        v-if="(reg.status || '').toLowerCase() === 'confirmed' && !isCurrentManagingActivityMandatory"
                        class="btn-act-revert" 
                        @click="updateRegistrationStatus(reg.registration_id, 'registered')"
                        title="ย้อนสถานะกลับเป็นรอการยืนยัน"
                      >
                        ยกเลิกการยืนยัน
                      </button>
                      <button 
                        v-if="(reg.status || '').toLowerCase() !== 'cancelled'"
                        class="btn-act-cancel" 
                        @click="updateRegistrationStatus(reg.registration_id, 'cancelled')"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const authCookie = useCookie('auth_user')
const currentUser = computed(() => authCookie.value || null)

const userRole = computed(() => (currentUser.value?.role || '').toLowerCase())
const canCreateActivity = computed(() => userRole.value === 'org_president' || userRole.value === 'admin')
const isAdmin = computed(() => userRole.value === 'admin')
const canManageRegistrations = computed(() => ['org_president', 'admin', 'club_president'].includes(userRole.value))

// Registration management state
const showRegistrationsModal = ref(false)
const currentManagingActivity = ref(null)
const registrationsList = ref([])
const loadingRegistrations = ref(false)
const registrationStatusFilter = ref('active')

const activeRegistrationsCount = computed(() => {
  return registrationsList.value.filter(r => (r.status || '').toLowerCase() !== 'cancelled').length
})

const cancelledRegistrationsCount = computed(() => {
  return registrationsList.value.filter(r => (r.status || '').toLowerCase() === 'cancelled').length
})

const displayedRegistrations = computed(() => {
  if (registrationStatusFilter.value === 'active') {
    return registrationsList.value.filter(r => (r.status || '').toLowerCase() !== 'cancelled')
  }
  if (registrationStatusFilter.value === 'cancelled') {
    return registrationsList.value.filter(r => (r.status || '').toLowerCase() === 'cancelled')
  }
  return registrationsList.value
})

const isCurrentManagingActivityMandatory = computed(() => {
  if (!currentManagingActivity.value) return false
  const catId = Number(currentManagingActivity.value.category_id)
  const catName = currentManagingActivity.value.category_name || ''
  return catId === 1 || catName.includes('บังคับ')
})

const openRegistrationsModal = async (act) => {
  currentManagingActivity.value = act
  registrationStatusFilter.value = 'active'
  showRegistrationsModal.value = true
  await fetchRegistrations()
}

const fetchRegistrations = async () => {
  if (!currentManagingActivity.value) return
  loadingRegistrations.value = true
  try {
    const params = new URLSearchParams({
      activity_id: currentManagingActivity.value.activity_id,
      role: userRole.value,
      faculty_id: currentUser.value?.faculty_id || ''
    })
    const res = await $fetch(`/api/activities/registrations?${params.toString()}`)
    registrationsList.value = res.data || []
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการโหลดรายชื่อ: ' + (err.data?.statusMessage || err.message))
  } finally {
    loadingRegistrations.value = false
  }
}

const updateRegistrationStatus = async (regId, status) => {
  try {
    await $fetch(`/api/activities/registrations/${regId}`, {
      method: 'PUT',
      body: {
        status,
        role: userRole.value,
        faculty_id: currentUser.value?.faculty_id || null
      }
    })
    await fetchRegistrations()
    refresh()
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: ' + (err.data?.statusMessage || err.message))
  }
}

const handleLogout = () => {
  authCookie.value = null
  const router = useRouter()
  router.push('/login')
}

// Fetch activities
const { data: apiResponse, pending, refresh } = await useFetch('/api/activities')
const activities = computed(() => apiResponse.value?.data || [])

// Fetch categories
const { data: catResponse } = await useFetch('/api/categories')
const categories = computed(() => catResponse.value?.data || [])

// Fetch Faculties & Majors for targeting
const { data: facResponse } = await useFetch('/api/admin/faculties')
const faculties = computed(() => facResponse.value?.data || [])

const { data: majResponse } = await useFetch('/api/admin/majors')
const majors = computed(() => majResponse.value?.data || [])

const showCreateModal = ref(false)
const editingActivityId = ref(null)
const isSubmitting = ref(false)

const scopeAllFaculties = ref(true)
const scopeAllMajors = ref(true)

const newActivity = ref({
  title: '',
  description: '',
  category_id: '',
  activity_hours: 3,
  start_time: '',
  end_time: '',
  max_participants: null,
  target_faculty_ids: [],
  target_major_ids: []
})

// Majors selectable: if specific faculties chosen, only show majors in those faculties; otherwise all
const selectableMajors = computed(() => {
  if (scopeAllFaculties.value || newActivity.value.target_faculty_ids.length === 0) {
    return majors.value
  }
  return majors.value.filter(m => newActivity.value.target_faculty_ids.includes(Number(m.faculty_id)))
})

const onToggleAllFaculties = () => {
  newActivity.value.target_faculty_ids = []
}

const onFacultySelectionChange = () => {
  // If specific faculties are selected, remove any selected majors that don't belong to them
  if (newActivity.value.target_faculty_ids.length > 0) {
    newActivity.value.target_major_ids = newActivity.value.target_major_ids.filter(mid => {
      const maj = majors.value.find(m => Number(m.major_id) === Number(mid))
      return maj && newActivity.value.target_faculty_ids.includes(Number(maj.faculty_id))
    })
  }
}

// Convert ISO / DB date to YYYY-MM-DDTHH:mm for datetime-local input
const toDateTimeLocal = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

const openCreateModal = () => {
  editingActivityId.value = null
  scopeAllFaculties.value = true
  scopeAllMajors.value = true
  newActivity.value = {
    title: '',
    description: '',
    category_id: '',
    activity_hours: 3,
    start_time: '',
    end_time: '',
    max_participants: null,
    target_faculty_ids: [],
    target_major_ids: []
  }
  showCreateModal.value = true
}

const openEditModal = (act) => {
  editingActivityId.value = act.activity_id
  const facIds = (act.target_faculties || []).map(f => Number(f.faculty_id))
  const majIds = (act.target_majors || []).map(m => Number(m.major_id))

  scopeAllFaculties.value = facIds.length === 0
  scopeAllMajors.value = majIds.length === 0

  newActivity.value = {
    title: act.title || '',
    description: act.description || '',
    category_id: act.category_id || '',
    activity_hours: act.activity_hours || 3,
    start_time: toDateTimeLocal(act.start_time),
    end_time: toDateTimeLocal(act.end_time),
    max_participants: act.max_participants || null,
    target_faculty_ids: facIds,
    target_major_ids: majIds
  }
  showCreateModal.value = true
}

const closeModal = () => {
  showCreateModal.value = false
  editingActivityId.value = null
}

const isMandatorySelected = computed(() => {
  if (!newActivity.value.category_id) return false
  const cat = categories.value.find(c => Number(c.category_id) === Number(newActivity.value.category_id))
  return cat ? (Number(cat.category_id) === 1 || (cat.category_name || '').includes('บังคับ')) : false
})

const saveActivity = async () => {
  if (!canCreateActivity.value) {
    alert('คุณไม่มีสิทธิ์ในการจัดการกิจกรรม')
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      ...newActivity.value,
      target_faculty_ids: scopeAllFaculties.value ? [] : newActivity.value.target_faculty_ids,
      target_major_ids: scopeAllMajors.value ? [] : newActivity.value.target_major_ids
    }

    if (editingActivityId.value) {
      const res = await $fetch(`/api/activities/${editingActivityId.value}`, {
        method: 'PUT',
        body: payload
      })
      alert(res?.message || 'อัปเดตข้อมูลกิจกรรมเรียบร้อยแล้ว!')
    } else {
      const res = await $fetch('/api/activities', {
        method: 'POST',
        body: payload
      })
      alert(res?.message || 'สร้างกิจกรรมเรียบร้อยแล้ว!')
    }
    closeModal()
    refresh()
  } catch (error) {
    alert('เกิดข้อผิดพลาด: ' + (error.data?.statusMessage || error.message))
  } finally {
    isSubmitting.value = false
  }
}

const deleteActivity = async (id) => {
  if (!confirm('ต้องการลบกิจกรรมนี้หรือไม่?')) return
  try {
    await $fetch(`/api/activities/${id}`, { method: 'DELETE' })
    alert('ลบกิจกรรมสำเร็จ')
    refresh()
  } catch (error) {
    alert('เกิดข้อผิดพลาดในการลบ: ' + (error.data?.statusMessage || error.message))
  }
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}
</script>

<style scoped>
.activities-container {
  padding: 1.5rem 2rem 3rem;
  max-width: 1100px;
  margin: 0 auto;
  font-family: sans-serif;
  background-color: #f9fafb;
  min-height: 100vh;
}

.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.nav-brand h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #1f2937;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.nav-link {
  color: #4f46e5;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
}
.nav-link:hover {
  text-decoration: underline;
}

.user-badge {
  background: #f3f4f6;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.85rem;
  color: #374151;
}

.btn-logout {
  background: #fee2e2;
  color: #dc2626;
  border: none;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-login-link {
  background: #4f46e5;
  color: white;
  text-decoration: none;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.content-header h1 {
  margin: 0 0 0.25rem;
  font-size: 1.75rem;
  color: #111827;
}

.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 0.95rem;
}

.btn-create {
  background-color: #4f46e5;
  color: white;
  padding: 0.65rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s;
}
.btn-create:hover {
  background-color: #4338ca;
}

.permission-notice {
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
  color: #1e40af;
  font-size: 0.9rem;
}
.permission-notice p {
  margin: 0.25rem 0;
}
.permission-notice a {
  color: #2563eb;
  font-weight: 600;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.activity-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.06);
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.badge {
  background-color: #e0e7ff;
  color: #4338ca;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
}

.hours-badge {
  background-color: #d1fae5;
  color: #065f46;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
}

.activity-card h3 {
  margin: 0 0 0.5rem;
  font-size: 1.2rem;
  color: #1f2937;
}

.desc {
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.4;
  margin: 0 0 1rem;
  flex-grow: 1;
}

.datetime-info {
  background: #f9fafb;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  color: #4b5563;
}
.datetime-info p {
  margin: 0.25rem 0;
}

.scope-info {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.825rem;
  color: #334155;
}
.scope-info p {
  margin: 0.25rem 0;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.val-pill {
  font-weight: 600;
  color: #0f172a;
}

.scope-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
}
.scope-all {
  background: #dcfce7;
  color: #15803d;
}
.scope-faculty {
  background: #fef3c7;
  color: #b45309;
}
.scope-major {
  background: #e0e7ff;
  color: #4338ca;
}

.scope-line {
  margin-top: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.scope-title {
  color: #475569;
}
.scope-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

/* Modal Multi-selection styling */
.scope-selection-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
}
.scope-selection-card h4 {
  margin: 0 0 0.85rem;
  font-size: 0.95rem;
  color: #1e293b;
}

.scope-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.scope-header label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
}

.scope-options-toggle {
  display: flex;
  gap: 0.75rem;
}
.radio-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: #475569;
  cursor: pointer;
}
.radio-label input {
  cursor: pointer;
}

.checkbox-box {
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.75rem;
  max-height: 180px;
  overflow-y: auto;
}
.hint-small {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.4rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  background: #fafafa;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.15s;
}
.checkbox-item:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}
.checkbox-item.item-checked {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
  font-weight: 600;
}
.checkbox-item input {
  width: auto;
  margin: 0;
  cursor: pointer;
}

.text-muted {
  color: #64748b;
  font-size: 0.75rem;
}
.mb-3 {
  margin-bottom: 0.75rem;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid #f3f4f6;
}

.qr-label {
  font-size: 0.75rem;
  color: #9ca3af;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.btn-edit {
  background-color: #fef3c7;
  color: #b45309;
  border: 1px solid #fde68a;
  padding: 0.3rem 0.65rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s;
}
.btn-edit:hover {
  background-color: #fde68a;
}

.btn-delete {
  background-color: #fee2e2;
  color: #b91c1c;
  border: none;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
}
.btn-delete:hover {
  background-color: #fecaca;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
  color: #6b7280;
}

/* Modal Styles */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-card {
  background: white;
  border-radius: 10px;
  width: 100%;
  max-width: 580px;
  max-height: 90vh;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}
.modal-header h3 {
  margin: 0;
  color: #111827;
}
.btn-close {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
}

.activity-form {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #374151;
}

.hint-text {
  font-size: 0.75rem;
  color: #64748b;
}

input, select, textarea {
  padding: 0.55rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
  font-family: inherit;
}
input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}

.btn-submit {
  background: #4f46e5;
  color: white;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}
.btn-submit:disabled {
  background: #9ca3af;
}

/* Registration Modal & Table Styles */
.btn-registrations {
  background-color: #0284c7;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}
.btn-registrations:hover {
  background-color: #0369a1;
}

.modal-card-lg {
  max-width: 900px;
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.subtitle-small {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0.25rem 0 0 0;
}

.modal-body {
  padding: 1.25rem;
  overflow-y: auto;
}

.role-scope-alert {
  background-color: #eff6ff;
  border-left: 4px solid #3b82f6;
  color: #1e40af;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1.25rem;
  font-size: 0.88rem;
}
.alert-admin {
  background-color: #f0fdf4;
  border-left-color: #22c55e;
  color: #166534;
}

.loading-box, .empty-registrations {
  text-align: center;
  padding: 2.5rem 1rem;
  color: #6b7280;
  font-size: 0.95rem;
}

.table-responsive {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.88rem;
}

.data-table th {
  background-color: #f8fafc;
  color: #475569;
  font-weight: 600;
  padding: 0.75rem 0.85rem;
  border-bottom: 1px solid #e2e8f0;
}

.data-table td {
  padding: 0.75rem 0.85rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.data-table code {
  background-color: #f1f5f9;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.82rem;
  color: #334155;
}

.status-pill {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 500;
}
.status-confirmed {
  background-color: #dcfce7;
  color: #15803d;
}
.status-registered {
  background-color: #fef9c3;
  color: #a16207;
}
.status-cancelled {
  background-color: #fee2e2;
  color: #b91c1c;
}

.action-btns {
  display: flex;
  gap: 0.4rem;
}

.btn-act-confirm {
  background-color: #10b981;
  color: white;
  border: none;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
}
.btn-act-confirm:hover {
  background-color: #059669;
}

.btn-act-revert {
  background-color: #f59e0b;
  color: white;
  border: none;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
}
.btn-act-revert:hover {
  background-color: #d97706;
}

.btn-act-cancel {
  background-color: #ef4444;
  color: white;
  border: none;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
}
.btn-act-cancel:hover {
  background-color: #dc2626;
}

/* Modal Filter Tabs */
.reg-filter-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.75rem;
  flex-wrap: wrap;
}

.reg-tab-btn {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.reg-tab-btn:hover {
  background: #e2e8f0;
}

.reg-tab-btn.active {
  background: #2563eb;
  color: white;
  border-color: #1d4ed8;
}

.mandatory-notice-box {
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-left: 4px solid #f59e0b;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #92400e;
  line-height: 1.45;
  margin-bottom: 1.25rem;
}
</style>
