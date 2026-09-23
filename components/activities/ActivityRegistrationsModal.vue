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
                    <div class="modal-header-actions">
                        <button v-if="canAddFromList" type="button" class="btn-select-from-list"
                            @click="openCandidateModal">
                            👥 เลือกจากรายชื่อ
                        </button>
                        <button class="btn-close" @click="handleClose" title="ปิดหน้าต่าง">&times;</button>
                    </div>
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

                <!-- Candidate Student Selector Sub-Modal -->
                <Transition name="modal">
                    <div v-if="showCandidateModal" class="candidate-modal-backdrop" @click.self="closeCandidateModal">
                        <div class="modal-card modal-card-lg candidate-modal-card">
                            <!-- Candidate Modal Header -->
                            <div class="modal-header candidate-header">
                                <div>
                                    <div class="modal-title-row">
                                        <h3>👥 เลือกจากรายชื่อนักศึกษา: {{ activity?.title }}</h3>
                                    </div>
                                    <p class="subtitle-small">
                                        เพิ่มรายชื่อนักศึกษาเข้าร่วมกิจกรรม (รายบุคคลหรือทั้งสาขา/คณะ)
                                        <span v-if="userRole === 'club_president'" class="target-scope-tag">
                                            🏛️ สังกัด: {{ userFacultyName }} (เลือกได้ทุกสาขาในคณะ)
                                        </span>
                                        <span v-else-if="props.activity?.target_majors?.length"
                                            class="target-scope-tag">
                                            🎯 กำหนดเฉพาะ: {{props.activity.target_majors.map(m =>
                                            m.major_name).join(', ') }}
                                        </span>
                                        <span v-else-if="props.activity?.target_faculties?.length"
                                            class="target-scope-tag">
                                            🎯 กำหนดเฉพาะ: {{props.activity.target_faculties.map(f =>
                                            f.faculty_name).join(', ') }}
                                        </span>
                                        <span v-else class="target-scope-tag open-scope">
                                            🌐 เปิดรับทุกคณะ / ทุกสาขาวิชา
                                        </span>
                                    </p>
                                </div>
                                <button class="btn-close" @click="closeCandidateModal"
                                    title="ปิดหน้าต่าง">&times;</button>
                            </div>

                            <!-- Candidate Modal Body -->
                            <div class="modal-body candidate-body">
                                <!-- Filter Controls (Search, Faculty, Major) -->
                                <div class="filter-controls-card">
                                    <div class="filter-grid">
                                        <!-- Search -->
                                        <div class="filter-field">
                                            <label>🔍 ค้นหา:</label>
                                            <input type="text" v-model="candidateSearchQuery"
                                                placeholder="รหัสนักศึกษา หรือชื่อ-นามสกุล..." class="filter-input" />
                                        </div>

                                        <!-- Faculty Filter -->
                                        <div class="filter-field">
                                            <label>🏢 คณะ:</label>
                                            <div v-if="userRole === 'club_president'" class="locked-faculty-badge">
                                                🔒 {{ userFacultyName }}
                                            </div>
                                            <select v-else v-model="candidateFacultyId" class="filter-select"
                                                @change="candidateMajorId = ''">
                                                <option value="">-- ทุกคณะที่กิจกรรมกำหนด --</option>
                                                <option v-for="fac in candidateAvailableFaculties" :key="fac.faculty_id"
                                                    :value="String(fac.faculty_id)">
                                                    {{ fac.faculty_name }}
                                                </option>
                                            </select>
                                        </div>

                                        <!-- Major Filter -->
                                        <div class="filter-field">
                                            <label>🎓 สาขาวิชา:</label>
                                            <select v-model="candidateMajorId" class="filter-select">
                                                <option value="">-- ทุกสาขาวิชา --</option>
                                                <option v-for="maj in candidateAvailableMajors" :key="maj.major_id"
                                                    :value="String(maj.major_id)">
                                                    {{ maj.major_name }} {{ !candidateFacultyId && maj.faculty_name ?
                                                    `(${maj.faculty_name})` : '' }}
                                                </option>
                                            </select>
                                        </div>

                                        <!-- Clear Filters -->
                                        <div v-if="candidateSearchQuery || (userRole !== 'club_president' && candidateFacultyId) || candidateMajorId"
                                            class="filter-actions">
                                            <button type="button" class="btn-clear-filters"
                                                @click="resetCandidateFilters">
                                                ✕ ล้างตัวกรอง
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Selection Summary & Capacity Bar -->
                                <div class="candidate-summary-bar">
                                    <div class="summary-left">
                                        <label class="select-all-label">
                                            <input type="checkbox" :checked="isAllCandidatesSelected"
                                                :indeterminate.prop="isCandidateIndeterminate"
                                                :disabled="availableCandidatesCount === 0"
                                                @change="toggleSelectAllCandidates" />
                                            <span>เลือกทั้งหมดที่แสดง ({{ availableCandidatesCount }} คน)</span>
                                        </label>
                                        <span class="selected-pill">
                                            เลือกแล้ว <strong>{{ selectedCandidateIds.length }}</strong> คน
                                        </span>
                                    </div>

                                    <div class="summary-right">
                                        <span v-if="candidateAvailableSeats !== null" class="seats-badge"
                                            :class="{ 'seats-warning': selectedCandidateIds.length > candidateAvailableSeats }">
                                            ที่นั่งคงเหลือ: <strong>{{ candidateAvailableSeats }}</strong> ที่นั่ง
                                        </span>
                                        <button v-if="selectedCandidateIds.length > 0" type="button"
                                            class="btn-clear-selection" @click="selectedCandidateIds = []">
                                            ล้างการเลือก
                                        </button>
                                    </div>
                                </div>

                                <!-- Capacity Warning Alert -->
                                <div v-if="isCapacityExceeded" class="capacity-warning-alert">
                                    ⚠️ จำนวนนักศึกษาที่เลือก ({{ selectedCandidateIds.length }} คน)
                                    เกินกว่าที่นั่งคงเหลือ ({{ candidateAvailableSeats }} ที่นั่ง) กรุณาปรับลดจำนวน
                                </div>

                                <!-- Loading State -->
                                <div v-if="loadingCandidates" class="loading-box">
                                    <div class="spinner"></div>
                                    <span>กำลังโหลดข้อมูลนักศึกษา...</span>
                                </div>

                                <!-- Empty State -->
                                <div v-else-if="displayedCandidates.length === 0" class="empty-registrations">
                                    <p v-if="candidateStudents.length === 0">
                                        ไม่พบรายชื่อนักศึกษาที่ตรงตามเงื่อนไขของกิจกรรมนี้</p>
                                    <p v-else>ไม่พบรายชื่อนักศึกษาที่ตรงกับเงื่อนไขตัวกรอง</p>
                                </div>

                                <!-- Candidate Table -->
                                <div v-else class="table-container candidate-table-wrapper">
                                    <table class="reg-table candidate-table">
                                        <thead>
                                            <tr>
                                                <th style="width: 44px; text-align: center;">
                                                    <input type="checkbox" :checked="isAllCandidatesSelected"
                                                        :indeterminate.prop="isCandidateIndeterminate"
                                                        :disabled="availableCandidatesCount === 0"
                                                        @change="toggleSelectAllCandidates" />
                                                </th>
                                                <th style="width: 140px;">รหัสนักศึกษา</th>
                                                <th>ชื่อ - นามสกุล</th>
                                                <th>คณะ</th>
                                                <th>สาขาวิชา</th>
                                                <th style="width: 110px; text-align: center;">ชม. สะสม</th>
                                                <th style="width: 120px; text-align: center;">สถานะ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="cand in displayedCandidates" :key="cand.student_id" :class="{
                                                'selected-row': selectedCandidateIds.includes(cand.student_id),
                                                'disabled-row': cand.is_already_registered
                                            }" @click="toggleCandidateRow(cand)">
                                                <td style="text-align: center;" @click.stop>
                                                    <input type="checkbox" :value="cand.student_id"
                                                        v-model="selectedCandidateIds"
                                                        :disabled="cand.is_already_registered" />
                                                </td>
                                                <td class="font-mono font-bold">{{ cand.student_id }}</td>
                                                <td>{{ cand.first_name }} {{ cand.last_name }}</td>
                                                <td><span class="faculty-badge">{{ cand.faculty_name || '-' }}</span>
                                                </td>
                                                <td>{{ cand.major_name || '-' }}</td>
                                                <td style="text-align: center;">{{ cand.accumulated_hours || 0 }} ชม.
                                                </td>
                                                <td style="text-align: center;">
                                                    <span v-if="cand.is_already_registered"
                                                        class="status-badge-registered">
                                                        ✓ ลงทะเบียนแล้ว
                                                    </span>
                                                    <span v-else class="status-badge-eligible">
                                                        สามารถเลือกได้
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Candidate Modal Footer -->
                            <div class="modal-footer candidate-footer">
                                <button type="button" class="btn-cancel" @click="closeCandidateModal"
                                    :disabled="isSavingCandidates">
                                    ยกเลิก
                                </button>
                                <button type="button" class="btn-submit-candidates"
                                    :disabled="selectedCandidateIds.length === 0 || isSavingCandidates || isCapacityExceeded"
                                    @click="saveCandidateRegistrations">
                                    <span v-if="isSavingCandidates" class="mini-spinner"></span>
                                    <span>{{ isSavingCandidates ? 'กำลังบันทึก...' : `ยืนยันการเพิ่มรายชื่อ
                                        (${selectedCandidateIds.length} คน)` }}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </Transition>
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

