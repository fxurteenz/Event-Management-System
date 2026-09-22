<template>
    <div class="admin-container">
        <!-- Header -->
        <div class="page-header">
            <div>
                <h2>🏢 จัดการข้อมูลคณะและสาขาวิชา</h2>
                <p class="subtitle">จัดการข้อมูลโครงสร้างคณะและสาขาวิชาทั้งหมดภายในระบบในหน้าเดียว</p>
            </div>
            <div class="header-actions">
                <NuxtLink to="/admin" class="btn-back">← กลับหน้าหลัก Admin</NuxtLink>
            </div>
        </div>

        <!-- Quick Navigation / Stats Bar -->
        <div class="overview-bar card">
            <div class="stat-group">
                <div class="stat-item">
                    <span class="stat-icon">🏢</span>
                    <div>
                        <span class="stat-val">{{ faculties.length }}</span>
                        <span class="stat-lbl">คณะทั้งหมด</span>
                    </div>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                    <span class="stat-icon">📚</span>
                    <div>
                        <span class="stat-val">{{ majors.length }}</span>
                        <span class="stat-lbl">สาขาวิชาทั้งหมด</span>
                    </div>
                </div>
            </div>
            <div class="quick-links">
                <a href="#faculties-section" class="quick-btn">🏢 ไปที่ส่วนจัดการคณะ</a>
                <a href="#majors-section" class="quick-btn">📚 ไปที่ส่วนจัดการสาขาวิชา</a>
            </div>
        </div>

        <!-- ========================================== -->
        <!-- SECTION 1: จัดการข้อมูลคณะ (FACULTIES) -->
        <!-- ========================================== -->
        <section id="faculties-section" class="content-section">
            <div class="section-title-box">
                <div class="section-title-left">
                    <span class="section-badge badge-blue">ส่วนที่ 1</span>
                    <h3>🏢 จัดการข้อมูลคณะ (Faculties)</h3>
                </div>
                <span class="section-count">พบ {{ faculties.length }} คณะ</span>
            </div>

            <!-- Form: เพิ่ม / แก้ไข คณะ -->
            <div class="card form-card">
                <div class="form-header">
                    <h4>{{ editingFacultyId ? '✏️ แก้ไขข้อมูลคณะ' : '➕ เพิ่มคณะใหม่' }}</h4>
                    <span v-if="editingFacultyId" class="badge-editing">กำลังแก้ไข: {{ editingFacultyName }}</span>
                </div>
                <form @submit.prevent="saveFaculty" class="flex-form">
                    <input type="text" v-model="facultyNameInput"
                        placeholder="ระบุชื่อคณะ เช่น คณะวิทยาศาสตร์, คณะครุศาสตร์" required />
                    <button type="submit" :disabled="isFacultyLoading" :class="{ 'btn-update': editingFacultyId }">
                        {{ isFacultyLoading ? 'กำลังบันทึก...' : (editingFacultyId ? 'บันทึกการแก้ไข' : 'เพิ่มคณะ') }}
                    </button>
                    <button v-if="editingFacultyId" type="button" @click="cancelEditFaculty" class="btn-cancel"
                        :disabled="isFacultyLoading">
                        ยกเลิก
                    </button>
                </form>
            </div>

            <!-- Table: รายชื่อคณะ -->
            <div class="card table-card">
                <div class="table-header">
                    <h4>รายชื่อคณะทั้งหมด</h4>
                </div>

                <p v-if="pendingFaculties" class="loading-state">กำลังโหลดข้อมูลคณะ...</p>
                <div v-else class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width: 70px; text-align: center;">ลำดับ</th>
                                <th>ชื่อคณะ</th>
                                <th style="width: 160px;">จำนวนสาขาในสังกัด</th>
                                <th style="width: 140px; text-align: center;">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(fac, fIdx) in faculties" :key="fac.faculty_id">
                                <td class="text-center text-muted font-semibold">{{ fIdx + 1 }}</td>
                                <td class="font-medium">{{ fac.faculty_name }}</td>
                                <td>
                                    <span class="badge-count">
                                        {{ countMajorsInFaculty(fac.faculty_id) }} สาขาวิชา
                                    </span>
                                </td>
                                <td class="text-center">
                                    <div class="action-buttons">
                                        <button class="btn-edit" @click="startEditFaculty(fac)">แก้ไข</button>
                                        <button class="btn-danger" @click="deleteFaculty(fac.faculty_id)">ลบ</button>
                                    </div>
                                </td>
                            </tr>
                            <tr v-if="faculties.length === 0">
                                <td colspan="4" class="text-center empty-cell">ยังไม่มีข้อมูลคณะในระบบ</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <!-- Visual Divider -->
        <div class="section-divider">
            <span class="divider-line"></span>
            <span class="divider-icon">✦</span>
            <span class="divider-line"></span>
        </div>

        <!-- ========================================== -->
        <!-- SECTION 2: จัดการข้อมูลสาขาวิชา (MAJORS) -->
        <!-- ========================================== -->
        <section id="majors-section" class="content-section">
            <div class="section-title-box">
                <div class="section-title-left">
                    <span class="section-badge badge-green">ส่วนที่ 2</span>
                    <h3>📚 จัดการข้อมูลสาขาวิชา (Majors)</h3>
                </div>
                <span class="section-count">พบ {{ filteredMajors.length }} จาก {{ majors.length }} สาขาวิชา</span>
            </div>

            <!-- Form: เพิ่ม / แก้ไข สาขาวิชา -->
            <div class="card form-card">
                <div class="form-header">
                    <h4>{{ editingMajorId ? '✏️ แก้ไขข้อมูลสาขาวิชา' : '➕ เพิ่มสาขาวิชาใหม่' }}</h4>
                    <span v-if="editingMajorId" class="badge-editing">กำลังแก้ไข: {{ editingMajorName }}</span>
                </div>
                <form @submit.prevent="saveMajor" class="flex-form-grid">
                    <div class="form-col select-col">
                        <label class="form-label">คณะต้นสังกัด <span class="required">*</span></label>
                        <select v-model="majorForm.faculty_id" required>
                            <option value="" disabled>-- กรุณาเลือกคณะ --</option>
                            <option v-for="fac in faculties" :key="fac.faculty_id" :value="fac.faculty_id">
                                🏢 {{ fac.faculty_name }}
                            </option>
                        </select>
                    </div>

                    <div class="form-col input-col">
                        <label class="form-label">ชื่อสาขาวิชา <span class="required">*</span></label>
                        <input type="text" v-model="majorForm.major_name"
                            placeholder="ระบุชื่อสาขาวิชา เช่น เทคโนโลยีสารสนเทศ, วิทยาการคอมพิวเตอร์" required />
                    </div>

                    <div class="form-col btn-col">
                        <button type="submit" :disabled="isMajorLoading" :class="{ 'btn-update': editingMajorId }">
                            {{ isMajorLoading ? 'กำลังบันทึก...' : (editingMajorId ? 'บันทึกการแก้ไข' : 'เพิ่มสาขาวิชา')
                            }}
                        </button>
                        <button v-if="editingMajorId" type="button" @click="cancelEditMajor" class="btn-cancel"
                            :disabled="isMajorLoading">
                            ยกเลิก
                        </button>
                    </div>
                </form>
            </div>

            <!-- Table & Filter: รายชื่อสาขาวิชา -->
            <div class="card table-card">
                <div class="table-header-with-filter">
                    <div class="table-title-group">
                        <h4>รายชื่อสาขาวิชา</h4>
                        <label class="toggle-label">
                            <input type="checkbox" v-model="groupByFaculty" />
                            <span class="toggle-text">🏢 จัดกลุ่มตามคณะ</span>
                        </label>
                    </div>

                    <!-- ตัวกรองค้นหาและเลือกคณะ -->
                    <div class="filters-wrap">
                        <div class="filter-item">
                            <label>กรองตามคณะ:</label>
                            <select v-model="selectedFacultyFilter">
                                <option value="">-- ทุกคณะ (ทั้งหมด) --</option>
                                <option v-for="fac in faculties" :key="fac.faculty_id" :value="fac.faculty_id">
                                    {{ fac.faculty_name }}
                                </option>
                            </select>
                        </div>
                        <div class="filter-item search-item">
                            <input type="text" v-model="searchMajorQuery" placeholder="🔍 ค้นหาชื่อสาขาวิชา..." />
                        </div>
                    </div>
                </div>

                <!-- Controls for Grouped View: Expand / Collapse All -->
                <div v-if="groupByFaculty && groupedMajors.length > 0" class="group-controls-bar">
                    <span class="group-stats-label">แสดงแบบแยกตามคณะ ({{ groupedMajors.length }} คณะ)</span>
                    <div class="group-actions">
                        <button type="button" class="btn-text-action" @click="expandAllGroups">▼ ขยายทั้งหมด</button>
                        <span class="action-divider">|</span>
                        <button type="button" class="btn-text-action" @click="collapseAllGroups">▲ ย่อทั้งหมด</button>
                    </div>
                </div>

                <p v-if="pendingMajors" class="loading-state">กำลังโหลดข้อมูลสาขาวิชา...</p>

                <!-- VIEW 1: GROUPED BY FACULTY -->
                <div v-else-if="groupByFaculty" class="grouped-majors-container">
                    <div v-if="groupedMajors.length === 0" class="empty-cell text-center">
                        <span v-if="selectedFacultyFilter || searchMajorQuery">ไม่พบสาขาวิชาตามเงื่อนไขที่ค้นหา</span>
                        <span v-else>ยังไม่มีข้อมูลสาขาวิชาในระบบ</span>
                    </div>

                    <div v-for="group in groupedMajors" :key="group.faculty_id" class="faculty-group-card">
                        <!-- Group Header -->
                        <div class="faculty-group-header" @click="toggleGroup(group.faculty_id)">
                            <div class="faculty-group-title">
                                <span class="group-toggle-icon">{{ isGroupExpanded(group.faculty_id) ? '▼' : '▶' }}</span>
                                <span class="faculty-icon">🏢</span>
                                <span class="faculty-name-text">{{ group.faculty_name }}</span>
                                <span class="badge-count">{{ group.majors.length }} สาขาวิชา</span>
                            </div>
                            <span class="group-state-hint">{{ isGroupExpanded(group.faculty_id) ? 'คลิกเพื่อย่อ' : 'คลิกเพื่อดูรายชื่อสาขา' }}</span>
                        </div>

                        <!-- Group Body: Majors Table -->
                        <div v-show="isGroupExpanded(group.faculty_id)" class="faculty-group-body">
                            <div v-if="group.majors.length === 0" class="empty-group-majors">
                                ยังไม่มีสาขาวิชาในคณะนี้
                            </div>
                            <div v-else class="table-responsive">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th style="width: 70px; text-align: center;">ลำดับ</th>
                                            <th>ชื่อสาขาวิชา</th>
                                            <th style="width: 140px; text-align: center;">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(maj, mIdx) in group.majors" :key="maj.major_id">
                                            <td class="text-center text-muted font-semibold">{{ mIdx + 1 }}</td>
                                            <td class="font-medium">{{ maj.major_name }}</td>
                                            <td class="text-center">
                                                <div class="action-buttons">
                                                    <button class="btn-edit"
                                                        @click.stop="startEditMajor(maj)">แก้ไข</button>
                                                    <button class="btn-danger"
                                                        @click.stop="deleteMajor(maj.major_id)">ลบ</button>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- VIEW 2: FLAT TABLE (WHEN GROUPING IS OFF) -->
                <div v-else class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width: 70px; text-align: center;">ลำดับ</th>
                                <th>ชื่อสาขาวิชา</th>
                                <th>คณะต้นสังกัด</th>
                                <th style="width: 140px; text-align: center;">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(maj, mIdx) in filteredMajors" :key="maj.major_id">
                                <td class="text-center text-muted font-semibold">{{ mIdx + 1 }}</td>
                                <td class="font-medium">{{ maj.major_name }}</td>
                                <td>
                                    <span class="faculty-tag">
                                        🏢 {{ maj.faculty_name || 'ไม่ระบุคณะ' }}
                                    </span>
                                </td>
                                <td class="text-center">
                                    <div class="action-buttons">
                                        <button class="btn-edit" @click="startEditMajor(maj)">แก้ไข</button>
                                        <button class="btn-danger" @click="deleteMajor(maj.major_id)">ลบ</button>
                                    </div>
                                </td>
                            </tr>
                            <tr v-if="filteredMajors.length === 0">
                                <td colspan="4" class="text-center empty-cell">
                                    <span
                                        v-if="selectedFacultyFilter || searchMajorQuery">ไม่พบสาขาวิชาตามเงื่อนไขที่ค้นหา</span>
                                    <span v-else>ยังไม่มีข้อมูลสาขาวิชาในระบบ</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// ==========================================
