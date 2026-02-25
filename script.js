const GAS_URL = "https://script.google.com/macros/s/AKfycbyHmqMVX_i-IF-W4i6URRrLm2scxz1476qjsEeafFpJdzTnzpgm_E4SUpgjN6d3SG5l/exec";
const LIFF_ID = "2009129539-XFnH7GWq";

// 1. ฟังก์ชันเริ่มต้นสำหรับหน้าแรก (index.html)
async function initLiff() {
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
        const res = await fetch(`${GAS_URL}?action=checkUser&userId=${userId}`);
        const result = await res.json();

        if (result.registered) {
            // ถ้าลงทะเบียนแล้ว ไปหน้าหลัก (หรือหน้าจัดการยา)
            window.location.href = "home.html"; 
        } else {
            // ถ้ายังไม่ลงทะเบียน ไปหน้า register
            window.location.href = "register.html";
        }
    } catch (err) {
        Swal.fire("Error", "ไม่สามารถติดต่อฐานข้อมูลได้", "error");
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