// Can Add From List (Role & Activity Target Compatibility)
const canAddFromList = computed(() => {
    if (!props.activity) return false

    // Admin and Org President can always add from list
    if (props.userRole === 'admin' || props.userRole === 'org_president') {
        return true
    }

    // Club President: can only add if the activity accepts registrations from their faculty
    if (props.userRole === 'club_president') {
        const presidentFacId = Number(props.currentUser?.faculty_id)
        if (!presidentFacId) return false

        const targetFaculties = props.activity.target_faculties || []
        const targetMajors = props.activity.target_majors || []

        // If activity has no target faculties and no target majors -> open to all faculties
        if (targetFaculties.length === 0 && targetMajors.length === 0) {
            return true
        }

        // If activity specifies target majors: check if any major is in president's faculty
        if (targetMajors.length > 0) {
            return targetMajors.some(m => Number(m.faculty_id) === presidentFacId)
        }

        // If activity specifies only target faculties: check if president's faculty is included
        if (targetFaculties.length > 0) {
            return targetFaculties.some(f => Number(f.faculty_id) === presidentFacId)
        }
    }

    return false
})

// Candidate Selection State
const showCandidateModal = ref(false)
const loadingCandidates = ref(false)
const candidateStudents = ref([])
const candidateSearchQuery = ref('')
const candidateFacultyId = ref('')
const candidateMajorId = ref('')
const selectedCandidateIds = ref([])
const isSavingCandidates = ref(false)
const candidateAvailableSeats = ref(null)

