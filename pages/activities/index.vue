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

        <!-- Page Header & Action Controls -->
        <div class="content-header">
            <div>
                <h1>รายการกิจกรรมทั้งหมด (Activities Management)</h1>
                <p class="subtitle">จัดการกิจกรรมสำหรับองค์การนักศึกษาและสโมสรนักศึกษา</p>
            </div>

            <!-- ปุ่มสร้างกิจกรรม: แสดงเฉพาะองค์การนักศึกษา หรือ Admin -->
            <div class="actions">
                <button v-if="canCreateActivity" class="btn-create" @click="openCreateModal">
                    ➕ สร้างกิจกรรมใหม่
                </button>
            </div>
        </div>

        <!-- แจ้งเตือนสิทธิ์สำหรับประธานสโมสรนักศึกษา -->
        <div v-if="userRole === 'club_president'" class="permission-notice notice-club">
            <p>🛡️ <strong>สิทธิ์ประธานสโมสรนักศึกษา:</strong> ท่านสามารถตรวจสอบและยืนยันรายชื่อนักศึกษาในสังกัด
                <strong>{{ userFacultyName }}</strong> ได้ที่ปุ่ม <strong>"👥 ผู้ลงทะเบียน"</strong> ในแต่ละกิจกรรม
            </p>
        </div>

        <!-- แจ้งเตือนสิทธิ์การเข้าถึงสำหรับนักศึกษา/ผู้ใช้ทั่วไป -->
        <div v-else-if="!canCreateActivity" class="permission-notice">
            <p>ℹ️ <strong>สิทธิ์การใช้งาน:</strong> เฉพาะ <strong>นายกองค์การนักศึกษา (Org President)</strong> หรือ
                <strong>ผู้ดูแลระบบ</strong> เท่านั้นที่สามารถสร้างกิจกรรมใหม่ได้
            </p>
            <p>นักศึกษาสามารถดูตารางกิจกรรมในรูปแบบปฏิทินได้ที่ <NuxtLink to="/">หน้าแรกของเว็บไซต์</NuxtLink>
            </p>
        </div>

        <!-- Component: Activity Form Modal (Create / Edit) -->
        <ActivityFormModal :show="showCreateModal" :editing-activity-id="editingActivityId"
            :initial-data="formInitialData" :categories="categories" :faculties="faculties" :majors="majors"
            :is-submitting="isSubmitting" @close="closeModal" @save="saveActivity" />

        <!-- Component: Activity Registrations Modal (Manage Students & Bulk Actions) -->
        <ActivityRegistrationsModal :show="showRegistrationsModal" :activity="currentManagingActivity"
            :user-role="userRole" :current-user="currentUser" :faculties="faculties" :majors="majors"
            @close="closeRegistrationsModal" @updated="refresh" />

        <!-- รายการกิจกรรม (Activity Cards Grid) -->
        <div class="card">
            <!-- Loading State: แสดงเฉพาะเมื่อยังไม่มีข้อมูลและกำลังโหลดครั้งแรก -->
            <div v-if="pending && activities.length === 0" class="loading-state">
                <div class="spinner"></div>
                <p>กำลังโหลดข้อมูลกิจกรรม...</p>
            </div>

            <!-- Empty State: แสดงเมื่อโหลดเสร็จแล้วและไม่มีกิจกรรม -->
            <div v-else-if="!pending && activities.length === 0" class="empty-state">
                <h3>ยังไม่มีกิจกรรมในระบบ</h3>
                <p v-if="canCreateActivity">กดปุ่ม <strong>"+ สร้างกิจกรรมใหม่"</strong> ด้านบนเพื่อเพิ่มกิจกรรมแรก</p>
            </div>

            <!-- Activity Cards Grid: แสดงเมื่อมีข้อมูลกิจกรรมเสมอ (ไม่หายไปขณะรีเฟรชหรือ Hydrate) -->
            <div v-else class="grid-wrapper">
                <div v-if="pending" class="refreshing-indicator">
                    <div class="refresh-spinner"></div>
                    <span>กำลังอัปเดตข้อมูลกิจกรรม...</span>
                </div>

                <div class="grid">
                    <!-- Component: Activity Card -->
                    <ActivityCard v-for="act in activities" :key="act.activity_id" :activity="act"
                        :can-create-activity="canCreateActivity" :can-manage-registrations="canManageRegistrations"
                        @manage-registrations="openRegistrationsModal" @edit="openEditModal" @delete="deleteActivity" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ActivityCard from '~/components/activities/ActivityCard.vue'
import ActivityFormModal from '~/components/activities/ActivityFormModal.vue'
import ActivityRegistrationsModal from '~/components/activities/ActivityRegistrationsModal.vue'

const authCookie = useCookie('auth_user')
const currentUser = computed(() => authCookie.value || null)
const userRole = computed(() => (currentUser.value?.role || '').toLowerCase())
const canCreateActivity = computed(() => userRole.value === 'org_president' || userRole.value === 'admin')
const isAdmin = computed(() => userRole.value === 'admin')
const canManageRegistrations = computed(() => ['org_president', 'admin', 'club_president'].includes(userRole.value))

const userFacultyName = computed(() => {
    if (!currentUser.value?.faculty_name) return 'คณะของท่าน'
    return currentUser.value.faculty_name.startsWith('คณะ')
        ? currentUser.value.faculty_name
        : 'คณะ' + currentUser.value.faculty_name
})

