<template>
  <div class="login-container">
    <div class="login-box">
      <h2>เข้าสู่ระบบ (Login)</h2>
      <p>ระบบสารสนเทศเพื่อการจัดการกิจกรรมนักศึกษา</p>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">ชื่อผู้ใช้งาน</label>
          <input 
            type="text" 
            id="username" 
            v-model="form.username" 
            required
            placeholder="เช่น admin หรือ student_id"
          >
        </div>
        
        <div class="form-group">
          <label for="password">รหัสผ่าน</label>
          <input 
            type="password" 
            id="password" 
            v-model="form.password" 
            required
          >
        </div>
        
        <div v-if="errorMsg" class="error-msg">
          {{ errorMsg }}
        </div>
        
        <button type="submit" :disabled="isLoading">
          {{ isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const form = ref({
  username: '',
  password: ''
})

const isLoading = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  isLoading.value = true
  errorMsg.value = ''
  
  try {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        username: form.value.username,
        password: form.value.password
      }
    })
    
    // บันทึก session ใน cookie
    const authUser = useCookie('auth_user')
    authUser.value = response.user

    const router = useRouter()
    const role = (response.user.role || '').toLowerCase()

    if (role === 'admin') {
      router.push('/admin')
    } else if (role === 'org_president') {
      router.push('/activities')
    } else {
      router.push('/')
    }
    
  } catch (err) {
    if (err.data && err.data.statusMessage) {
      errorMsg.value = err.data.statusMessage
    } else {
      errorMsg.value = 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง'
    }
    console.error(err)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f3f4f6;
  font-family: sans-serif;
}

.login-box {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h2 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: #1f2937;
  text-align: center;
}

p {
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

button {
  width: 100%;
  padding: 0.75rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background-color: #2563eb;
}

button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.error-msg {
  color: #dc2626;
  background-color: #fee2e2;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  text-align: center;
}
</style>
