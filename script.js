const GAS_URL = "https://script.google.com/macros/s/AKfycbwCwBOhCPNdwWLzBEtMi5jw5npFYd87T-8ijKSMroT_zzNL92A1E243QGWlTCML6DA5/exec";
const LIFF_ID = "2009129539-XFnH7GWq";

let isLiffInitialized = false;

// 1. ฟังก์ชันเริ่มต้นสำหรับหน้าแรก (index.html)
async function initLiff() {
    if (isLiffInitialized) return; // ถ้า init แล้วไม่ต้องทำซ้ำ
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
            if (!liff.isInClient()) {
                document.getElementById("login-container").style.display = "block";
                document.getElementById("loading-container").style.display = "none";
            } else {
                liff.login();
            }
        } else {
            const profile = await liff.getProfile();
            checkUserStatus(profile.userId);
        }
    } catch (err) {
        console.error(err);
    }
}

// 2. เช็คว่าลงทะเบียนหรือยัง
async function checkUserStatus(userId) {
    try {
        // เพิ่ม Cache Busting ป้องกัน Browser จำค่า Error เดิม
        const url = `${GAS_URL}?action=checkUser&userId=${userId}&t=${Date.now()}`;
        
        // ใช้ fetch แบบเรียบง่ายที่สุด
        const res = await fetch(url);

        // ตรวจสอบว่า Response กลับมาเป็น JSON หรือไม่
        const result = await res.json();
        console.log("Data from GAS:", result);
        
        if (result.registered) {
            // แจ้งเตือนด้วย SweetAlert แบบ Toast (มุมจอ) ให้ผู้ใช้ทราบก่อนปิด
            Swal.fire({
                icon: 'success',
                title: 'คุณลงทะเบียนแล้ว',
                text: 'ระบบกำลังปิดหน้าต่าง...',
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: 'top'
            });

            // ส่งข้อความเข้า LINE แชท
            try {
                await liff.sendMessages([
                    {
                        type: 'text',
                        text: '📢 ท่านได้ลงทะเบียนในระบบจัดการยาเรียบร้อยแล้ว'
                    }
                ]);
            } catch (err) {
                console.log("ไม่สามารถส่งข้อความได้ (อาจเปิดบน PC)");
            }

            // รอ 2 วินาทีเพื่อให้ SweetAlert แสดงผลและส่งข้อความเสร็จ แล้วจึงปิดหน้าต่าง
            setTimeout(() => {
                liff.closeWindow(); 
            }, 2000);

        } else {
            // ถ้ายังไม่ลงทะเบียน ให้ไปหน้า register.html ตามปกติ
            window.location.href = "register.html";
        }
    } catch (err) {
        Swal.fire("Error", "ไม่สามารถตรวจสอบสถานะได้: " + err.message, "error");
    }
}

// 3. ฟังก์ชันสำหรับหน้าลงทะเบียน (register.html)
async function initRegisterPage() {
    await liff.init({ liffId: LIFF_ID });
    const profile = await liff.getProfile();
    
    // เติมข้อมูลจาก LINE Profile
    document.getElementById("lineId").value = profile.userId;
    document.getElementById("userName").value = profile.displayName;
    if (profile.pictureUrl) {
        const img = document.getElementById("userImg");
        img.src = profile.pictureUrl;
        img.style.display = "inline-block";
    }

    // ดึงรายชื่อหอผู้ป่วยจาก Sheets
    loadWards();
}

async function loadWards() {
    const res = await fetch(`${GAS_URL}?action=getWards`);
    const wards = await res.json();
    const select = document.getElementById("wardList");
    select.innerHTML = '<option value="">เลือกหอผู้ป่วย</option>';
    wards.forEach(ward => {
        const opt = document.createElement("option");
        opt.value = ward;
        opt.innerHTML = ward;
        select.appendChild(opt);
    });
}

// 4. จัดการส่งฟอร์มลงทะเบียน
document.getElementById("regForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    Swal.fire({
        title: 'กำลังบันทึกข้อมูล...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    const data = {
        action: "register",
        lineId: document.getElementById("lineId").value,
        name: document.getElementById("userName").value,
        ward: document.getElementById("wardList").value
    };

    try {
        const res = await fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify(data)
        });
        const result = await res.json();

        if (result.status === "success") {
            Swal.fire({
                icon: 'success',
                title: 'ลงทะเบียนสำเร็จ',
                showConfirmButton: false,
                timer: 2000
            }).then(() => {
                // ส่งข้อความยืนยันเข้า LINE
                liff.sendMessages([{
                    type: 'text',
                    text: `✅ ลงทะเบียนสำเร็จ\nคุณ: ${data.name}\nหอผู้ป่วย: ${data.ward}`
                }]).then(() => liff.closeWindow());
            });
        }
    } catch (err) {
        Swal.fire("Error", "การบันทึกล้มเหลว", "error");
    }
});

if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
    window.onload = initLiff;
}
