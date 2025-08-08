document.addEventListener('DOMContentLoaded', function() {
    // --- Konfigurasi URL API ---
    // Sesuaikan BASE_API_URL dengan lokasi folder 'api' Anda di htdocs
    const BASE_API_URL = 'http://localhost/TUBES_RPL/api/';

    // --- Custom Alert/Confirm Modals (Replaces native browser alerts/confirms) ---
    // Dipindahkan ke sini agar bisa diakses secara global oleh semua skrip dashboard
    window.showCustomAlert = function(message) {
        // Buat overlay
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';

        // Buat konten modal
        const modalContent = document.createElement('div');
        modalContent.className = 'custom-modal-content';

        // Buat paragraf pesan
        const msgPara = document.createElement('p');
        msgPara.textContent = message;

        // Buat tombol OK
        const okBtn = document.createElement('button');
        okBtn.className = 'btn-action primary';
        okBtn.id = 'customAlertOk'; // Opsional, hanya jika perlu diakses oleh ID di tempat lain
        okBtn.textContent = 'OK';
        okBtn.addEventListener('click', function() {
            overlay.remove(); // Hapus seluruh overlay
        });

        // Gabungkan elemen
        modalContent.appendChild(msgPara);
        modalContent.appendChild(okBtn);
        overlay.appendChild(modalContent);

        // Tambahkan overlay ke body
        document.body.appendChild(overlay);
    };

    window.showCustomConfirm = function(message, onConfirm) {
        // Buat overlay
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';

        // Buat konten modal
        const modalContent = document.createElement('div');
        modalContent.className = 'custom-modal-content';

        // Buat paragraf pesan
        const msgPara = document.createElement('p');
        msgPara.textContent = message;

        // Buat container tombol
        const btnContainer = document.createElement('div');
        btnContainer.className = 'confirm-buttons';

        // Buat tombol Batal
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-action secondary';
        cancelBtn.textContent = 'Batal';
        cancelBtn.addEventListener('click', function() {
            overlay.remove();
        });

        // Buat tombol OK
        const okBtn = document.createElement('button');
        okBtn.className = 'btn-action primary';
        okBtn.textContent = 'OK';
        okBtn.addEventListener('click', function() {
            overlay.remove();
            if (onConfirm && typeof onConfirm === 'function') {
                onConfirm();
            }
        });

        // Gabungkan elemen
        btnContainer.appendChild(cancelBtn);
        btnContainer.appendChild(okBtn);
        modalContent.appendChild(msgPara);
        modalContent.appendChild(btnContainer);
        overlay.appendChild(modalContent);

        // Tambahkan overlay ke body
        document.body.appendChild(overlay);
    };

    // Fungsionalitas Login
    // Pastikan kita berada di halaman landing (index.html)
    if (document.body.classList.contains('landing-page')) {
        const showCustomerFormBtn = document.getElementById('showCustomerForm');
        const showEmployeeFormBtn = document.getElementById('showEmployeeForm');
        const customerSection = document.getElementById('customerSection');
        const employeeSection = document.getElementById('employeeSection');
        const employeeLoginForm = document.getElementById('employeeLoginForm');
        const customerForm = document.getElementById('customerForm');

        if (showCustomerFormBtn && showEmployeeFormBtn) {
            showCustomerFormBtn.addEventListener('click', () => {
                showCustomerFormBtn.classList.add('active');
                showEmployeeFormBtn.classList.remove('active');
                customerSection.classList.add('active');
                employeeSection.classList.remove('active');
            });

            showEmployeeFormBtn.addEventListener('click', () => {
                showEmployeeFormBtn.classList.add('active');
                showCustomerFormBtn.classList.remove('active');
                employeeSection.classList.add('active');
                customerSection.classList.remove('active');
            });
        }

        // --- Handle Customer Login Form Submission ---
        if (customerForm) {
            customerForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const tableCode = document.getElementById('tableCode').value;
                const customerName = document.getElementById('customerName').value;
                const errorMessage = document.getElementById('customerErrorMessage');

                const payload = {
                    action: 'customer_login',
                    tableCode: tableCode,
                    customerName: customerName
                };

                try {
                    const response = await fetch(BASE_API_URL + 'auth_api.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });
                    const result = await response.json();

                    if (result.success) {
                        // Simpan data login ke localStorage
                        localStorage.setItem('currentTableCode', tableCode);
                        localStorage.setItem('currentCustomerName', customerName);
                        // Redirect ke halaman menu
                        window.location.href = 'menu.html';
                    } else {
                        errorMessage.textContent = result.message;
                    }
                } catch (error) {
                    console.error('Error during customer login:', error);
                    errorMessage.textContent = 'Gagal terhubung ke server. Silakan coba lagi.';
                }
            });
        }

        // --- Handle Employee Login Form Submission ---
        if (employeeLoginForm) {
            employeeLoginForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const username = document.getElementById('employeeUsername').value;
                const password = document.getElementById('employeePassword').value;
                const errorMessage = document.getElementById('employeeErrorMessage');

                const payload = {
                    action: 'employee_login',
                    username: username,
                    password: password
                };

                try {
                    const response = await fetch(BASE_API_URL + 'auth_api.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });
                    const result = await response.json();

                    if (result.success) {
                        // Simpan data karyawan ke localStorage
                        localStorage.setItem('employeeLoggedIn', JSON.stringify(result.employee));

                        // Redirect ke dashboard yang sesuai berdasarkan peran
                        switch (result.employee.role) {
                            case 'waiter':
                                window.location.href = 'dashboard_waiter.html';
                                break;
                            case 'chef':
                                window.location.href = 'dashboard_chef.html';
                                break;
                            case 'cashier':
                                window.location.href = 'dashboard_cashier.html';
                                break;
                            default:
                                window.showCustomAlert('Peran tidak dikenal. Silakan hubungi admin.');
                                // Redirect kembali ke halaman login jika peran tidak valid
                                window.location.href = 'index.html';
                                break;
                        }
                    } else {
                        errorMessage.textContent = result.message;
                    }
                } catch (error) {
                    console.error('Error during employee login:', error);
                    errorMessage.textContent = 'Gagal terhubung ke server. Silakan coba lagi.';
                }
            });
        }
    }


    // --- Fungsionalitas Logout untuk semua dashboard ---
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.showCustomConfirm('Apakah Anda yakin ingin keluar?', function() {
                localStorage.removeItem('employeeLoggedIn');
                window.location.href = 'index.html';
            });
        });
    }

    // --- Logika Navigasi Sidebar untuk SEMUA dashboard ---
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const contentSections = document.querySelectorAll('.dashboard-content .content-section');

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.querySelector('a').getAttribute('href').substring(1);

            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            contentSections.forEach(section => {
                if (section.id === targetId) {
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                }
            });
        });
    });

    // Atur section default aktif saat pertama kali dimuat
    const firstNavItem = document.querySelector('.sidebar-nav .nav-item.active');
    if (firstNavItem) {
        const initialTargetId = firstNavItem.querySelector('a').getAttribute('href').substring(1);
        const initialSection = document.getElementById(initialTargetId);
        if (initialSection) {
            initialSection.classList.add('active');
        }
    }
});
