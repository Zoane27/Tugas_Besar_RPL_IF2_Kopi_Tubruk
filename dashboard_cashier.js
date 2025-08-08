document.addEventListener('DOMContentLoaded', function() {
    // Pastikan BASE_API_URL sesuai dengan lokasi folder 'api' Anda
    const BASE_API_URL = 'http://localhost/TUBES_RPL/api/';

    if (document.body.classList.contains('dashboard-page') && window.location.pathname.includes('dashboard_cashier.html')) {
        const loggedInEmployee = JSON.parse(localStorage.getItem('employeeLoggedIn'));
        if (!loggedInEmployee || loggedInEmployee.role !== 'cashier') {
            window.showCustomAlert('Akses ditolak. Anda bukan kasir atau belum login.');
            window.location.href = 'index.html';
            return;
        }

        // --- Populate User Information ---
        if (loggedInEmployee) {
            document.getElementById('userName').textContent = loggedInEmployee.name || 'Kasir';
            document.getElementById('userRole').textContent = loggedInEmployee.role === 'cashier' ? 'Kasir' : loggedInEmployee.role;

            // For profile section
            document.getElementById('profileName').textContent = loggedInEmployee.name || 'N/A';
            document.getElementById('profileUsername').textContent = loggedInEmployee.username || 'N/A';
            document.getElementById('profileRole').textContent = loggedInEmployee.role === 'cashier' ? 'Kasir' : loggedInEmployee.role;
            document.getElementById('profileEmail').textContent = loggedInEmployee.email || 'N/A';
        }

        // --- Logout Functionality ---
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

        // --- Sidebar Navigation Logic ---
        const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
        const contentSections = document.querySelectorAll('.content-section');

        function showSection(sectionId) {
            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    section.classList.add('active');
                }
            });

            navItems.forEach(item => {
                item.classList.remove('active');
                if (item.querySelector('a').getAttribute('href') === `#${sectionId}`) {
                    item.classList.add('active');
                }
            });
        }

        const initialHash = window.location.hash.substring(1);
        if (initialHash && document.getElementById(initialHash)) {
            showSection(initialHash);
        } else {
            showSection('overview');
        }

        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.querySelector('a').getAttribute('href').substring(1);
                showSection(targetId);
            });
        });

        // --- Render Overview Stats ---
        async function renderOverviewStats() {
            const totalRevenueElement = document.getElementById('totalRevenue');
            const completedOrdersElement = document.getElementById('completedOrders');
            const pendingPaymentsElement = document.getElementById('pendingPayments');

            if (totalRevenueElement) totalRevenueElement.textContent = 'Memuat...';
            if (completedOrdersElement) completedOrdersElement.textContent = 'Memuat...';
            if (pendingPaymentsElement) pendingPaymentsElement.textContent = 'Memuat...';

            try {
                const response = await fetch(`${BASE_API_URL}orders_api.php`);
                
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                    let totalRevenue = 0;
                    let completedCount = 0;
                    let pendingCount = 0;

                    result.data.forEach(order => {
                        // Hanya hitung pesanan 'completed' sebagai pendapatan
                        if (order.status === 'completed') {
                            totalRevenue += parseFloat(order.total_amount);
                            completedCount++;
                        } else if (order.status === 'delivered') { // Hanya hitung status 'delivered' sebagai yang harus dibayar
                            pendingCount++;
                        }
                    });

                    if (totalRevenueElement) totalRevenueElement.textContent = `Rp ${totalRevenue.toLocaleString('id-ID')}`;
                    if (completedOrdersElement) completedOrdersElement.textContent = completedCount;
                    if (pendingPaymentsElement) pendingPaymentsElement.textContent = pendingCount;
                } else {
                    console.error('Gagal memuat data overview:', result.message);
                    if (totalRevenueElement) totalRevenueElement.textContent = 'N/A';
                    if (completedOrdersElement) completedOrdersElement.textContent = 'N/A';
                    if (pendingPaymentsElement) pendingPaymentsElement.textContent = 'N/A';
                }
            } catch (error) {
                console.error('Error fetching overview data:', error);
                if (totalRevenueElement) totalRevenueElement.textContent = 'Error';
                if (completedOrdersElement) completedOrdersElement.textContent = 'Error';
                if (pendingPaymentsElement) pendingPaymentsElement.textContent = 'Error';
            }
        }

        // --- Render Transactions ---
        async function renderTransactions() {
            const transactionTableBody = document.querySelector('.transaction-list tbody');
            if (!transactionTableBody) return;

            transactionTableBody.innerHTML = '<tr><td colspan="7">Memuat transaksi...</td></tr>';

            try {
                const response = await fetch(`${BASE_API_URL}orders_api.php`);
                
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                    transactionTableBody.innerHTML = ''; // Clear existing rows

                    if (result.data.length === 0) {
                        transactionTableBody.innerHTML = '<tr><td colspan="7">Tidak ada transaksi untuk ditampilkan.</td></tr>';
                        return;
                    }

                    // Filter dan urutkan pesanan: 'delivered' di atas, lalu 'completed'
                    const ordersToDisplay = result.data.filter(order =>
                        order.status === 'delivered' ||
                        order.status === 'completed'
                    ).sort((a, b) => {
                        // Prioritaskan 'delivered' di atas 'completed'
                        const statusOrder = { 'delivered': 1, 'completed': 2 };
                        if (statusOrder[a.status] !== statusOrder[b.status]) {
                            return statusOrder[a.status] - statusOrder[b.status];
                        }
                        // Dalam status yang sama, urutkan berdasarkan waktu terbaru dulu
                        return new Date(b.order_time).getTime() - new Date(a.order_time).getTime();
                    });


                    ordersToDisplay.forEach(order => {
                        let statusClass = '';
                        let statusText = '';
                        let actionButtonHtml = '';

                        switch (order.status) {
                            case 'delivered':
                                statusClass = 'status-ready';
                                statusText = 'Menunggu Pembayaran';
                                // Tombol Bayar aktif dan akan mengubah status ke 'completed'
                                actionButtonHtml = `<button class="btn-action success" data-order-id="${order.id}" data-action="mark-completed">Bayar</button>`;
                                break;
                            case 'completed':
                                statusClass = 'status-completed';
                                statusText = 'Selesai';
                                actionButtonHtml = `<button class="btn-action secondary" data-order-id="${order.id}" data-action="view-detail">Detail</button>`;
                                break;
                            default:
                                // Status lain tidak perlu ditampilkan di sini
                                return;
                        }

                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td data-label="ID Transaksi">#${order.id}</td>
                            <td data-label="Meja">${order.table_code}</td>
                            <td data-label="Pelanggan">${order.customer_name}</td>
                            <td data-label="Total">Rp ${parseFloat(order.total_amount).toLocaleString('id-ID')}</td>
                            <td data-label="Waktu">${new Date(order.order_time).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</td>
                            <td data-label="Status" class="${statusClass}">${statusText}</td>
                            <td data-label="Aksi">${actionButtonHtml}</td>
                        `;
                        transactionTableBody.appendChild(row);
                    });

                    // Add event listeners for action buttons
                    transactionTableBody.querySelectorAll('.btn-action').forEach(button => {
                        button.addEventListener('click', function() {
                            const orderId = this.dataset.orderId;
                            const action = this.dataset.action;
                            handleCashierAction(orderId, action);
                        });
                    });

                } else {
                    transactionTableBody.innerHTML = `<tr><td colspan="7">Gagal memuat transaksi: ${result.message || 'Terjadi kesalahan.'}</td></tr>`;
                    console.error('API Error (Transactions):', result.message);
                }
            } catch (error) {
                transactionTableBody.innerHTML = '<tr><td colspan="7">Gagal terhubung ke server untuk memuat transaksi.</td></tr>';
                console.error('Error fetching transactions:', error);
            }
        }
        
        // --- Render Recent Activity ---
        async function renderRecentActivity() {
            const activityList = document.getElementById('recentActivityList');
            if (!activityList) return;

            activityList.innerHTML = '<li><span class="activity-time">Memuat...</span></li>';

            try {
                const response = await fetch(`${BASE_API_URL}orders_api.php`);
                const result = await response.json();

                if (result.success) {
                    const allOrders = result.data;
                    const recentActivities = allOrders.filter(order =>
                        ['delivered', 'completed'].includes(order.status)
                    ).sort((a, b) => new Date(b.order_time).getTime() - new Date(a.order_time).getTime());

                    const latestActivities = recentActivities.slice(0, 5);

                    activityList.innerHTML = '';
                    if (latestActivities.length === 0) {
                        activityList.innerHTML = '<li><span class="activity-time">--:--</span> Tidak ada aktivitas terbaru.</li>';
                        return;
                    }

                    latestActivities.forEach(activity => {
                        const time = new Date(activity.order_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                        let activityText = '';
                        switch (activity.status) {
                            case 'delivered':
                                activityText = `Pesanan #${activity.id} (Meja ${activity.table_code}) - Sudah Dianter`;
                                break;
                            case 'completed':
                                activityText = `Pesanan #${activity.id} (Meja ${activity.table_code}) - Selesai (Dibayar)`;
                                break;
                        }

                        const listItem = document.createElement('li');
                        listItem.innerHTML = `<span class="activity-time">${time}</span> ${activityText}`;
                        activityList.appendChild(listItem);
                    });
                } else {
                    activityList.innerHTML = '<li><span class="activity-time">--:--</span> Gagal memuat aktivitas.</li>';
                    console.error('API Error (Recent Activity):', result.message);
                }
            } catch (error) {
                activityList.innerHTML = '<li><span class="activity-time">--:--</span> Gagal terhubung ke server.</li>';
                console.error('Error fetching recent activity:', error);
            }
        }
        

        // --- Handle Cashier Actions (Mark Paid, View Detail) ---
        async function handleCashierAction(orderId, action) {
            if (action === 'mark-completed') { // Aksi diubah menjadi mark-completed
                window.showCustomConfirm(`Tandai pesanan #${orderId} sebagai sudah dibayar dan selesai?`, async function() {
                    try {
                        const response = await fetch(`${BASE_API_URL}orders_api.php`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ orderId: orderId, newStatus: 'completed' }) // Mengatur status ke 'completed'
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('Server responded with non-OK status:', response.status, errorText);
                            window.showCustomAlert(`Failed to mark order as completed. Server responded with status ${response.status}. Details: ${errorText.substring(0, 100)}... (Check console for more details)`);
                            return;
                        }

                        let result;
                        try {
                            result = await response.json();
                        } catch (jsonError) {
                            const errorText = await response.text();
                            console.error('Failed to parse JSON response:', jsonError, 'Raw response:', errorText);
                            window.showCustomAlert(`An error occurred while processing the server response. Server might have returned invalid data. Details: ${errorText.substring(0, 100)}... (Check console for more details)`);
                            return;
                        }

                        if (result.success) {
                            window.showCustomAlert(`Pesanan #${orderId} berhasil ditandai sebagai sudah dibayar dan selesai.`);
                            renderTransactions(); // Refresh transactions
                            renderOverviewStats(); // Refresh overview stats
                            renderRecentActivity(); // Refresh recent activity
                        } else {
                            window.showCustomAlert(`Failed to mark order as completed: ${result.message}`);
                        }
                    } catch (error) {
                        console.error('Error marking order as completed:', error);
                        window.showCustomAlert('An error occurred while marking the order as completed. Please try again.');
                    }
                });
            } else if (action === 'view-detail') {
                try {
                    const response = await fetch(`${BASE_API_URL}orders_api.php?order_id=${orderId}`);

                    if (!response.ok) {
                        throw new Error(`Server responded with status: ${response.status}`);
                    }

                    const result = await response.json();

                    if (result.success && result.data.length > 0) {
                        const order = result.data[0];
                        const itemsDetail = order.items.map(item => `${item.item_name} (${item.quantity})`).join('\n');
                        window.showCustomAlert(`Transaction Details #${order.id}:\nTable: ${order.table_code}\nCustomer: ${order.customer_name}\nTotal: Rp ${parseFloat(order.total_amount).toLocaleString('id-ID')}\nStatus: ${order.status}\n\nItems:\n${itemsDetail}`);
                    } else {
                        window.showCustomAlert('Transaction details not found.');
                    }
                } catch (error) {
                    console.error('Error fetching transaction details:', error);
                    window.showCustomAlert('An error occurred while fetching transaction details.');
                }
            }
        }

        // --- Function to generate and download sales report ---
        async function downloadSalesReport() {
            window.showCustomAlert('Membuat laporan... Mohon tunggu.');
            try {
                const response = await fetch(`${BASE_API_URL}orders_api.php`);
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }
                const result = await response.json();

                if (result.success) {
                    const allOrders = result.data;

                    // Filter for completed orders
                    const completedOrders = allOrders.filter(order => order.status === 'completed');

                    if (completedOrders.length === 0) {
                        window.showCustomAlert('Tidak ada data transaksi selesai untuk dibuat laporan.');
                        return;
                    }

                    // Prepare data for Excel
                    const data = completedOrders.map(order => {
                        const orderDate = new Date(order.order_time);
                        const formattedDate = orderDate.toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                        const formattedTime = orderDate.toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        });

                        // Join item names and quantities
                        const itemsDetail = order.items.map(item => `${item.item_name} (${item.quantity})`).join(', ');

                        return {
                            'ID Transaksi': `#${order.id}`,
                            'Waktu Pesanan': `${formattedDate} ${formattedTime}`,
                            'Meja': order.table_code,
                            'Nama Pelanggan': order.customer_name,
                            'Detail Pesanan': itemsDetail,
                            'Total Pembayaran (Rp)': parseFloat(order.total_amount),
                            'Status': 'Selesai'
                        };
                    });

                    // Create a new workbook and a worksheet
                    const wb = XLSX.utils.book_new();
                    const ws = XLSX.utils.json_to_sheet(data);

                    // Add a title row
                    XLSX.utils.sheet_add_aoa(ws, [["Laporan Penjualan - Nama Restoran Lembang"]], { origin: "A1" });
                    XLSX.utils.sheet_add_aoa(ws, [["Periode: Semua Data Transaksi Selesai"]], { origin: "A2" });

                    // Merge cells for title and period
                    if (!ws['!merges']) ws['!merges'] = [];
                    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }); // Merge A1:G1
                    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }); // Merge A2:G2

                    // Set column widths for better readability
                    const wscols = [
                        { wch: 15 }, // ID Transaksi
                        { wch: 25 }, // Waktu Pesanan
                        { wch: 10 }, // Meja
                        { wch: 20 }, // Nama Pelanggan
                        { wch: 40 }, // Detail Pesanan
                        { wch: 25 }, // Total Pembayaran (Rp)
                        { wch: 15 }  // Status
                    ];
                    ws['!cols'] = wscols;

                    // Add some basic styling (header bold, currency format)
                    // Note: XLSX.js styling is limited and often requires external tools or more complex setup for truly "professional" look.
                    // This is a basic example. For advanced styling, consider generating an XLSX file on the server side.

                    // Header row (A3:G3 assuming title and period are A1:G2)
                    const headerRow = 3; // Data starts from row 4 (index 3)
                    for (let C = 0; C < data.length; ++C) {
                        const cell = ws[XLSX.utils.encode_cell({r: headerRow, c: C})];
                        if (cell) {
                            // This is a very basic attempt at bolding. True styling is complex.
                            // For more robust styling, consider using a server-side solution or a more advanced client-side library.
                            // cell.s = { font: { bold: true } }; // This property is not directly supported for styling in basic XLSX.js
                        }
                    }

                    // Format Total Pembayaran as currency (example for column F, starting from row 4)
                    for (let R = 0; R < data.length; ++R) {
                        const cellAddress = XLSX.utils.encode_cell({r: R + headerRow + 1, c: 5}); // Column F, +1 for 0-indexing
                        if (ws[cellAddress]) {
                            ws[cellAddress].t = 'n'; // Set type to number
                            ws[cellAddress].z = 'Rp #,##0.00'; // Set custom number format
                        }
                    }


                    XLSX.utils.book_append_sheet(wb, ws, "Laporan Penjualan");

                    // Generate file name
                    const date = new Date();
                    const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                    const fileName = `Laporan_Penjualan_${dateString}.xlsx`;

                    // Download the file
                    XLSX.writeFile(wb, fileName);

                    window.showCustomAlert('Laporan penjualan berhasil diunduh!');

                } else {
                    window.showCustomAlert(`Gagal memuat data laporan: ${result.message || 'Terjadi kesalahan.'}`);
                    console.error('API Error (Download Report):', result.message);
                }
            } catch (error) {
                console.error('Error generating sales report:', error);
                window.showCustomAlert('Terjadi kesalahan saat membuat laporan. Silakan coba lagi.');
            }
        }

        // --- Event Listener for Download Report Button ---
        const downloadReportBtn = document.getElementById('downloadReportBtn');
        if (downloadReportBtn) {
            downloadReportBtn.addEventListener('click', downloadSalesReport);
        }

        // --- Event Listener untuk Tombol Refresh ---
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                // Memanggil kedua fungsi render untuk memuat ulang semua data
                renderOverviewStats();
                renderTransactions();
                renderRecentActivity();
            });
        }
        
        renderTransactions();
        renderOverviewStats(); // Call on page load
        renderRecentActivity(); // Panggil fungsi baru ini saat halaman dimuat
    }
});
