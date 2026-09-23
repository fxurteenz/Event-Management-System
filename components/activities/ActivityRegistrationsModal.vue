<template>
    <Transition name="modal">
        <div v-if="show" class="modal-backdrop" @click.self="handleClose">
            <div class="modal-card modal-card-lg">
                <!-- Header -->
                <div class="modal-header">
                    <div>
                        <div class="modal-title-row">
                            <h3>รายชื่อผู้ลงทะเบียน: {{ activity?.title }}</h3>
                            <span v-if="isActivityMandatory" class="mandatory-tag">🔒 กิจกรรมบังคับ</span>
                        </div>
                        <p class="subtitle-small">
                            ชั่วโมงกิจกรรม: {{ activity?.activity_hours }} ชม. |
                            จำนวนรับ: {{ activity?.max_participants ? activity?.max_participants + ' คน' : 'ไม่จำกัด' }}
                            |
                            ผู้เข้าร่วมปัจจุบัน: {{ activeRegistrationsCount }} คน
                        </p>
                    </div>
                    <button class="btn-close" @click="handleClose" title="ปิดหน้าต่าง">&times;</button>
                </div>

                <div class="modal-body">
                    <!-- Role Scope Notice -->
                    <div v-if="userRole === 'club_president'" class="role-scope-alert">
                        🛡️ <strong>มุมมองประธานสโมสร:</strong> ระบบแสดงเฉพาะรายชื่อนักศึกษาในสังกัด <strong>{{
                            userFacultyName }}</strong> ตามสิทธิ์การดูแล
                    </div>
                    <div v-else class="role-scope-alert alert-admin">
                        🌐 <strong>มุมมององค์การนักศึกษา / ผู้ดูแลระบบ:</strong> แสดงรายชื่อผู้ลงทะเบียนทั้งหมดทุกคณะ
                    </div>

                    <!-- Filter Tabs -->
                    <div class="reg-filter-tabs">
                        <button type="button" class="reg-tab-btn"
                            :class="{ active: registrationStatusFilter === 'active' }"
                            @click="changeFilterTab('active')">
                            ✅ ผู้เข้าร่วมปัจจุบัน ({{ activeRegistrationsCount }})
                        </button>
                        <button type="button" class="reg-tab-btn"
                            :class="{ active: registrationStatusFilter === 'unconfirmed' }"
                            @click="changeFilterTab('unconfirmed')">
                            ⏳ ยังไม่ยืนยัน ({{ unconfirmedRegistrationsCount }})
                        </button>
                        <button type="button" class="reg-tab-btn"
                            :class="{ active: registrationStatusFilter === 'all' }" @click="changeFilterTab('all')">
                            📋 ทั้งหมด ({{ registrationsList.length }})
                        </button>
                        <button type="button" class="reg-tab-btn"
                            :class="{ active: registrationStatusFilter === 'cancelled' }"
                            @click="changeFilterTab('cancelled')">
                            ❌ ยกเลิกแล้ว ({{ cancelledRegistrationsCount }})
                        </button>
                    </div>

                    <!-- Search & Filter Controls (Faculty & Major) -->
                    <div class="filter-controls-card">
                        <div class="filter-grid">
                            <!-- Search box -->
                            <div class="filter-field">
                                <label>🔍 ค้นหา:</label>
                                <input type="text" v-model="searchQuery" placeholder="รหัสนักศึกษา หรือชื่อ-นามสกุล..."
                                    class="filter-input" @input="onFilterChange" />
                            </div>

                            <!-- Faculty dropdown -->
                            <div class="filter-field">
                                <label>🏢 คณะ:</label>
                                <div v-if="userRole === 'club_president'" class="locked-faculty-badge">
                                    🔒 {{ userFacultyName }}
                                </div>
                                <select v-else v-model="selectedFacultyId" class="filter-select"
                                    @change="onFacultyFilterChange">
                                    <option value="">-- ทุกคณะ --</option>
                                    <option v-for="fac in faculties" :key="fac.faculty_id"
                                        :value="String(fac.faculty_id)">
                                        {{ fac.faculty_name }}
                                    </option>
                                </select>
                            </div>

                            <!-- Major dropdown -->
                            <div class="filter-field">
                                <label>🎓 สาขาวิชา:</label>
                                <select v-model="selectedMajorId" class="filter-select" @change="onFilterChange">
                                    <option value="">-- ทุกสาขาวิชา --</option>
                                    <option v-for="maj in availableMajors" :key="maj.major_id"
                                        :value="String(maj.major_id)">
                                        {{ maj.major_name }} {{ !selectedFacultyId && maj.faculty_name ?
                                            `(${maj.faculty_name})` : '' }}
                                    </option>
                                </select>
                            </div>

                            <!-- Clear Filters -->
                            <div v-if="isAnyFilterActive" class="filter-actions">
                                <button type="button" class="btn-clear-filters" @click="resetFilters">
                                    ✕ ล้างตัวกรอง
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Bulk Action Bar with Smooth Transition -->
                    <Transition name="slide-down">
                        <div v-if="selectedRegistrationIds.length > 0" class="bulk-action-bar">
                            <div class="bulk-info">
                                <span class="bulk-count-badge">{{ selectedRegistrationIds.length }}</span>
                                <span>เลือก {{ selectedRegistrationIds.length }} คน</span>
                                <span v-if="isActivityMandatory" class="bulk-mandatory-hint">
                                    (🔒 กิจกรรมบังคับ: ยืนยันอัตโนมัติ)
                                </span>
                            </div>
                            <div class="bulk-btn-group">
                                <!-- ปุ่มยืนยัน: แสดงเฉพาะเมื่อมีรายการที่ยังไม่ได้รับการยืนยัน (status !== 'confirmed') -->
                                <button v-if="canBulkConfirm" type="button" class="btn-bulk-confirm"
                                    :disabled="isBulkUpdating" @click="bulkUpdateStatus('confirmed')">
                                    ✅ ยืนยันที่เลือก
                                </button>

                                <!-- ปุ่มยกเลิกการยืนยัน: แสดงเฉพาะเมื่อไม่ใช่กิจกรรมบังคับ และมีรายการที่ยืนยันแล้วถูกเลือก -->
                                <button v-if="canBulkRevert" type="button" class="btn-bulk-revert"
                                    :disabled="isBulkUpdating" @click="bulkUpdateStatus('registered')"
                                    title="ย้อนสถานะกลับเป็นรอการยืนยัน">
                                    ↩️ ยกเลิกการยืนยันที่เลือก
                                </button>

                                <!-- ปุ่มยกเลิก: แสดงเมื่อมีรายการที่ยังไม่ถูกยกเลิก -->
                                <button v-if="canBulkCancel" type="button" class="btn-bulk-cancel"
                                    :disabled="isBulkUpdating" @click="bulkUpdateStatus('cancelled')">
                                    ❌ ยกเลิกที่เลือก
                                </button>

                                <button type="button" class="btn-bulk-clear" :disabled="isBulkUpdating"
                                    @click="selectedRegistrationIds = []">
                                    ล้างการเลือก
                                </button>
                            </div>
                        </div>
                    </Transition>

                    <!-- Loading State -->
                    <div v-if="loadingRegistrations" class="loading-box">
                        <div class="spinner"></div>
                        <span>กำลังโหลดรายชื่อผู้ลงทะเบียน...</span>
                    </div>

                    <!-- Empty State -->
                    <div v-else-if="displayedRegistrations.length === 0" class="empty-registrations">
                        <p v-if="registrationsList.length === 0">ยังไม่มีรายชื่อนักศึกษาลงทะเบียนในกิจกรรมนี้</p>
                        <p v-else>ไม่พบรายชื่อนักศึกษาที่ตรงกับเงื่อนไขตัวกรอง</p>
                    </div>

                    <!-- Registrations Table -->
                    <div v-else class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th class="th-checkbox">
                                        <input type="checkbox" :checked="isAllSelected"
                                            :indeterminate.prop="isIndeterminate" @change="toggleSelectAll"
                                            title="เลือกทั้งหมดในหน้านี้" />
                                    </th>
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
                                <tr v-for="reg in displayedRegistrations" :key="reg.registration_id"
                                    :class="{ 'row-selected': selectedRegistrationIds.includes(reg.registration_id) }">
                                    <td class="td-checkbox">
                                        <input type="checkbox" :value="reg.registration_id"
                                            v-model="selectedRegistrationIds" />
                                    </td>
                                    <td><code>{{ reg.student_id }}</code></td>
                                    <td>{{ reg.first_name }} {{ reg.last_name }}</td>
                                    <td>{{ reg.faculty_name || '-' }}</td>
                                    <td>{{ reg.major_name || '-' }}</td>
                                    <td>{{ formatDateTime(reg.registered_at) }}</td>
                                    <td>
                                        <span class="status-pill" :class="'status-' + (reg.status || '').toLowerCase()">
                                            {{ (reg.status || '').toLowerCase() === 'confirmed' ? '✅ ยืนยันแล้ว' :
                                                ((reg.status || '').toLowerCase() === 'cancelled' ? '❌ ยกเลิก' :
                                                    '⏳รอการยืนยัน') }}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-btns">
                                            <button v-if="(reg.status || '').toLowerCase() !== 'confirmed'"
                                                class="btn-act-confirm"
                                                @click="updateRegistrationStatus(reg.registration_id, 'confirmed')">
                                                ยืนยัน
                                            </button>
                                            <button
                                                v-if="(reg.status || '').toLowerCase() === 'confirmed' && !isActivityMandatory"
                                                class="btn-act-revert"
                                                @click="updateRegistrationStatus(reg.registration_id, 'registered')"
                                                title="ย้อนสถานะกลับเป็นรอการยืนยัน">
                                                ยกเลิกการยืนยัน
                                            </button>
                                            <button v-if="(reg.status || '').toLowerCase() !== 'cancelled'"
                                                class="btn-act-cancel"
                                                @click="updateRegistrationStatus(reg.registration_id, 'cancelled')">
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
    </Transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    activity: {
        type: Object,
        default: null
    },
    userRole: {
        type: String,
        default: ''
    },
    currentUser: {
        type: Object,
        default: null
    },
    faculties: {
        type: Array,
        default: () => []
    },
    majors: {
        type: Array,
        default: () => []
    }
})

