async function initLiff() {
    await liff.init({ liffId: "2009129539-XFnH7GWq" });
    
    if (liff.isLoggedIn()) {
        // 1. ดึงค่าจาก URL เช่น ?page=expiry
        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page') || 'home'; // ถ้าไม่มีให้ไปหน้า home

        // 2. ตรวจสอบการลงทะเบียนก่อน (ตัวอย่าง)
        const profile = await liff.getProfile();
        checkRegistration(profile.userId, page); 
    } else {
        liff.login();
    }
}

function renderView(pageName) {
    // ใช้ SweetAlert โหลดสั้นๆ เพื่อความลื่นไหล
    Swal.fire({
        title: 'กำลังโหลด...',
        timer: 500,
        showConfirmButton: false,
        didOpen: () => { Swal.showLoading(); }
    });

    // ดึงเนื้อหาจากโฟลเดอร์ views มาใส่ใน <div id="app">
    fetch(`views/${pageName}.html`)
        .then(response => response.text())
        .then(html => {
            document.getElementById('app').innerHTML = html;
        })
        .catch(err => {
            console.error('Error loading page:', err);
            // ถ้าไม่เจอหน้า ให้กลับไปหน้าหลัก
            if(pageName !== 'home') renderView('home');
        });
}