// 1. FACULTIES STATE & LOGIC
// ==========================================
const facultyNameInput = ref('')
const editingFacultyId = ref(null)
const isFacultyLoading = ref(false)

// Fetch faculties
const {
    data: facResponse,
    pending: pendingFaculties,
    refresh: refreshFaculties
} = await useFetch('/api/admin/faculties')
const faculties = computed(() => facResponse.value?.data || [])

const saveFaculty = async () => {
    isFacultyLoading.value = true
    try {
        if (editingFacultyId.value) {
            await $fetch(`/api/admin/faculties/${editingFacultyId.value}`, {
                method: 'PUT',
                body: { faculty_name: facultyNameInput.value }
            })
            alert('อัปเดตข้อมูลคณะสำเร็จ')
        } else {
            await $fetch('/api/admin/faculties', {
                method: 'POST',
                body: { faculty_name: facultyNameInput.value }
            })
            alert('เพิ่มคณะเรียบร้อยแล้ว')
        }
        cancelEditFaculty()
        await Promise.all([refreshFaculties(), refreshMajors()])
    } catch (error) {
        alert('เกิดข้อผิดพลาด: ' + (error.data?.statusMessage || error.message))
    } finally {
        isFacultyLoading.value = false
    }
}

const startEditFaculty = (fac) => {
    editingFacultyId.value = fac.faculty_id
    facultyNameInput.value = fac.faculty_name
    // Scroll to faculty form smoothly
    const el = document.getElementById('faculties-section')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
}

