<template>
  <div class="admin-container">
    <!-- Header -->
    <div class="header">
      <div>
        <h2>🎓 จัดการข้อมูลนักศึกษา (Students)</h2>
        <p class="subtitle">จัดการประวัตินักศึกษา เพิ่มเดี่ยว หรือนำเข้าไฟล์ทีละสาขาวิชา</p>
      </div>
      <div class="header-actions">
        <button class="btn-import-open" @click="openImportModal">
          📥 นำเข้ารายชื่อนักศึกษา (Excel / JSON)
        </button>
        <NuxtLink to="/admin" class="back-link">← กลับหน้าแรก Admin</NuxtLink>
      </div>
    </div>

    <!-- ฟอร์มเพิ่ม/แก้ไขเดี่ยว -->
    <div class="card form-card">
      <div class="form-title-row">
        <h3>{{ editingId ? '✏️ แก้ไขข้อมูลนักศึกษา' : '➕ เพิ่มนักศึกษาเดี่ยว' }}</h3>
        <span v-if="editingId" class="editing-badge">กำลังแก้ไขรหัส: {{ editingId }}</span>
      </div>
      <p v-if="!editingId" class="help-text">
        💡 ระบบจะทำการสร้างบัญชีผู้ใช้ (User) ให้อัตโนมัติ โดยมี Username และ รหัสผ่านเริ่มต้น คือ <strong>รหัสนักศึกษา</strong>
      </p>

      <form @submit.prevent="saveStudent" class="flex-form">
        <input 
          type="text" 
          v-model="form.student_id" 
          placeholder="รหัสนักศึกษา (เช่น 68011...)" 
          required
          :disabled="editingId !== null" 
        />
        <input type="text" v-model="form.first_name" placeholder="ชื่อ" required />
        <input type="text" v-model="form.last_name" placeholder="นามสกุล" required />

        <!-- เลือกคณะ -->
        <select v-model="form.faculty_id" @change="onFacultyChange" required>
          <option value="" disabled>-- เลือกคณะ --</option>
          <option v-for="fac in faculties" :key="fac.faculty_id" :value="fac.faculty_id">
            🏢 {{ fac.faculty_name }}
          </option>
        </select>

        <!-- เลือกสาขาวิชา (กรองตามคณะที่เลือก) -->
        <select v-model="form.major_id" required :disabled="!form.faculty_id">
          <option value="" disabled>
            -- {{ form.faculty_id ? 'เลือกสาขาวิชา' : 'กรุณาเลือกคณะก่อน' }} --
          </option>
          <option v-for="maj in filteredFormMajors" :key="maj.major_id" :value="maj.major_id">
            🎓 {{ maj.major_name }}
          </option>
        </select>

        <div class="form-btn-group">
          <button type="submit" :disabled="isLoading" :class="{ 'btn-update': editingId }">
            {{ isLoading ? 'กำลังบันทึก...' : (editingId ? 'บันทึกการแก้ไข' : 'เพิ่มนักศึกษา') }}
          </button>
          <button v-if="editingId" type="button" @click="cancelEdit" class="btn-cancel" :disabled="isLoading">
            ยกเลิก
          </button>
        </div>
      </form>
    </div>

    <!-- ตารางรายชื่อนักศึกษาทั้งหมด พร้อมตัวกรอง -->
    <div class="card table-card">
      <div class="table-card-header">
        <div>
          <h3>รายชื่อนักศึกษาในระบบ</h3>
          <span class="count-badge">ทั้งหมด {{ filteredTableStudents.length }} คน</span>
        </div>

        <!-- ตัวกรองในตาราง -->
        <div class="table-filters">
          <select v-model="tableFacultyFilter" @change="tableMajorFilter = ''">
            <option value="">-- ทุกคณะ --</option>
            <option v-for="fac in faculties" :key="fac.faculty_id" :value="fac.faculty_id">
              {{ fac.faculty_name }}
            </option>
          </select>

          <select v-model="tableMajorFilter" :disabled="!tableFacultyFilter">
            <option value="">-- ทุกสาขาวิชา --</option>
            <option v-for="maj in filteredTableMajors" :key="maj.major_id" :value="maj.major_id">
              {{ maj.major_name }}
            </option>
          </select>

          <input 
            type="text" 
            v-model="tableSearchQuery" 
            placeholder="🔍 ค้นหารหัสนักศึกษา หรือชื่อ-นามสกุล..." 
            class="search-input"
          />
        </div>
      </div>

      <p v-if="pending" class="loading-state">กำลังโหลดข้อมูลนักศึกษา...</p>
      <div v-else class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 130px;">รหัสนักศึกษา</th>
              <th>ชื่อ-นามสกุล</th>
              <th>คณะ</th>
              <th>สาขาวิชา</th>
              <th style="width: 120px;">ผู้ใช้งาน (Auto)</th>
              <th style="width: 100px; text-align: center;">ชม. กิจกรรม</th>
              <th style="width: 130px; text-align: center;">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stu in filteredTableStudents" :key="stu.student_id">
              <td><code>{{ stu.student_id }}</code></td>
              <td class="font-medium">{{ stu.first_name }} {{ stu.last_name }}</td>
              <td>{{ stu.faculty_name || '-' }}</td>
              <td>{{ stu.major_name || '-' }}</td>
              <td><span class="user-pill">👤 {{ stu.username }}</span></td>
              <td class="text-center"><span class="hours-tag">{{ stu.accumulated_hours }} ชม.</span></td>
              <td class="text-center">
                <div class="action-buttons">
                  <button class="btn-edit" @click="startEdit(stu)">แก้ไข</button>
                  <button class="btn-danger" @click="deleteStudent(stu.student_id)">ลบ</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredTableStudents.length === 0">
              <td colspan="7" class="text-center empty-cell">
                <span v-if="tableSearchQuery || tableFacultyFilter || tableMajorFilter">ไม่พบข้อมูลนักศึกษาตามเงื่อนไขที่ค้นหา</span>
                <span v-else>ยังไม่มีข้อมูลนักศึกษาในระบบ</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL: นำเข้าไฟล์ EXCEL / CSV / JSON       -->
    <!-- ========================================== -->
    <div v-if="showImportModal" class="modal-backdrop" @click.self="closeImportModal">
      <div class="modal-card modal-import">
        <div class="modal-header">
          <div>
            <h3>📥 นำเข้ารายชื่อนักศึกษาด้วยไฟล์ (Batch Import)</h3>
            <p class="modal-subtitle">กำหนดคณะและสาขาวิชา แล้วนำเข้าไฟล์ Excel (.xlsx, .xls), CSV, หรือ JSON</p>
          </div>
          <button class="btn-close" @click="closeImportModal">&times;</button>
        </div>

        <div class="modal-body">
          <!-- STEP 1: เลือกคณะและสาขาวิชา -->
          <div class="step-box">
            <div class="step-title">
              <span class="step-num">1</span>
              <h4>เลือกคณะและสาขาวิชาเป้าหมาย <span class="required">*</span></h4>
            </div>
            <p class="step-desc">รายชื่อนักศึกษาทั้งหมดในไฟล์ที่นำเข้าครั้งนี้ จะถูกบันทึกเข้าสู่สาขาวิชาและคณะที่ท่านเลือกนี้</p>
            
            <div class="import-scope-selectors">
              <div class="scope-col">
                <label>คณะ:</label>
                <select v-model="importFacultyId" @change="onImportFacultyChange" required>
                  <option value="" disabled>-- เลือกคณะ --</option>
                  <option v-for="fac in faculties" :key="fac.faculty_id" :value="fac.faculty_id">
                    🏢 {{ fac.faculty_name }}
                  </option>
                </select>
              </div>

              <div class="scope-col">
                <label>สาขาวิชา:</label>
                <select v-model="importMajorId" :disabled="!importFacultyId" required>
                  <option value="" disabled>
                    -- {{ importFacultyId ? 'เลือกสาขาวิชา' : 'กรุณาเลือกคณะก่อน' }} --
                  </option>
                  <option v-for="maj in filteredImportMajors" :key="maj.major_id" :value="maj.major_id">
                    🎓 {{ maj.major_name }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- STEP 2: อัปโหลดไฟล์ & ดาวน์โหลดแม่แบบ -->
          <div class="step-box">
            <div class="step-title">
              <span class="step-num">2</span>
              <h4>อัปโหลดไฟล์ข้อมูล (Excel / CSV / JSON)</h4>
            </div>

            <div class="template-actions">
              <span>ดาวน์โหลดไฟล์แม่แบบตัวอย่าง:</span>
              <button type="button" class="btn-tpl" @click="downloadExcelTemplate">
                📊 แม่แบบ Excel (.xlsx)
              </button>
              <button type="button" class="btn-tpl" @click="downloadJsonTemplate">
                { } แม่แบบ JSON (.json)
              </button>
            </div>

            <div 
              class="dropzone" 
              :class="{ 'dropzone-active': isDragging, 'has-file': uploadedFileName }"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleFileDrop"
            >
              <input 
                type="file" 
                ref="fileInputRef" 
                class="file-input-hidden" 
                accept=".xlsx, .xls, .csv, .json" 
                @change="handleFileInputChange" 
              />
              <div class="dropzone-content" @click="triggerFileInput">
                <span class="upload-icon">{{ uploadedFileName ? '📄' : '📁' }}</span>
                <div v-if="uploadedFileName">
                  <p class="file-name"><strong>ไฟล์:</strong> {{ uploadedFileName }}</p>
                  <p class="file-hint">คลิกเพื่อเปลี่ยนไฟล์ใหม่</p>
                </div>
                <div v-else>
                  <p class="drop-text">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
                  <p class="file-hint">รองรับ .xlsx, .xls, .csv, .json (ไม่เกิน 10MB)</p>
                </div>
              </div>
            </div>

            <div v-if="isParsing" class="parsing-indicator">
              ⏳ กำลังอ่านและตรวจสอบข้อมูลในไฟล์ กรุณารอสักครู่...
            </div>
          </div>

          <!-- STEP 3: ตรวจสอบและดูตัวอย่างข้อมูลก่อนนำเข้า (PREVIEW & VALIDATION) -->
          <div v-if="parsedStudents.length > 0" class="step-box preview-box">
            <div class="step-title">
              <span class="step-num">3</span>
              <h4>ตรวจสอบข้อมูลก่อนเพิ่มเข้าฐานข้อมูล (Pre-Import Validation)</h4>
            </div>

            <!-- สรุปสถานะการตรวจสอบ -->
            <div class="validation-summary-grid">
              <div class="summary-pill pill-total">
                <span class="num">{{ parsedStudents.length }}</span>
                <span class="lbl">พบในไฟล์</span>
              </div>
              <div class="summary-pill pill-valid">
                <span class="num">{{ validCount }}</span>
                <span class="lbl">✅ พร้อมนำเข้า</span>
              </div>
              <div class="summary-pill pill-warn" v-if="dbDupCount > 0">
                <span class="num">{{ dbDupCount }}</span>
                <span class="lbl">⚠️ ซ้ำในระบบ</span>
              </div>
              <div class="summary-pill pill-warn" v-if="fileDupCount > 0">
                <span class="num">{{ fileDupCount }}</span>
                <span class="lbl">⚠️ ซ้ำในไฟล์</span>
              </div>
              <div class="summary-pill pill-err" v-if="invalidFormatCount > 0">
                <span class="num">{{ invalidFormatCount }}</span>
                <span class="lbl">❌ ข้อมูลไม่ครบ</span>
              </div>
            </div>

            <!-- แท็บตัวกรองตาราง Preview -->
            <div class="preview-toolbar">
              <div class="preview-filters">
                <button 
                  type="button" 
                  class="filter-tab-btn" 
                  :class="{ active: previewFilter === 'all' }"
                  @click="previewFilter = 'all'"
                >
                  ทั้งหมด ({{ parsedStudents.length }})
                </button>
                <button 
                  type="button" 
                  class="filter-tab-btn" 
                  :class="{ active: previewFilter === 'valid' }"
                  @click="previewFilter = 'valid'"
                >
                  พร้อมนำเข้า ({{ validCount }})
                </button>
                <button 
                  type="button" 
                  class="filter-tab-btn" 
                  :class="{ active: previewFilter === 'problem' }"
                  @click="previewFilter = 'problem'"
                  v-if="(parsedStudents.length - validCount) > 0"
                >
                  มีปัญหา/ซ้ำ ({{ parsedStudents.length - validCount }})
                </button>
              </div>

              <div class="selection-actions">
                <button type="button" class="btn-text" @click="selectAllValid(true)">
                  ☑️ เลือกรายการที่พร้อมทั้งหมด
                </button>
                <button type="button" class="btn-text" @click="selectAllValid(false)">
                  ⬜ ยกเลิกเลือกทั้งหมด
                </button>
              </div>
            </div>

            <!-- ตารางพรีวิวข้อมูล -->
            <div class="table-responsive preview-table-wrap">
              <table class="data-table preview-table">
                <thead>
                  <tr>
                    <th style="width: 40px; text-align: center;">นำเข้า</th>
                    <th style="width: 140px;">สถานะตรวจสอบ</th>
                    <th style="width: 130px;">รหัสนักศึกษา</th>
                    <th>ชื่อ</th>
                    <th>นามสกุล</th>
                    <th>สาขาเป้าหมาย</th>
                    <th style="width: 80px; text-align: center;">ชม.</th>
                    <th style="width: 50px; text-align: center;">ลบ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="(row, idx) in displayedPreviewStudents" 
                    :key="row.student_id + '-' + idx"
                    :class="{ 'row-disabled': !row.selected, 'row-error': row.status !== 'valid' }"
                  >
                    <td class="text-center">
                      <input 
                        type="checkbox" 
                        v-model="row.selected" 
                        :disabled="row.status !== 'valid'"
                      />
                    </td>
                    <td>
                      <span class="val-badge" :class="'badge-' + row.status">
                        {{ getStatusText(row.status) }}
                      </span>
                    </td>
                    <td><code>{{ row.student_id || '(ไม่มีรหัส)' }}</code></td>
                    <td>{{ row.first_name || '-' }}</td>
                    <td>{{ row.last_name || '-' }}</td>
                    <td>
                      <small class="target-scope-tag">
                        {{ selectedMajorName || 'ยังไม่ระบุ' }}
                      </small>
                    </td>
                    <td class="text-center">{{ row.accumulated_hours || 0 }}</td>
                    <td class="text-center">
                      <button type="button" class="btn-row-del" @click="removePreviewRow(row)" title="ลบรายการนี้ออก">
                        &times;
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="modal-footer">
          <button type="button" class="btn-cancel" @click="closeImportModal" :disabled="isImporting">
            ยกเลิก
          </button>
          <button 
            type="button" 
            class="btn-confirm-import"
            :disabled="!canSubmitImport || isImporting"
            @click="executeBatchImport"
          >
            {{ isImporting ? 'กำลังบันทึกข้อมูลเข้าฐานข้อมูล...' : `ยืนยันนำเข้ารายชื่อ (${selectedValidCount} คน)` }}
          </button>
        </div>
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

// Fetch Students
const { data: apiResponse, pending, refresh } = await useFetch('/api/admin/students')
const students = computed(() => apiResponse.value?.data || [])

// ==========================================
// 2. MAIN TABLE FILTERS
// ==========================================
const tableFacultyFilter = ref('')
const tableMajorFilter = ref('')
const tableSearchQuery = ref('')

const filteredTableMajors = computed(() => {
  if (!tableFacultyFilter.value) return []
  return majors.value.filter(m => Number(m.faculty_id) === Number(tableFacultyFilter.value))
})

const filteredTableStudents = computed(() => {
  return students.value.filter(stu => {
    if (tableFacultyFilter.value && Number(stu.faculty_id) !== Number(tableFacultyFilter.value)) {
      return false
    }
    if (tableMajorFilter.value && Number(stu.major_id) !== Number(tableMajorFilter.value)) {
      return false
    }
    if (tableSearchQuery.value.trim()) {
      const q = tableSearchQuery.value.trim().toLowerCase()
      const matchId = (stu.student_id || '').toLowerCase().includes(q)
      const matchName = `${stu.first_name || ''} ${stu.last_name || ''}`.toLowerCase().includes(q)
      return matchId || matchName
    }
    return true
  })
})

// Single student form major filter
const filteredFormMajors = computed(() => {
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
}

// ==========================================
// 3. SINGLE STUDENT CRUD
// ==========================================
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
      alert('อัปเดตข้อมูลนักศึกษาสำเร็จ')
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
    alert('เกิดข้อผิดพลาด: ' + (error.data?.statusMessage || error.message))
  } finally {
    isLoading.value = false
  }
}