const openCandidateModal = async () => {
    selectedCandidateIds.value = []
    candidateSearchQuery.value = ''
    candidateFacultyId.value = props.userRole === 'club_president' ? String(props.currentUser?.faculty_id || '') : ''
    candidateMajorId.value = ''
    showCandidateModal.value = true
    await fetchCandidates()
}

const closeCandidateModal = () => {
    showCandidateModal.value = false
    selectedCandidateIds.value = []
}

const resetCandidateFilters = () => {
    candidateSearchQuery.value = ''
    if (props.userRole !== 'club_president') {
        candidateFacultyId.value = ''
    }
    candidateMajorId.value = ''
}

const fetchCandidates = async () => {
    if (!props.activity) return
    loadingCandidates.value = true
    try {
        const params = new URLSearchParams({
            activity_id: props.activity.activity_id,
            role: props.userRole,
            faculty_id: props.currentUser?.faculty_id || ''
        })
        const res = await $fetch(`/api/activities/registrations/candidate-students?${params.toString()}`)
        candidateStudents.value = res.data || []
        candidateAvailableSeats.value = res.available_seats
    } catch (err) {
        alert('เกิดข้อผิดพลาดในการโหลดรายชื่อนักศึกษา: ' + (err.data?.statusMessage || err.message))
    } finally {
        loadingCandidates.value = false
    }
}