const cancelEditFaculty = () => {
    editingFacultyId.value = null
    facultyNameInput.value = ''
}

const deleteFaculty = async (id) => {
    const count = countMajorsInFaculty(id)
    let confirmMsg = 'คุณแน่ใจหรือไม่ที่จะลบคณะนี้?'
    if (count > 0) {
        confirmMsg = `คำเตือน! คณะนี้มีสาขาวิชาผูกอยู่ ${count} สาขา การลบคณะจะส่งผลกระทบต่อสาขาวิชาและนักศึกษาที่สังกัดคณะนี้ด้วย ยืนยันการลบหรือไม่?`
    }

    if (!confirm(confirmMsg)) return

    isFacultyLoading.value = true
    try {
        await $fetch(`/api/admin/faculties/${id}`, { method: 'DELETE' })
        alert('ลบข้อมูลคณะสำเร็จ')
        if (editingFacultyId.value === id) cancelEditFaculty()
        await Promise.all([refreshFaculties(), refreshMajors()])
    } catch (error) {
        alert('เกิดข้อผิดพลาดในการลบ: ' + (error.data?.statusMessage || error.message))
    } finally {
        isFacultyLoading.value = false
    }
}

// ==========================================
// 2. MAJORS STATE & LOGIC
// ==========================================
const majorForm = ref({
    major_name: '',
    faculty_id: ''
})
const editingMajorId = ref(null)
const isMajorLoading = ref(false)