const startEdit = (stu) => {
  editingId.value = stu.student_id
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
    accumulated_hours: stu.accumulated_hours || 0
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

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
}

const deleteStudent = async (id) => {
  if (!confirm(`ยืนยันการลบนักศึกษารหัส ${id} ? ระบบจะลบบัญชีผู้ใช้ที่ผูกอยู่ด้วย`)) return
  isLoading.value = true
  try {
    await $fetch(`/api/admin/students/${id}`, { method: 'DELETE' })
    alert('ลบข้อมูลนักศึกษาสำเร็จ')
    if (editingId.value === id) cancelEdit()
    refresh()
  } catch (error) {
    alert('เกิดข้อผิดพลาดในการลบ: ' + (error.data?.statusMessage || error.message))
  } finally {
    isLoading.value = false
  }
}

// ==========================================
// 4. BATCH IMPORT STATE & METHODS
// ==========================================
const showImportModal = ref(false)
const importFacultyId = ref('')
const importMajorId = ref('')
const uploadedFileName = ref('')
const fileInputRef = ref(null)
const isDragging = ref(false)
const isParsing = ref(false)
const isImporting = ref(false)
const previewFilter = ref('all') // 'all' | 'valid' | 'problem'

// Parsed students list for preview
const parsedStudents = ref([])