const emit = defineEmits(['close', 'updated'])

// Registration State
const registrationsList = ref([])
const loadingRegistrations = ref(false)
const registrationStatusFilter = ref('active') // 'active', 'unconfirmed', 'all', 'cancelled'
const selectedRegistrationIds = ref([])
const isBulkUpdating = ref(false)

// Filter & Search Controls
const searchQuery = ref('')
const selectedFacultyId = ref('')
const selectedMajorId = ref('')

const isActivityMandatory = computed(() => {
    if (!props.activity) return false
    const catId = Number(props.activity.category_id)
    const catName = props.activity.category_name || ''
    return catId === 1 || catName.includes('บังคับ')
})

const userFacultyName = computed(() => {
    if (!props.currentUser?.faculty_name) return 'คณะของท่าน'
    return props.currentUser.faculty_name.startsWith('คณะ')
        ? props.currentUser.faculty_name
        : 'คณะ' + props.currentUser.faculty_name
})

// Counts
const activeRegistrationsCount = computed(() => {
    return registrationsList.value.filter(r => (r.status || '').toLowerCase() !== 'cancelled').length
})

const unconfirmedRegistrationsCount = computed(() => {
    return registrationsList.value.filter(r => (r.status || '').toLowerCase() === 'registered').length
})

const cancelledRegistrationsCount = computed(() => {
    return registrationsList.value.filter(r => (r.status || '').toLowerCase() === 'cancelled').length
})