const selectedFacultyFilter = ref('')
const searchMajorQuery = ref('')

// Fetch majors
const {
    data: majResponse,
    pending: pendingMajors,
    refresh: refreshMajors
} = await useFetch('/api/admin/majors')
const majors = computed(() => majResponse.value?.data || [])

// Count how many majors belong to a specific faculty
const countMajorsInFaculty = (facultyId) => {
    return majors.value.filter(m => Number(m.faculty_id) === Number(facultyId)).length
}

// Computed editing name helpers (avoid showing DB IDs to user)
const editingFacultyName = computed(() => {
    if (!editingFacultyId.value) return ''
    return faculties.value.find(f => f.faculty_id === editingFacultyId.value)?.faculty_name || ''
})

const editingMajorName = computed(() => {
    if (!editingMajorId.value) return ''
    return majors.value.find(m => m.major_id === editingMajorId.value)?.major_name || ''
})

// Grouping by faculty state & logic (Default: Grouped, all groups collapsed)
const groupByFaculty = ref(true)
const expandedGroups = ref({}) // map of faculty_id -> boolean (empty by default = all collapsed)

const isGroupExpanded = (facId) => {
    // If searching text, auto-expand matching faculty groups unless explicitly collapsed
    if (searchMajorQuery.value.trim()) {
        return expandedGroups.value[facId] !== false
    }
    return !!expandedGroups.value[facId]
}

