<template>
    <Transition name="modal">
        <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
            <div class="modal-card">
                <div class="modal-header">
                    <h3>{{ editingActivityId ? 'แก้ไขข้อมูลกิจกรรม' : 'สร้างกิจกรรมใหม่' }}</h3>
                    <button class="btn-close" @click="$emit('close')">&times;</button>
                </div>

                <form @submit.prevent="handleSubmit" class="activity-form">
                    <div class="form-group">
                        <label>ชื่อกิจกรรม *</label>
                        <input type="text" v-model="formData.title"
                            placeholder="ระบุชื่อกิจกรรม เช่น กิจกรรมรับน้องสร้างสรรค์ 2026" required />
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>หมวดหมู่กิจกรรม *</label>
                            <select v-model="formData.category_id" required>
                                <option value="" disabled>-- เลือกหมวดหมู่ --</option>
                                <option v-for="cat in categories" :key="cat.category_id" :value="cat.category_id">
                                    {{ cat.category_name }}
                                </option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>ชั่วโมงกิจกรรมที่ได้รับ (ชม.) *</label>
                            <input type="number" v-model.number="formData.activity_hours" min="1" max="100" required />
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>วัน-เวลาเริ่มต้น *</label>
                            <input type="datetime-local" v-model="formData.start_time" required />
                        </div>

                        <div class="form-group">
                            <label>วัน-เวลาสิ้นสุด *</label>
                            <input type="datetime-local" v-model="formData.end_time" required />
                        </div>
                    </div>

                    <!-- กำหนดจำนวนผู้เข้าร่วม -->
                    <div class="form-group">
                        <label>จำนวนผู้เข้าร่วมสูงสุด (คน)</label>
                        <input type="number" v-model.number="formData.max_participants"
                            placeholder="เว้นว่างไว้หากไม่จำกัดจำนวนผู้เข้าร่วม" min="1" />
                        <small class="hint-text">* เว้นว่างไว้หากสามารถเข้าร่วมได้ไม่จำกัดจำนวน</small>
                    </div>

                    <!-- กำหนดเงื่อนไขสิทธิ์คณะและสาขาวิชา -->
                    <div class="scope-selection-card">
                        <h4>🎯 สิทธิ์คณะและสาขาวิชาที่สามารถเข้าร่วมได้</h4>

                        <!-- 1. ตัวเลือกคณะ -->
                        <div class="form-group mb-3">
                            <div class="scope-header">
                                <label>คณะที่สามารถเข้าร่วมได้:</label>
                                <div class="scope-options-toggle">
                                    <label class="radio-label">
                                        <input type="radio" :value="true" v-model="scopeAllFaculties"
                                            @change="onToggleAllFaculties" />
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
                                    <label v-for="fac in faculties" :key="fac.faculty_id" class="checkbox-item"
                                        :class="{ 'item-checked': formData.target_faculty_ids.includes(fac.faculty_id) }">
                                        <input type="checkbox" :value="fac.faculty_id"
                                            v-model="formData.target_faculty_ids" @change="onFacultySelectionChange" />
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
                                        <input type="radio" :value="true" v-model="scopeAllMajors"
                                            @change="formData.target_major_ids = []" />
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
                                    <label v-for="maj in selectableMajors" :key="maj.major_id" class="checkbox-item"
                                        :class="{ 'item-checked': formData.target_major_ids.includes(maj.major_id) }">
                                        <input type="checkbox" :value="maj.major_id"
                                            v-model="formData.target_major_ids" />
                                        <span>{{ maj.major_name }} <small class="text-muted">({{ maj.faculty_name
                                                }})</small></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>รายละเอียดกิจกรรม</label>
                        <textarea v-model="formData.description" rows="3"
                            placeholder="รายละเอียด เงื่อนไข หรือสถานที่จัดกิจกรรม..."></textarea>
                    </div>

                    <!-- แจ้งเตือนกรณีเลือกกิจกรรมบังคับ -->
                    <div v-if="isMandatorySelected" class="mandatory-notice-box">
                        ⚡ <strong>ระบบลงทะเบียนอัตโนมัติ (กิจกรรมบังคับ):</strong> เมื่อบันทึกกิจกรรม
                        ระบบจะเพิ่มรายชื่อและ <strong>ยืนยันสถานะสิทธิ์ (Confirmed)</strong>
                        ให้นักศึกษาในสังกัดคณะ/สาขาวิชาที่ระบุทันที และนักศึกษาจะไม่สามารถยกเลิกกิจกรรมนี้ได้
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn-cancel" @click="$emit('close')">ยกเลิก</button>
                        <button type="submit" class="btn-submit" :disabled="isSubmitting">
                            {{ isSubmitting ? 'กำลังบันทึก...' : (editingActivityId ? 'บันทึกการแก้ไข' :
                                'ยืนยันสร้างกิจกรรม') }}
                        </button>
                    </div>
                </form>
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
    editingActivityId: {
        type: [Number, String, null],
        default: null
    },
    initialData: {
        type: Object,
        default: () => ({})
    },
    categories: {
        type: Array,
        default: () => []
    },
    faculties: {
        type: Array,
        default: () => []
    },
    majors: {
        type: Array,
        default: () => []
    },
    isSubmitting: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['close', 'save'])