const filteredImportMajors = computed(() => {
  if (!importFacultyId.value) return []
  return majors.value.filter(m => Number(m.faculty_id) === Number(importFacultyId.value))
})

const onImportFacultyChange = () => {
  importMajorId.value = ''
}

const selectedMajorName = computed(() => {
  const m = majors.value.find(maj => Number(maj.major_id) === Number(importMajorId.value))
  return m ? m.major_name : ''
})

const openImportModal = () => {
  showImportModal.value = true
  // Reset previous import state
  importFacultyId.value = ''
  importMajorId.value = ''
  uploadedFileName.value = ''
  parsedStudents.value = []
  previewFilter.value = 'all'
}

const closeImportModal = (force = false) => {
  if (isImporting.value && !force) return
  showImportModal.value = false
  uploadedFileName.value = ''
  parsedStudents.value = []
}

const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
    fileInputRef.value.click()
  }
}

// Load SheetJS dynamically
const loadXLSX = async () => {
  if (typeof window !== 'undefined' && window.XLSX) {
    return window.XLSX
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
    script.onload = () => resolve(window.XLSX)
    script.onerror = () => reject(new Error('ไม่สามารถโหลดไลบรารีอ่านไฟล์ Excel ได้'))
    document.head.appendChild(script)
  })
}