const toggleGroup = (facId) => {
    expandedGroups.value[facId] = !isGroupExpanded(facId)
}

const expandAllGroups = () => {
    const map = {}
    groupedMajors.value.forEach(g => {
        map[g.faculty_id] = true
    })
    expandedGroups.value = map
}

const collapseAllGroups = () => {
    const map = {}
    groupedMajors.value.forEach(g => {
        map[g.faculty_id] = false
    })
    expandedGroups.value = map
}

// Filtered majors by selected faculty dropdown and search text
const filteredMajors = computed(() => {
    return majors.value.filter(m => {
        // Faculty filter
        if (selectedFacultyFilter.value && Number(m.faculty_id) !== Number(selectedFacultyFilter.value)) {
            return false
        }
        // Search query filter
        if (searchMajorQuery.value.trim()) {
            const q = searchMajorQuery.value.trim().toLowerCase()
            const matchName = (m.major_name || '').toLowerCase().includes(q)
            const matchFac = (m.faculty_name || '').toLowerCase().includes(q)
            return matchName || matchFac
        }
        return true
    })
})

// Grouped majors computed from filteredMajors
const groupedMajors = computed(() => {
    const map = new Map()

    // If not searching and no faculty filter, populate all known faculties in default order
    if (!searchMajorQuery.value.trim() && !selectedFacultyFilter.value) {
        for (const f of faculties.value) {
            map.set(f.faculty_id, {
                faculty_id: f.faculty_id,
                faculty_name: f.faculty_name,
                majors: []
            })
        }
    }

    for (const m of filteredMajors.value) {
        const fid = m.faculty_id || 0
        if (!map.has(fid)) {
            map.set(fid, {
                faculty_id: fid,
                faculty_name: m.faculty_name || 'ไม่ระบุคณะ',
                majors: []
            })
        }
        map.get(fid).majors.push(m)
    }

    return Array.from(map.values()).filter(g => {
        if (searchMajorQuery.value.trim() || selectedFacultyFilter.value) {
            return g.majors.length > 0
        }
        return true
    })
})

const saveMajor = async () => {
    isMajorLoading.value = true
    try {
        if (editingMajorId.value) {
            await $fetch(`/api/admin/majors/${editingMajorId.value}`, {
                method: 'PUT',
                body: majorForm.value
            })
            alert('อัปเดตข้อมูลสาขาวิชาสำเร็จ')
        } else {
            await $fetch('/api/admin/majors', {
                method: 'POST',
                body: majorForm.value
            })
            alert('เพิ่มสาขาวิชาเรียบร้อยแล้ว')
        }
        cancelEditMajor()
        await refreshMajors()
    } catch (error) {
        alert('เกิดข้อผิดพลาด: ' + (error.data?.statusMessage || error.message))
    } finally {
        isMajorLoading.value = false
    }
}

const startEditMajor = (maj) => {
    editingMajorId.value = maj.major_id
    majorForm.value = {
        major_name: maj.major_name,
        faculty_id: maj.faculty_id
    }
    // Ensure the faculty group is expanded so the user sees the item being edited
    if (maj.faculty_id) {
        expandedGroups.value[maj.faculty_id] = true
    }
    // Scroll to major form smoothly
    const el = document.getElementById('majors-section')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
}

const cancelEditMajor = () => {
    editingMajorId.value = null
    majorForm.value = { major_name: '', faculty_id: '' }
}

