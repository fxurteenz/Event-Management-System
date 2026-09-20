export default defineEventHandler(async (event) => {
  // เขียนโค้ดเชื่อม Database ฝั่ง Backend ที่นี่
  return {
    message: "ดึงข้อมูลสำเร็จ",
    users: [
      { id: 1, name: "สมชาย" },
      { id: 2, name: "สมศรี" },
    ],
  };
});