// Available majors based on chosen faculty
const availableMajors = computed(() => {
    if (props.userRole === 'club_president') {
        const pFacId = Number(props.currentUser?.faculty_id)
        return props.majors.filter(m => Number(m.faculty_id) === pFacId)
    }
    if (!selectedFacultyId.value) {
        return props.majors
    }
    const fId = Number(selectedFacultyId.value)
    return props.majors.filter(m => Number(m.faculty_id) === fId)
})

const isAnyFilterActive = computed(() => {
    return !!searchQuery.value.trim() || !!selectedFacultyId.value || !!selectedMajorId.value
})

const resetFilters = () => {
    searchQuery.value = ''
    selectedFacultyId.value = ''
    selectedMajorId.value = ''
    selectedRegistrationIds.value = []
}

const onFacultyFilterChange = () => {
    selectedMajorId.value = ''
    selectedRegistrationIds.value = []
}

const onFilterChange = () => {
    selectedRegistrationIds.value = []
}

// Displayed Registrations (after tab filter + search query + faculty + major filters)
const displayedRegistrations = computed(() => {
    let list = registrationsList.value

    // 1. Tab filter
    if (registrationStatusFilter.value === 'active') {
        list = list.filter(r => (r.status || '').toLowerCase() !== 'cancelled')
    } else if (registrationStatusFilter.value === 'unconfirmed') {
        list = list.filter(r => (r.status || '').toLowerCase() === 'registered')
    } else if (registrationStatusFilter.value === 'cancelled') {
        list = list.filter(r => (r.status || '').toLowerCase() === 'cancelled')
    }

    // 2. Search query filter
    const q = searchQuery.value.trim().toLowerCase()
    if (q) {
        list = list.filter(r => {
            const sId = String(r.student_id || '').toLowerCase()
            const fullName = `${r.first_name || ''} ${r.last_name || ''}`.toLowerCase()
            return sId.includes(q) || fullName.includes(q)
        })
    }

    // 3. Faculty filter (if not club_president where faculty is already scoped by API)
    if (props.userRole !== 'club_president' && selectedFacultyId.value) {
        list = list.filter(r => String(r.faculty_id) === selectedFacultyId.value)
    }

    // 4. Major filter
    if (selectedMajorId.value) {
        list = list.filter(r => String(r.major_id) === selectedMajorId.value)
    }

    return list
})