// Available faculties in candidate modal
const candidateAvailableFaculties = computed(() => {
    if (props.userRole === 'club_president') {
        const pFacId = Number(props.currentUser?.faculty_id)
        return props.faculties.filter(f => Number(f.faculty_id) === pFacId)
    }

    const targetFacs = props.activity?.target_faculties || []
    const targetMajs = props.activity?.target_majors || []

    if (targetMajs.length > 0) {
        const allowedFacIds = new Set(targetMajs.map(m => Number(m.faculty_id)))
        return props.faculties.filter(f => allowedFacIds.has(Number(f.faculty_id)))
    }
    if (targetFacs.length > 0) {
        const allowedFacIds = new Set(targetFacs.map(f => Number(f.faculty_id)))
        return props.faculties.filter(f => allowedFacIds.has(Number(f.faculty_id)))
    }

    return props.faculties
})

// Available majors in candidate modal
const candidateAvailableMajors = computed(() => {
    let majorsList = props.majors

    const chosenFacId = candidateFacultyId.value
        ? Number(candidateFacultyId.value)
        : (props.userRole === 'club_president' ? Number(props.currentUser?.faculty_id) : null)

    if (chosenFacId) {
        majorsList = majorsList.filter(m => Number(m.faculty_id) === chosenFacId)
    }

    if (props.userRole !== 'club_president') {
        const targetMajs = props.activity?.target_majors || []
        if (targetMajs.length > 0) {
            const allowedMajorIds = new Set(targetMajs.map(m => Number(m.major_id)))
            majorsList = majorsList.filter(m => allowedMajorIds.has(Number(m.major_id)))
        }
    }

    return majorsList
})

// Displayed candidate list
const displayedCandidates = computed(() => {
    let list = candidateStudents.value

    const q = candidateSearchQuery.value.trim().toLowerCase()
    if (q) {
        list = list.filter(c => {
            const sId = String(c.student_id || '').toLowerCase()
            const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()
            return sId.includes(q) || fullName.includes(q)
        })
    }

    if (candidateFacultyId.value) {
        list = list.filter(c => Number(c.faculty_id) === Number(candidateFacultyId.value))
    }

    if (candidateMajorId.value) {
        list = list.filter(c => Number(c.major_id) === Number(candidateMajorId.value))
    }

    return list
})

const availableCandidates = computed(() => {
    return displayedCandidates.value.filter(c => !c.is_already_registered)
})

const availableCandidatesCount = computed(() => {
    return availableCandidates.value.length
})

const isAllCandidatesSelected = computed(() => {
    if (availableCandidates.value.length === 0) return false
    return availableCandidates.value.every(c => selectedCandidateIds.value.includes(c.student_id))
})

const isCandidateIndeterminate = computed(() => {
    if (availableCandidates.value.length === 0) return false
    const selectedInCurrent = availableCandidates.value.filter(c => selectedCandidateIds.value.includes(c.student_id))
    return selectedInCurrent.length > 0 && selectedInCurrent.length < availableCandidates.value.length
})

const toggleSelectAllCandidates = (e) => {
    const selectableIds = availableCandidates.value.map(c => c.student_id)
    if (e.target.checked) {
        const set = new Set([...selectedCandidateIds.value, ...selectableIds])
        selectedCandidateIds.value = Array.from(set)
    } else {
        const removeSet = new Set(selectableIds)
        selectedCandidateIds.value = selectedCandidateIds.value.filter(id => !removeSet.has(id))
    }
}

const toggleCandidateRow = (cand) => {
    if (cand.is_already_registered) return
    const idx = selectedCandidateIds.value.indexOf(cand.student_id)
    if (idx > -1) {
        selectedCandidateIds.value.splice(idx, 1)
    } else {
        selectedCandidateIds.value.push(cand.student_id)
    }
}

const isCapacityExceeded = computed(() => {
    if (candidateAvailableSeats.value === null) return false
    return selectedCandidateIds.value.length > candidateAvailableSeats.value
})