// Normalize row data keys flexibly
const normalizeRow = (raw) => {
  const keys = Object.keys(raw)
  const findVal = (...aliases) => {
    for (const a of aliases) {
      const foundKey = keys.find(k => k.trim().toLowerCase() === a.toLowerCase())
      if (foundKey && raw[foundKey] !== undefined && raw[foundKey] !== null) {
        return String(raw[foundKey]).trim()
      }
    }
    return ''
  }

  const student_id = findVal('student_id', 'รหัสนักศึกษา', 'รหัส', 'id', 'studentid', 'student_code')
  let first_name = findVal('first_name', 'ชื่อ', 'firstname', 'fname')
  let last_name = findVal('last_name', 'นามสกุล', 'lastname', 'lname')

  // If full name in single column
  if (!first_name && !last_name) {
    const fullName = findVal('ชื่อ-นามสกุล', 'ชื่อ นามสกุล', 'name', 'fullname')
    if (fullName) {
      const parts = fullName.split(/\s+/)
      first_name = parts[0] || ''
      last_name = parts.slice(1).join(' ') || ''
    }
  }

  const hoursStr = findVal('accumulated_hours', 'ชั่วโมงกิจกรรม', 'ชั่วโมง', 'hours')
  const accumulated_hours = Number(hoursStr) || 0

  return {
    student_id,
    first_name,
    last_name,
    accumulated_hours,
    status: 'valid',
    selected: true
  }
}