// Selected Registrations Objects
const selectedRegistrations = computed(() => {
    const selectedSet = new Set(selectedRegistrationIds.value)
    return registrationsList.value.filter(r => selectedSet.has(r.registration_id))
})

// Bulk Action Button Visibility Rules
// "ปุ่มยืนยันที่เลือก จะต้องไม่แสดงผลถ้าเลือกรายชื่อที่ยืนยันแล้วทั้งหมด"
const canBulkConfirm = computed(() => {
    if (selectedRegistrations.value.length === 0) return false
    return selectedRegistrations.value.some(r => (r.status || '').toLowerCase() !== 'confirmed')
})

const canBulkRevert = computed(() => {
    if (isActivityMandatory.value || selectedRegistrations.value.length === 0) return false
    return selectedRegistrations.value.some(r => (r.status || '').toLowerCase() === 'confirmed')
})

const canBulkCancel = computed(() => {
    if (selectedRegistrations.value.length === 0) return false
    return selectedRegistrations.value.some(r => (r.status || '').toLowerCase() !== 'cancelled')
})

// Select All & Indeterminate
const isAllSelected = computed(() => {
    if (displayedRegistrations.value.length === 0) return false
    return displayedRegistrations.value.every(r => selectedRegistrationIds.value.includes(r.registration_id))
})

const isIndeterminate = computed(() => {
    if (displayedRegistrations.value.length === 0) return false
    const selectedInCurrent = displayedRegistrations.value.filter(r => selectedRegistrationIds.value.includes(r.registration_id))
    return selectedInCurrent.length > 0 && selectedInCurrent.length < displayedRegistrations.value.length
})

const toggleSelectAll = (e) => {
    const currentIds = displayedRegistrations.value.map(r => r.registration_id)
    if (e.target.checked) {
        const set = new Set([...selectedRegistrationIds.value, ...currentIds])
        selectedRegistrationIds.value = Array.from(set)
    } else {
        const currentIdSet = new Set(currentIds)
        selectedRegistrationIds.value = selectedRegistrationIds.value.filter(id => !currentIdSet.has(id))
    }
}

const changeFilterTab = (tab) => {
    registrationStatusFilter.value = tab
    selectedRegistrationIds.value = []
}

// Fetch Registrations
const fetchRegistrations = async () => {
    if (!props.activity) return
    loadingRegistrations.value = true
    try {
        const params = new URLSearchParams({
            activity_id: props.activity.activity_id,
            role: props.userRole,
            faculty_id: props.currentUser?.faculty_id || ''
        })
        const res = await $fetch(`/api/activities/registrations?${params.toString()}`)
        registrationsList.value = res.data || []
    } catch (err) {
        alert('เกิดข้อผิดพลาดในการโหลดรายชื่อ: ' + (err.data?.statusMessage || err.message))
    } finally {
        loadingRegistrations.value = false
    }
}