const scopeAllFaculties = ref(true)
const scopeAllMajors = ref(true)

const formData = ref({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    activity_hours: 1,
    category_id: '',
    max_participants: null,
    target_faculty_ids: [],
    target_major_ids: []
})

watch(() => props.show, (newVal) => {
    if (newVal) {
        if (props.initialData && Object.keys(props.initialData).length > 0) {
            formData.value = {
                title: props.initialData.title || '',
                description: props.initialData.description || '',
                start_time: props.initialData.start_time || '',
                end_time: props.initialData.end_time || '',
                activity_hours: props.initialData.activity_hours || 1,
                category_id: props.initialData.category_id || '',
                max_participants: props.initialData.max_participants || null,
                target_faculty_ids: [...(props.initialData.target_faculty_ids || [])],
                target_major_ids: [...(props.initialData.target_major_ids || [])]
            }
            scopeAllFaculties.value = formData.value.target_faculty_ids.length === 0
            scopeAllMajors.value = formData.value.target_major_ids.length === 0
        } else {
            formData.value = {
                title: '',
                description: '',
                start_time: '',
                end_time: '',
                activity_hours: 1,
                category_id: '',
                max_participants: null,
                target_faculty_ids: [],
                target_major_ids: []
            }
            scopeAllFaculties.value = true
            scopeAllMajors.value = true
        }
    }
}, { immediate: true })

const selectableMajors = computed(() => {
    if (scopeAllFaculties.value || formData.value.target_faculty_ids.length === 0) {
        return props.majors
    }
    return props.majors.filter(m => formData.value.target_faculty_ids.includes(m.faculty_id))
})

const onToggleAllFaculties = () => {
    if (scopeAllFaculties.value) {
        formData.value.target_faculty_ids = []
        formData.value.target_major_ids = []
    }
}

const onFacultySelectionChange = () => {
    if (formData.value.target_faculty_ids.length > 0) {
        formData.value.target_major_ids = formData.value.target_major_ids.filter(majId => {
            const maj = props.majors.find(m => m.major_id === majId)
            return maj && formData.value.target_faculty_ids.includes(maj.faculty_id)
        })
    }
}

const isMandatorySelected = computed(() => {
    if (!formData.value.category_id) return false
    const cat = props.categories.find(c => Number(c.category_id) === Number(formData.value.category_id))
    return cat ? (Number(cat.category_id) === 1 || (cat.category_name || '').includes('บังคับ')) : false
})

const handleSubmit = () => {
    const payload = {
        ...formData.value,
        target_faculty_ids: scopeAllFaculties.value ? [] : formData.value.target_faculty_ids,
        target_major_ids: scopeAllMajors.value ? [] : formData.value.target_major_ids
    }
    emit('save', payload)
}
</script>

<style scoped>
/* Modal Transition */
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
    transform: scale(0.96) translateY(-12px);
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

.modal-card {
    background: white;
    width: 100%;
    max-width: 650px;
    max-height: 90vh;
    overflow-y: auto;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
    margin: 0;
    color: #1e293b;
    font-size: 1.25rem;
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

.activity-form {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.form-group label {
    font-size: 0.88rem;
    font-weight: 600;
    color: #334155;
}

.hint-text {
    color: #64748b;
    font-size: 0.8rem;
}

.hint-small {
    display: block;
    font-size: 0.82rem;
    color: #64748b;
    margin-bottom: 0.5rem;
}

input,
select,
textarea {
    border: 1px solid #cbd5e1;
    padding: 0.6rem 0.75rem;
    border-radius: 6px;
    font-size: 0.92rem;
    color: #1e293b;
    outline: none;
    transition: border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

input:focus,
select:focus,
textarea:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

/* Scope Selection Card */
.scope-selection-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
}

.scope-selection-card h4 {
    margin: 0 0 0.85rem 0;
    font-size: 0.95rem;
    color: #0f172a;
}

.scope-header {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 0.5rem;
}

.scope-options-toggle {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.radio-label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85rem;
    color: #334155;
    cursor: pointer;
}

.checkbox-box {
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 0.75rem;
    margin-top: 0.4rem;
    max-height: 180px;
    overflow-y: auto;
}

.checkbox-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.5rem;
}

.checkbox-item {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.85rem;
    color: #334155;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.15s ease;
}

.checkbox-item:hover {
    background-color: #f1f5f9;
}

.item-checked {
    background-color: #eff6ff;
    font-weight: 500;
    color: #1d4ed8;
}

.text-muted {
    color: #64748b;
    font-size: 0.8rem;
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
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid #f1f5f9;
}

.btn-cancel {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #cbd5e1;
    padding: 0.55rem 1.25rem;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-cancel:hover {
    background: #e2e8f0;
}

.btn-submit {
    background: #2563eb;
    color: white;
    border: none;
    padding: 0.55rem 1.5rem;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-submit:hover:not(:disabled) {
    background: #1d4ed8;
}

.btn-submit:disabled {
    background: #9ca3af;
    cursor: not-allowed;
}

@media (max-width: 640px) {
    .form-row {
        grid-template-columns: 1fr;
    }
}
</style>