const deleteMajor = async (id) => {
    if (!confirm('ยืนยันการลบสาขาวิชานี้?')) return
    isMajorLoading.value = true
    try {
        await $fetch(`/api/admin/majors/${id}`, { method: 'DELETE' })
        alert('ลบสาขาวิชาสำเร็จ')
        if (editingMajorId.value === id) cancelEditMajor()
        await refreshMajors()
    } catch (error) {
        alert('เกิดข้อผิดพลาดในการลบ: ' + (error.data?.statusMessage || error.message))
    } finally {
        isMajorLoading.value = false
    }
}
</script>

<style scoped>
.admin-container {
    padding: 2rem;
    max-width: 960px;
    margin: 0 auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1e293b;
    background-color: #f8fafc;
    min-height: 100vh;
}

/* Page Header */
.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.75rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.page-header h2 {
    margin: 0;
    font-size: 1.75rem;
    color: #0f172a;
}

.subtitle {
    margin: 0.35rem 0 0;
    color: #64748b;
    font-size: 0.9rem;
}

.btn-back {
    background: white;
    border: 1px solid #cbd5e1;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    color: #3b82f6;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.15s;
}

.btn-back:hover {
    background: #eff6ff;
    border-color: #93c5fd;
}

/* Overview Bar */
.overview-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    margin-bottom: 2rem;
    background: white;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    flex-wrap: wrap;
    gap: 1rem;
}

.stat-group {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.stat-icon {
    font-size: 1.75rem;
}

.stat-val {
    display: block;
    font-size: 1.4rem;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.1;
}

.stat-lbl {
    font-size: 0.8rem;
    color: #64748b;
}

.stat-divider {
    width: 1px;
    height: 36px;
    background: #e2e8f0;
}

.quick-links {
    display: flex;
    gap: 0.75rem;
}

.quick-btn {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 0.4rem 0.85rem;
    border-radius: 6px;
    font-size: 0.825rem;
    color: #334155;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.15s;
}

.quick-btn:hover {
    background: #e2e8f0;
    color: #1e293b;
}

/* Content Sections */
.content-section {
    margin-bottom: 2.5rem;
}

.section-title-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.section-title-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.section-title-left h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #0f172a;
}

.section-badge {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.2rem 0.55rem;
    border-radius: 9999px;
    text-transform: uppercase;
}

.badge-blue {
    background: #dbeafe;
    color: #1d4ed8;
}

.badge-green {
    background: #dcfce7;
    color: #15803d;
}

.section-count {
    font-size: 0.825rem;
    color: #64748b;
    font-weight: 500;
}

/* Cards */
.card {
    background: white;
    padding: 1.5rem;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    margin-bottom: 1.5rem;
}

.form-card {
    background: #ffffff;
}

.form-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.form-header h4 {
    margin: 0;
    font-size: 1.05rem;
    color: #1e293b;
}

.badge-editing {
    font-size: 0.75rem;
    background: #fef3c7;
    color: #b45309;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;
}

/* Form Styles */
.flex-form {
    display: flex;
    gap: 0.75rem;
}

.flex-form input {
    flex-grow: 1;
}