// Watchers
watch(() => props.show, (newVal) => {
    if (newVal && props.activity) {
        registrationStatusFilter.value = 'active'
        selectedRegistrationIds.value = []
        searchQuery.value = ''
        selectedFacultyId.value = ''
        selectedMajorId.value = ''
        fetchRegistrations()
    }
})

const handleClose = () => {
    selectedRegistrationIds.value = []
    emit('close')
}

// Single Status Update
const updateRegistrationStatus = async (regId, status) => {
    try {
        await $fetch(`/api/activities/registrations/${regId}`, {
            method: 'PUT',
            body: {
                status,
                role: props.userRole,
                faculty_id: props.currentUser?.faculty_id || null
            }
        })
        selectedRegistrationIds.value = selectedRegistrationIds.value.filter(id => id !== regId)
        await fetchRegistrations()
        emit('updated')
    } catch (err) {
        alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: ' + (err.data?.statusMessage || err.message))
    }
}

// Bulk Status Update
const bulkUpdateStatus = async (status) => {
    if (selectedRegistrationIds.value.length === 0) return

    const actionText = status === 'confirmed' ? 'ยืนยัน' : (status === 'cancelled' ? 'ยกเลิก' : 'ยกเลิกการยืนยัน')
    const count = selectedRegistrationIds.value.length
    if (!confirm(`คุณต้องการ ${actionText} การลงทะเบียนที่เลือกทั้งหมด ${count} รายการ ใช่หรือไม่?`)) {
        return
    }

    isBulkUpdating.value = true
    try {
        const res = await $fetch('/api/activities/registrations/bulk', {
            method: 'PUT',
            body: {
                registration_ids: selectedRegistrationIds.value,
                status,
                role: props.userRole,
                faculty_id: props.currentUser?.faculty_id || null
            }
        })

        alert(res.message || 'ดำเนินการเรียบร้อยแล้ว')
        selectedRegistrationIds.value = []
        await fetchRegistrations()
        emit('updated')
    } catch (err) {
        alert('เกิดข้อผิดพลาดในการดำเนินการแบบกลุ่ม: ' + (err.data?.statusMessage || err.message))
    } finally {
        isBulkUpdating.value = false
    }
}

const formatDateTime = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}
</script>

<style scoped>
/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-enter-from .modal-card,
.modal-leave-to .modal-card {
    opacity: 0;
    transform: scale(0.97) translateY(-12px);
}

.modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(15, 23, 42, 0.55);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999;
    padding: 1rem;
}

.modal-card-lg {
    max-width: 980px;
    width: 95%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #e2e8f0;
}

.modal-title-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
}

.modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #0f172a;
}

.mandatory-tag {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-size: 0.78rem;
    font-weight: 600;
}

.subtitle-small {
    font-size: 0.85rem;
    color: #64748b;
    margin: 0.35rem 0 0 0;
}

.btn-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    color: #94a3b8;
    cursor: pointer;
    border-radius: 6px;
    padding: 0.2rem 0.5rem;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-close:hover {
    color: #0f172a;
    background-color: #f1f5f9;
}

.modal-body {
    padding: 1.25rem 1.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* Alerts */
.role-scope-alert {
    background-color: #eff6ff;
    border-left: 4px solid #3b82f6;
    color: #1e40af;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    font-size: 0.88rem;
    line-height: 1.5;
}

.alert-admin {
    background-color: #f0fdf4;
    border-left-color: #22c55e;
    color: #166534;
}

/* Filter Tabs */
.reg-filter-tabs {
    display: flex;
    gap: 0.5rem;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 0.75rem;
    flex-wrap: wrap;
}

.reg-tab-btn {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #cbd5e1;
    padding: 0.4rem 0.85rem;
    border-radius: 6px;
    font-size: 0.84rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.reg-tab-btn:hover {
    background: #e2e8f0;
    color: #1e293b;
}

.reg-tab-btn.active {
    background: #2563eb;
    color: white;
    border-color: #1d4ed8;
    box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
}

/* Filter Controls Card */
.filter-controls-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.85rem 1rem;
}

.filter-grid {
    display: flex;
    align-items: flex-end;
    gap: 0.85rem;
    flex-wrap: wrap;
}

.filter-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    flex: 1;
    min-width: 180px;
}