// Fetch Activities with explicit key and safe fallback
const { data: apiResponse, pending, refresh } = await useFetch('/api/activities', {
    key: 'activities-list',
    default: () => ({ success: true, data: [] })
})
const activities = computed(() => apiResponse.value?.data || [])

// Fetch Categories
const { data: catResponse } = await useFetch('/api/categories', {
    key: 'activity-categories',
    default: () => ({ success: true, data: [] })
})
const categories = computed(() => catResponse.value?.data || [])

// Fetch Faculties & Majors for Targeting & Filtering
const { data: facResponse } = await useFetch('/api/admin/faculties', {
    key: 'activity-faculties',
    default: () => ({ success: true, data: [] })
})
const faculties = computed(() => facResponse.value?.data || [])

const { data: majResponse } = await useFetch('/api/admin/majors', {
    key: 'activity-majors',
    default: () => ({ success: true, data: [] })
})
const majors = computed(() => majResponse.value?.data || [])

// Create/Edit Activity Form Modal State
const showCreateModal = ref(false)
const editingActivityId = ref(null)
const formInitialData = ref({})
const isSubmitting = ref(false)

// Registrations Management Modal State
const showRegistrationsModal = ref(false)
const currentManagingActivity = ref(null)

const openRegistrationsModal = (act) => {
    currentManagingActivity.value = act
    showRegistrationsModal.value = true
}

const closeRegistrationsModal = () => {
    showRegistrationsModal.value = false
    currentManagingActivity.value = null
}

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
    formInitialData.value = {}
    showCreateModal.value = true
}

const openEditModal = (act) => {
    editingActivityId.value = act.activity_id
    formInitialData.value = {
        title: act.title || '',
        description: act.description || '',
        category_id: act.category_id || '',
        activity_hours: act.activity_hours || 3,
        start_time: toDateTimeLocal(act.start_time),
        end_time: toDateTimeLocal(act.end_time),
        max_participants: act.max_participants || null,
        target_faculty_ids: (act.target_faculties || []).map(f => Number(f.faculty_id)),
        target_major_ids: (act.target_majors || []).map(m => Number(m.major_id))
    }
    showCreateModal.value = true
}

const closeModal = () => {
    showCreateModal.value = false
    editingActivityId.value = null
    formInitialData.value = {}
}

const saveActivity = async (payload) => {
    if (!canCreateActivity.value) {
        alert('คุณไม่มีสิทธิ์ในการจัดการกิจกรรม')
        return
    }

    isSubmitting.value = true
    try {
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

const handleLogout = () => {
    authCookie.value = null
    const router = useRouter()
    router.push('/login')
}
</script>

<style scoped>
.activities-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
}

/* Navbar */
.top-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.nav-brand h2 {
    margin: 0;
    font-size: 1.35rem;
    color: #0f172a;
}

.nav-links {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.nav-link {
    text-decoration: none;
    color: #475569;
    font-size: 0.92rem;
    font-weight: 500;
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.nav-link:hover {
    background-color: #f1f5f9;
    color: #1e293b;
}

.user-badge {
    background: #e2e8f0;
    color: #334155;
    padding: 0.35rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.82rem;
    font-weight: 500;
}

.btn-logout {
    background: #fee2e2;
    color: #dc2626;
    border: 1px solid #fecaca;
    padding: 0.4rem 0.85rem;
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-logout:hover {
    background: #fca5a5;
}

.btn-login-link {
    background: #2563eb;
    color: white;
    text-decoration: none;
    padding: 0.45rem 1rem;
    border-radius: 6px;
    font-size: 0.88rem;
    font-weight: 500;
    transition: background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-login-link:hover {
    background: #1d4ed8;
}

/* Header */
.content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.content-header h1 {
    margin: 0;
    font-size: 1.6rem;
    color: #0f172a;
}

.subtitle {
    margin: 0.35rem 0 0 0;
    color: #64748b;
    font-size: 0.95rem;
}

.btn-create {
    background-color: #2563eb;
    color: white;
    border: none;
    padding: 0.65rem 1.25rem;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-create:hover {
    background-color: #1d4ed8;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
}

/* Permission Notice */
.permission-notice {
    background-color: #eff6ff;
    border-left: 4px solid #3b82f6;
    padding: 0.85rem 1.25rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    color: #1e40af;
    font-size: 0.92rem;
    line-height: 1.5;
}

.permission-notice p {
    margin: 0.25rem 0;
}

.notice-club {
    background-color: #f0fdf4;
    border-left-color: #22c55e;
    color: #166534;
}

/* Grid & Cards */
.card {
    background: transparent;
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 1.5rem;
}

.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 1rem;
    color: #64748b;
    gap: 1rem;
}

.spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e2e8f0;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 4rem 1.5rem;
    background: white;
    border: 2px dashed #cbd5e1;
    border-radius: 12px;
    color: #64748b;
}

.empty-state h3 {
    margin: 0 0 0.5rem 0;
    color: #334155;
    font-size: 1.25rem;
}

.grid-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.refreshing-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    font-size: 0.82rem;
    color: #166534;
    align-self: flex-start;
    animation: fadeIn 0.2s ease-in;
}

.refresh-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid #bbf7d0;
    border-top-color: #16a34a;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-4px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (max-width: 768px) {
    .top-nav {
        flex-direction: column;
        align-items: flex-start;
    }

    .grid {
        grid-template-columns: 1fr;
    }
}
</style>