// Handle File Select / Drop
const handleFileInputChange = (e) => {
  const files = e.target.files
  if (files && files[0]) processUploadedFile(files[0])
}

const handleFileDrop = (e) => {
  isDragging.value = false
  const files = e.dataTransfer.files
  if (files && files[0]) processUploadedFile(files[0])
}

const processUploadedFile = async (file) => {
  uploadedFileName.value = file.name
  isParsing.value = true
  parsedStudents.value = []

  try {
    const ext = file.name.split('.').pop().toLowerCase()
    let rawRows = []

    if (ext === 'json') {
      const text = await file.text()
      const json = JSON.parse(text)
      rawRows = Array.isArray(json) ? json : (json.students || [])
    } else {
      // Excel (.xlsx, .xls) or CSV
      const XLSX = await loadXLSX()
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
    }

    if (rawRows.length === 0) {
      alert('ไม่พบข้อมูลในไฟล์ที่เลือก กรุณาตรวจสอบไฟล์')
      return
    }

    // 1. Normalize Rows
    const normalized = rawRows.map(normalizeRow).filter(r => r.student_id || r.first_name)

    // 2. Validate intra-file duplicates
    const seenFileIds = new Set()
    const duplicateFileIds = new Set()
    for (const r of normalized) {
      if (r.student_id) {
        if (seenFileIds.has(r.student_id)) {
          duplicateFileIds.add(r.student_id)
        }
        seenFileIds.add(r.student_id)
      }
    }

    // 3. Query Database for existing IDs
    const candidateIds = Array.from(seenFileIds)
    let existingDbIds = new Set()
    if (candidateIds.length > 0) {
      try {
        const checkRes = await $fetch('/api/admin/students/check-ids', {
          method: 'POST',
          body: { student_ids: candidateIds }
        })
        existingDbIds = new Set(checkRes.existing_ids || [])
      } catch (err) {
        console.error('Error verifying IDs against DB:', err)
      }
    }

    // 4. Set final status for each row
    const validatedRows = normalized.map(row => {
      if (!row.student_id || !row.first_name || !row.last_name) {
        return { ...row, status: 'error_missing', selected: false }
      }
      if (existingDbIds.has(row.student_id)) {
        return { ...row, status: 'error_dup_db', selected: false }
      }
      if (duplicateFileIds.has(row.student_id)) {
        return { ...row, status: 'error_dup_file', selected: false }
      }
      return { ...row, status: 'valid', selected: true }
    })

    parsedStudents.value = validatedRows

  } catch (err) {
    alert('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + err.message)
    uploadedFileName.value = ''
  } finally {
    isParsing.value = false
  }
}

// Statistics
const validCount = computed(() => parsedStudents.value.filter(r => r.status === 'valid').length)
const dbDupCount = computed(() => parsedStudents.value.filter(r => r.status === 'error_dup_db').length)
const fileDupCount = computed(() => parsedStudents.value.filter(r => r.status === 'error_dup_file').length)
const invalidFormatCount = computed(() => parsedStudents.value.filter(r => r.status === 'error_missing').length)
const selectedValidCount = computed(() => parsedStudents.value.filter(r => r.status === 'valid' && r.selected).length)

const canSubmitImport = computed(() => {
  return importMajorId.value && selectedValidCount.value > 0
})

const displayedPreviewStudents = computed(() => {
  if (previewFilter.value === 'valid') {
    return parsedStudents.value.filter(r => r.status === 'valid')
  }
  if (previewFilter.value === 'problem') {
    return parsedStudents.value.filter(r => r.status !== 'valid')
  }
  return parsedStudents.value
})

const getStatusText = (status) => {
  switch (status) {
    case 'valid': return '✅ พร้อมนำเข้า'
    case 'error_dup_db': return '⚠️ มีในระบบแล้ว'
    case 'error_dup_file': return '⚠️ รหัสซ้ำในไฟล์'
    case 'error_missing': return '❌ ข้อมูลไม่ครบ'
    default: return status
  }
}

const selectAllValid = (val) => {
  for (const row of parsedStudents.value) {
    if (row.status === 'valid') {
      row.selected = val
    }
  }
}

const removePreviewRow = (targetRow) => {
  parsedStudents.value = parsedStudents.value.filter(r => r !== targetRow)
}

// Submit Batch Import
const executeBatchImport = async () => {
  if (!importMajorId.value) {
    alert('กรุณาเลือกคณะและสาขาวิชาเป้าหมายก่อน')
    return
  }

  const toImport = parsedStudents.value.filter(r => r.status === 'valid' && r.selected)
  if (toImport.length === 0) {
    alert('ไม่มีรายการที่พร้อมนำเข้า')
    return
  }

  if (!confirm(`ยืนยันการนำเข้ารายชื่อนักศึกษาจำนวน ${toImport.length} คน เข้าสู่สาขา "${selectedMajorName.value}" หรือไม่?`)) {
    return
  }

  isImporting.value = true
  try {
    const res = await $fetch('/api/admin/students', {
      method: 'POST',
      body: {
        faculty_id: importFacultyId.value,
        major_id: importMajorId.value,
        students: toImport.map(r => ({
          student_id: r.student_id,
          first_name: r.first_name,
          last_name: r.last_name,
          accumulated_hours: r.accumulated_hours
        }))
      }
    })

    // ปิด Modal ทันทีเมื่ออัปโหลดสำเร็จ
    closeImportModal(true)
    alert(`🎉 ${res.message || 'นำเข้าข้อมูลนักศึกษาสำเร็จ!'}`)
    refresh()
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการนำเข้า: ' + (err.data?.statusMessage || err.message))
  } finally {
    isImporting.value = false
  }
}

// Templates download
const downloadExcelTemplate = async () => {
  try {
    const XLSX = await loadXLSX()
    const sampleData = [
      { 'รหัสนักศึกษา': '680112418001', 'ชื่อ': 'สมชาย', 'นามสกุล': 'ใจดี', 'ชั่วโมงกิจกรรม': 0 },
      { 'รหัสนักศึกษา': '680112418002', 'ชื่อ': 'สมหญิง', 'นามสกุล': 'รักเรียน', 'ชั่วโมงกิจกรรม': 0 },
      { 'รหัสนักศึกษา': '680112418003', 'ชื่อ': 'กิตติพงษ์', 'นามสกุล': 'เจริญสุข', 'ชั่วโมงกิจกรรม': 0 }
    ]
    const ws = XLSX.utils.json_to_sheet(sampleData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'student_import_template.xlsx')
  } catch (e) {
    alert('ไม่สามารถดาวน์โหลดไฟล์แม่แบบได้: ' + e.message)
  }
}

const downloadJsonTemplate = () => {
  const sampleData = [
    { student_id: '680112418001', first_name: 'สมชาย', last_name: 'ใจดี', accumulated_hours: 0 },
    { student_id: '680112418002', first_name: 'สมหญิง', last_name: 'รักเรียน', accumulated_hours: 0 }
  ]
  const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'student_import_template.json'
  a.click()
  URL.revokeObjectURL(url)
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-import-open {
  background: #4f46e5;
  color: white;
  border: none;
  padding: 0.55rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.15s;
}
.btn-import-open:hover {
  background: #4338ca;
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

/* Card */
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
  margin-bottom: 0.5rem;
}

.form-title-row h3 {
  margin: 0;
  font-size: 1.15rem;
  color: #1e293b;
}

.editing-badge {
  background: #fef3c7;
  color: #b45309;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.help-text {
  font-size: 0.85rem;
  color: #059669;
  margin-bottom: 1.25rem;
}

.flex-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.form-btn-group {
  display: flex;
  gap: 0.5rem;
  grid-column: 1 / -1;
  justify-content: flex-end;
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

/* Table Header & Filters */
.table-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.table-card-header h3 {
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

.table-filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.table-filters select, .search-input {
  padding: 0.4rem 0.65rem;
  font-size: 0.825rem;
}

.search-input {
  min-width: 240px;
}

/* Data Table */
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
  padding: 0.2rem 0.45rem;
  border-radius: 4px;
  font-size: 0.825rem;
  color: #334155;
}

.font-medium {
  font-weight: 600;
  color: #0f172a;
}

.user-pill {
  font-size: 0.8rem;
  color: #4338ca;
  background: #e0e7ff;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}

.hours-tag {
  background: #dcfce7;
  color: #15803d;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
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
.btn-edit:hover { background-color: #d97706; }

.btn-danger {
  background-color: #ef4444;
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
  border-radius: 4px;
}
.btn-danger:hover { background-color: #dc2626; }

.empty-cell {
  padding: 3rem 1rem;
  color: #94a3b8;
}

.loading-state {
  text-align: center;
  color: #64748b;
  padding: 2rem;
}

/* ========================================== */
/* MODAL STYLES                               */
/* ========================================== */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(15, 23, 42, 0.65);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
  backdrop-filter: blur(4px);
  padding: 1rem;
}

.modal-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.modal-import {
  width: 100%;
  max-width: 960px;
  max-height: 90vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #0f172a;
}

.modal-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: #64748b;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.75rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.btn-close:hover { color: #1e293b; }

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Steps */
.step-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.25rem;
}

.step-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.step-num {
  background: #2563eb;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
}

.step-title h4 {
  margin: 0;
  font-size: 1rem;
  color: #0f172a;
}

.required {
  color: #ef4444;
}

.step-desc {
  margin: 0 0 1rem;
  font-size: 0.825rem;
  color: #64748b;
}

.import-scope-selectors {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.scope-col {
  flex: 1 1 240px;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.scope-col label {
  font-size: 0.825rem;
  font-weight: 600;
  color: #334155;
}

/* Template Actions */
.template-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  font-size: 0.825rem;
  color: #475569;
}

.btn-tpl {
  background: #ffffff;
  color: #3b82f6;
  border: 1px solid #93c5fd;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-tpl:hover {
  background: #eff6ff;
}

/* Dropzone */
.dropzone {
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  padding: 1.75rem 1rem;
  text-align: center;
  background: white;
  cursor: pointer;
  transition: all 0.15s;
}

.dropzone:hover, .dropzone-active {
  border-color: #3b82f6;
  background: #f0f7ff;
}

.dropzone.has-file {
  border-color: #10b981;
  background: #f0fdf4;
}

.file-input-hidden {
  display: none;
}

.upload-icon {
  font-size: 2.25rem;
  display: block;
  margin-bottom: 0.35rem;
}

.drop-text {
  margin: 0 0 0.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e293b;
}

.file-name {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  color: #047857;
}

.file-hint {
  margin: 0;
  font-size: 0.8rem;
  color: #64748b;
}

.parsing-indicator {
  margin-top: 0.75rem;
  text-align: center;
  font-size: 0.85rem;
  color: #2563eb;
  font-weight: 500;
}

/* Preview Box */
.preview-box {
  background: white;
  border: 1px solid #cbd5e1;
}

.validation-summary-grid {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.summary-pill {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.825rem;
}
.summary-pill .num {
  font-weight: 700;
  font-size: 1rem;
}
.summary-pill .lbl {
  font-size: 0.8rem;
}

.pill-total { background: #f1f5f9; color: #334155; }
.pill-valid { background: #dcfce7; color: #15803d; }
.pill-warn { background: #fef9c3; color: #a16207; }
.pill-err { background: #fee2e2; color: #b91c1c; }

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.preview-filters {
  display: flex;
  gap: 0.35rem;
}

.filter-tab-btn {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #475569;
  font-size: 0.775rem;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
}
.filter-tab-btn.active {
  background: #2563eb;
  color: white;
  border-color: #1d4ed8;
}

.selection-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-text {
  background: transparent;
  color: #3b82f6;
  padding: 0;
  font-size: 0.775rem;
  font-weight: 500;
}
.btn-text:hover {
  text-decoration: underline;
}

.preview-table-wrap {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.preview-table th {
  position: sticky;
  top: 0;
  z-index: 1;
}

.row-disabled {
  opacity: 0.55;
  background-color: #fafafa;
}
.row-error {
  background-color: #fffaf0;
}

.val-badge {
  font-size: 0.75rem;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-weight: 600;
  display: inline-block;
  white-space: nowrap;
}
.badge-valid { background: #dcfce7; color: #15803d; }
.badge-error_dup_db { background: #fef3c7; color: #b45309; }
.badge-error_dup_file { background: #fed7aa; color: #c2410c; }
.badge-error_missing { background: #fee2e2; color: #b91c1c; }

.target-scope-tag {
  color: #475569;
  background: #f1f5f9;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.btn-row-del {
  background: transparent;
  color: #ef4444;
  font-size: 1.15rem;
  padding: 0 0.25rem;
  line-height: 1;
}
.btn-row-del:hover {
  color: #b91c1c;
}

/* Modal Footer */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

.btn-confirm-import {
  background-color: #2563eb;
  color: white;
  padding: 0.55rem 1.25rem;
}
.btn-confirm-import:hover:not(:disabled) {
  background-color: #1d4ed8;
}
</style>