.filter-field label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #475569;
}

.filter-input,
.filter-select {
    border: 1px solid #cbd5e1;
    padding: 0.45rem 0.65rem;
    border-radius: 6px;
    font-size: 0.86rem;
    color: #1e293b;
    background: white;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.filter-input:focus,
.filter-select:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.locked-faculty-badge {
    background: #e2e8f0;
    color: #334155;
    padding: 0.45rem 0.65rem;
    border-radius: 6px;
    font-size: 0.86rem;
    font-weight: 500;
}

.filter-actions {
    display: flex;
    align-items: center;
}

.btn-clear-filters {
    background: #e2e8f0;
    color: #475569;
    border: 1px solid #cbd5e1;
    padding: 0.45rem 0.75rem;
    border-radius: 6px;
    font-size: 0.82rem;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}

.btn-clear-filters:hover {
    background: #cbd5e1;
    color: #0f172a;
}

/* Bulk Action Bar with Smooth Transition */
.slide-down-enter-active,
.slide-down-leave-active {
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-down-enter-from,
.slide-down-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}

.bulk-action-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-left: 4px solid #16a34a;
    padding: 0.65rem 1rem;
    border-radius: 6px;
}

.bulk-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: #166534;
    font-size: 0.88rem;
}

.bulk-count-badge {
    background: #16a34a;
    color: white;
    padding: 0.15rem 0.55rem;
    border-radius: 9999px;
    font-size: 0.78rem;
    font-weight: 700;
}

.bulk-mandatory-hint {
    font-size: 0.8rem;
    color: #854d0e;
    font-weight: normal;
}

.bulk-btn-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.btn-bulk-confirm {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.4rem 0.85rem;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-bulk-confirm:hover:not(:disabled) {
    background: #059669;
    transform: translateY(-1px);
}

.btn-bulk-revert {
    background: #f59e0b;
    color: white;
    border: none;
    padding: 0.4rem 0.85rem;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-bulk-revert:hover:not(:disabled) {
    background: #d97706;
    transform: translateY(-1px);
}

.btn-bulk-cancel {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.4rem 0.85rem;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-bulk-cancel:hover:not(:disabled) {
    background: #dc2626;
    transform: translateY(-1px);
}

.btn-bulk-clear {
    background: #e2e8f0;
    color: #475569;
    border: 1px solid #cbd5e1;
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    font-size: 0.82rem;
    cursor: pointer;
    transition: all 0.15s;
}

.btn-bulk-clear:hover:not(:disabled) {
    background: #cbd5e1;
    color: #0f172a;
}

.bulk-btn-group button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Loading Box */
.loading-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 3rem 1rem;
    color: #64748b;
    font-size: 0.95rem;
}

.spinner {
    width: 28px;
    height: 28px;
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

.empty-registrations {
    text-align: center;
    padding: 2.5rem 1rem;
    color: #64748b;
    font-size: 0.95rem;
}

/* Table */
.table-responsive {
    overflow-x: auto;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
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
    white-space: nowrap;
}

.data-table td {
    padding: 0.75rem 0.85rem;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
    transition: background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.row-selected {
    background-color: #f0fdf4 !important;
}

.th-checkbox,
.td-checkbox {
    width: 44px;
    text-align: center;
    vertical-align: middle;
}

.th-checkbox input,
.td-checkbox input {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #16a34a;
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
    white-space: nowrap;
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
    white-space: nowrap;
}

.btn-act-confirm {
    background-color: #10b981;
    color: white;
    border: none;
    padding: 0.35rem 0.65rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-act-confirm:hover {
    background-color: #059669;
    transform: translateY(-1px);
}

.btn-act-revert {
    background-color: #f59e0b;
    color: white;
    border: none;
    padding: 0.35rem 0.65rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-act-revert:hover {
    background-color: #d97706;
    transform: translateY(-1px);
}

.btn-act-cancel {
    background-color: #ef4444;
    color: white;
    border: none;
    padding: 0.35rem 0.65rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-act-cancel:hover {
    background-color: #dc2626;
    transform: translateY(-1px);
}
</style>