.flex-form-grid {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.form-col {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.select-col {
    flex: 1 1 240px;
}

.input-col {
    flex: 2 1 300px;
}

.btn-col {
    display: flex;
    gap: 0.5rem;
}

.form-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #475569;
}

.required {
    color: #ef4444;
}

input,
select {
    padding: 0.55rem 0.75rem;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 0.9rem;
    outline: none;
    font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
}

input:focus,
select:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

button {
    padding: 0.55rem 1.15rem;
    background-color: #10b981;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
    font-size: 0.9rem;
    font-weight: 600;
    transition: background-color 0.15s;
}

button:hover:not(:disabled) {
    background-color: #059669;
}

button:disabled {
    background-color: #94a3b8;
    cursor: not-allowed;
}

.btn-update {
    background-color: #f59e0b;
}

.btn-update:hover:not(:disabled) {
    background-color: #d97706;
}

.btn-cancel {
    background-color: #64748b;
}

.btn-cancel:hover:not(:disabled) {
    background-color: #475569;
}

/* Table Header with Filters */
.table-header {
    margin-bottom: 1rem;
}

.table-header h4,
.table-header-with-filter h4 {
    margin: 0;
    font-size: 1rem;
    color: #334155;
}

.table-header-with-filter {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.filters-wrap {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.filter-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: #475569;
}

.filter-item select,
.search-item input {
    padding: 0.35rem 0.65rem;
    font-size: 0.825rem;
}

/* Table */
.table-responsive {
    overflow-x: auto;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
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
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.825rem;
    color: #475569;
}

.font-medium {
    font-weight: 600;
    color: #0f172a;
}

.badge-count {
    background: #eff6ff;
    color: #2563eb;
    padding: 0.2rem 0.55rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 600;
}

.faculty-tag {
    background: #f1f5f9;
    color: #334155;
    padding: 0.2rem 0.55rem;
    border-radius: 4px;
    font-size: 0.8rem;
}

.action-buttons {
    display: flex;
    justify-content: center;
    gap: 0.4rem;
}

.btn-edit {
    background-color: #f59e0b;
    padding: 0.3rem 0.6rem;
    font-size: 0.8rem;
    border-radius: 4px;
}

.btn-edit:hover {
    background-color: #d97706;
}

.btn-danger {
    background-color: #ef4444;
    padding: 0.3rem 0.6rem;
    font-size: 0.8rem;
    border-radius: 4px;
}

.btn-danger:hover {
    background-color: #dc2626;
}

.text-center {
    text-align: center;
}

.empty-cell {
    padding: 2rem 1rem;
    color: #94a3b8;
}

.loading-state {
    text-align: center;
    color: #64748b;
    padding: 1.5rem;
}

/* Visual Section Divider */
.section-divider {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 2.5rem 0;
}

.divider-line {
    flex-grow: 1;
    height: 1px;
    background: #e2e8f0;
}

.divider-icon {
    color: #94a3b8;
    font-size: 0.9rem;
}

/* Grouping & Title Toolbar */
.table-title-group {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.toggle-label {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    cursor: pointer;
    font-size: 0.825rem;
    font-weight: 600;
    color: #1e293b;
    background: #f1f5f9;
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    user-select: none;
    transition: all 0.15s;
}

.toggle-label:hover {
    background: #e2e8f0;
}

.toggle-label input[type="checkbox"] {
    cursor: pointer;
    accent-color: #2563eb;
    width: 15px;
    height: 15px;
}

.group-controls-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0.85rem;
    margin-bottom: 1rem;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    font-size: 0.825rem;
}

.group-stats-label {
    color: #64748b;
    font-weight: 600;
}

.group-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.btn-text-action {
    background: transparent;
    color: #2563eb;
    border: none;
    padding: 0.2rem 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    border-radius: 4px;
}

.btn-text-action:hover {
    background: #eff6ff;
    text-decoration: underline;
}

.action-divider {
    color: #cbd5e1;
}

/* Faculty Group Cards */
.grouped-majors-container {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
}

.faculty-group-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    background: white;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    transition: border-color 0.15s;
}

.faculty-group-card:hover {
    border-color: #cbd5e1;
}

.faculty-group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.85rem 1.15rem;
    background: #f8fafc;
    cursor: pointer;
    user-select: none;
    border-bottom: 1px solid #f1f5f9;
    transition: background-color 0.15s;
}

.faculty-group-header:hover {
    background: #f1f5f9;
}

.faculty-group-title {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-wrap: wrap;
}

.faculty-icon {
    font-size: 1.1rem;
}

.faculty-name-text {
    font-weight: 700;
    color: #0f172a;
    font-size: 0.95rem;
}

.group-toggle-icon {
    font-size: 0.8rem;
    color: #64748b;
    width: 16px;
    display: inline-block;
}

.group-state-hint {
    font-size: 0.775rem;
    color: #94a3b8;
}

.faculty-group-body {
    background: white;
}

.empty-group-majors {
    padding: 1.25rem;
    text-align: center;
    color: #94a3b8;
    font-size: 0.85rem;
}

.text-muted {
    color: #64748b;
}

.font-semibold {
    font-weight: 600;
}
</style>