const saveCandidateRegistrations = async () => {
    if (selectedCandidateIds.value.length === 0) return

    if (isCapacityExceeded.value) {
        alert(`จำนวนนักศึกษาที่เลือกเกินกว่าที่นั่งคงเหลือ (${candidateAvailableSeats.value} ที่นั่ง)`)
        return
    }

    if (!confirm(`ยืนยันการเพิ่มนักศึกษาจำนวน ${selectedCandidateIds.value.length} คน เข้าร่วมกิจกรรมนี้ ใช่หรือไม่?`)) {
        return
    }

    isSavingCandidates.value = true
    try {
        const res = await $fetch('/api/activities/registrations/add-students', {
            method: 'POST',
            body: {
                activity_id: props.activity.activity_id,
                student_ids: selectedCandidateIds.value,
                role: props.userRole,
                faculty_id: props.currentUser?.faculty_id || null
            }
        })

        alert(res?.message || 'เพิ่มรายชื่อนักศึกษาสำเร็จ')
        closeCandidateModal()
        await fetchRegistrations()
        emit('updated')
    } catch (err) {
        alert('เกิดข้อผิดพลาดในการเพิ่มรายชื่อ: ' + (err.data?.statusMessage || err.message))
    } finally {
        isSavingCandidates.value = false
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

/* Header Actions & Select from List Button */
.modal-header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.btn-select-from-list {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
}

.btn-select-from-list:hover {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);
}

/* Candidate Modal Backdrop & Card */
.candidate-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1050;
    padding: 1rem;
}

.candidate-modal-card {
    max-width: 1020px;
    width: 95%;
    max-height: 92vh;
    background: #ffffff;
    border-radius: 14px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.candidate-header {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
}

.target-scope-tag {
    display: inline-block;
    margin-left: 0.5rem;
    padding: 0.15rem 0.5rem;
    background: #e0f2fe;
    color: #0369a1;
    border-radius: 4px;
    font-size: 0.78rem;
    font-weight: 600;
    border: 1px solid #bae6fd;
}

.target-scope-tag.open-scope {
    background: #f0fdf4;
    color: #15803d;
    border-color: #bbf7d0;
}

.candidate-body {
    padding: 1.25rem 1.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: calc(92vh - 140px);
}

/* Selection Summary Bar */
.candidate-summary-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 0.65rem 1rem;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.summary-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.select-all-label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.88rem;
    font-weight: 600;
    color: #1e293b;
    cursor: pointer;
    user-select: none;
}

.select-all-label input[type="checkbox"] {
    width: 17px;
    height: 17px;
    cursor: pointer;
}

.selected-pill {
    background: #3b82f6;
    color: white;
    font-size: 0.8rem;
    padding: 0.2rem 0.65rem;
    border-radius: 9999px;
    font-weight: 500;
}

.summary-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.seats-badge {
    background: #ecfdf5;
    color: #065f46;
    border: 1px solid #a7f3d0;
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 500;
}

.seats-badge.seats-warning {
    background: #fef2f2;
    color: #991b1b;
    border-color: #fecaca;
}

.btn-clear-selection {
    background: transparent;
    border: 1px solid #94a3b8;
    color: #475569;
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s;
}

.btn-clear-selection:hover {
    background: #e2e8f0;
    color: #1e293b;
}

.capacity-warning-alert {
    background: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
}

/* Candidate Table */
.candidate-table-wrapper {
    max-height: 380px;
    overflow-y: auto;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
}

.candidate-table tbody tr {
    cursor: pointer;
    transition: background-color 0.15s;
}

.candidate-table tbody tr:hover:not(.disabled-row) {
    background-color: #f8fafc;
}

.candidate-table tbody tr.selected-row {
    background-color: #eff6ff;
}

.candidate-table tbody tr.disabled-row {
    opacity: 0.6;
    background-color: #f8fafc;
    cursor: not-allowed;
}

.status-badge-registered {
    background: #f1f5f9;
    color: #64748b;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
}

.status-badge-eligible {
    background: #f0fdf4;
    color: #166534;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
}

/* Candidate Footer */
.candidate-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
}

.btn-cancel {
    background: #e2e8f0;
    color: #475569;
    border: 1px solid #cbd5e1;
    padding: 0.55rem 1.1rem;
    border-radius: 8px;
    font-size: 0.88rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
}

.btn-cancel:hover:not(:disabled) {
    background: #cbd5e1;
    color: #1e293b;
}

.btn-submit-candidates {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    padding: 0.55rem 1.25rem;
    border-radius: 8px;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(5, 150, 105, 0.25);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.btn-submit-candidates:hover:not(:disabled) {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(5, 150, 105, 0.35);
}

.btn-submit-candidates:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
}

.mini-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    display: inline-block;
}
</style>
