document.addEventListener('DOMContentLoaded', function() {
    if (document.body.classList.contains('dashboard-page') && window.location.pathname.includes('dashboard_waiter.html')) {
        const loggedInEmployee = JSON.parse(localStorage.getItem('employeeLoggedIn'));
        if (!loggedInEmployee || loggedInEmployee.role !== 'waiter') {
            window.showCustomAlert('Akses ditolak. Anda bukan pelayan atau belum login.');
            window.location.href = 'index.html';
            return;
        }

        // --- Mempopulasi Informasi Pengguna ---
        if (loggedInEmployee) {
            document.getElementById('userName').textContent = loggedInEmployee.name || 'Pelayan';
            document.getElementById('userRole').textContent = loggedInEmployee.role === 'waiter' ? 'Pelayan' : loggedInEmployee.role;

            // Untuk bagian profil
            document.getElementById('profileName').textContent = loggedInEmployee.name || 'N/A';
            document.getElementById('profileUsername').textContent = loggedInEmployee.username || 'N/A';
            document.getElementById('profileRole').textContent = loggedInEmployee.role === 'waiter' ? 'Pelayan' : loggedInEmployee.role;
            document.getElementById('profileEmail').textContent = loggedInEmployee.email || 'N/A';
        }

        // --- Fungsionalitas Logout ---
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

        // --- Navigasi Dashboard Interaktif ---
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

        // Tangani klik navigasi
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const sectionId = this.querySelector('a').getAttribute('href').substring(1);
                showSection(sectionId);
            });
        });

        // Tampilkan bagian awal berdasarkan hash URL atau default ke 'overview'
        const initialHash = window.location.hash.substring(1);
        if (initialHash && document.getElementById(initialHash)) {
            showSection(initialHash);
        } else {
            showSection('overview');
        }

        // --- Fungsi untuk memperbarui tampilan ringkasan (overview) ---
        async function renderOverviewStats() {
            const readyOrdersElement = document.getElementById('readyOrders');
            const occupiedTablesElement = document.getElementById('occupiedTables');

            if (readyOrdersElement) readyOrdersElement.textContent = 'Memuat...';
            if (occupiedTablesElement) occupiedTablesElement.textContent = 'Memuat...';

            try {
                const responseOrders = await fetch('api/orders_api.php?status=ready_for_delivery');
                const resultOrders = await responseOrders.json();

                const responseTables = await fetch('api/tables_api.php?action=getAll');
                const resultTables = await responseTables.json();

                if (resultOrders.success) {
                    if (readyOrdersElement) readyOrdersElement.textContent = resultOrders.data.length;
                } else {
                    console.error('Gagal memuat data pesanan siap antar overview:', resultOrders.message);
                    if (readyOrdersElement) readyOrdersElement.textContent = 'N/A';
                }

                if (resultTables.success) {
                    const occupiedCount = resultTables.data.filter(table => table.status === 'occupied' || table.status === 'ordering').length;
                    if (occupiedTablesElement) occupiedTablesElement.textContent = occupiedCount;
                } else {
                    console.error('Gagal memuat data meja overview:', resultTables.message);
                    if (occupiedTablesElement) occupiedTablesElement.textContent = 'N/A';
                }

            } catch (error) {
                console.error('Error fetching overview data:', error);
                if (readyOrdersElement) readyOrdersElement.textContent = 'Error';
                if (occupiedTablesElement) occupiedTablesElement.textContent = 'Error';
            }
        }

        // Fungsi untuk memperbarui tampilan pesanan
        async function renderOrders() {
            const ordersListDiv = document.querySelector('#orders .orders-list');
            if (!ordersListDiv) return;

            ordersListDiv.innerHTML = '<p>Memuat pesanan...</p>';

            try {
                const response = await fetch('api/orders_api.php');
                const result = await response.json();

                if (!result.success) {
                    ordersListDiv.innerHTML = `<p>Gagal memuat pesanan: ${result.message || 'Terjadi kesalahan.'}</p>`;
                    console.error('API Error:', result.message);
                    return;
                }

                const allOrders = result.data;
                ordersListDiv.innerHTML = '';

                if (allOrders.length === 0) {
                    ordersListDiv.innerHTML = '<p>Belum ada pesanan yang masuk.</p>';
                    return;
                }

                allOrders.sort((a, b) => {
                    const statusOrder = { 'pending': 1, 'preparing': 2, 'ordering': 3, 'ready_for_delivery': 4, 'delivered': 5, 'completed': 6, 'paid': 7, 'cancelled': 8 };
                    return statusOrder[a.status] - statusOrder[b.status];
                });

                allOrders.forEach(order => {
                    let statusClass = '';
                    let statusText = '';
                    let buttonHtml = '';
                    
                    const displayTableCode = order.table_code;
                    const orderStatus = order.status ? order.status.toLowerCase() : 'unknown';

                    switch (orderStatus) {
                        case 'pending':
                            statusClass = 'pending';
                            statusText = 'Menunggu Dapur';
                            buttonHtml = `<button class="btn-action primary" data-order-id="${order.id}" data-action="view-detail">Lihat Detail</button>`;
                            break;
                        case 'preparing':
                            statusClass = 'preparing';
                            statusText = 'Sedang Disiapkan Dapur';
                            buttonHtml = `<button class="btn-action primary" data-order-id="${order.id}" data-action="view-detail">Lihat Detail</button>`;
                            break;
                        case 'ordering':
                            statusClass = 'ordering';
                            statusText = 'Sedang Memesan';
                            buttonHtml = `<button class="btn-action primary" data-order-id="${order.id}" data-action="view-detail">Lihat Detail</button>`;
                            break;
                        case 'ready_for_delivery':
                            statusClass = 'ready';
                            statusText = 'Siap Diantar';
                            buttonHtml = `
                                <button class="btn-action primary" data-order-id="${order.id}" data-action="view-detail">Lihat Detail</button>
                                <button class="btn-action success" data-order-id="${order.id}" data-action="deliver">Antar ke Meja</button>
                            `;
                            break;
                        case 'delivered':
                            statusClass = 'delivered'; // Mengubah class CSS
                            statusText = 'Sudah Diantar'; // Mengubah teks status
                            // Pelayan tidak melakukan tindakan lebih lanjut, status `completed` diurus oleh kasir.
                            buttonHtml = `<button class="btn-action primary" data-order-id="${order.id}" data-action="view-detail">Lihat Detail</button>`;
                            break;
                        case 'completed':
                            statusClass = 'completed';
                            statusText = 'Selesai Diantar';
                            buttonHtml = `<button class="btn-action primary" data-order-id="${order.id}" data-action="view-detail">Lihat Detail</button>`;
                            break;
                        case 'paid':
                            statusClass = 'paid';
                            statusText = 'Sudah Dibayar';
                            buttonHtml = `<button class="btn-action primary" data-order-id="${order.id}" data-action="view-detail">Lihat Detail</button>`;
                            break;
                        case 'cancelled':
                            statusClass = 'cancelled';
                            statusText = 'Dibatalkan';
                            buttonHtml = `<button class="btn-action primary" data-order-id="${order.id}" data-action="view-detail">Lihat Detail</button>`;
                            break;
                        default:
                            statusClass = 'unknown';
                            statusText = 'Status Tidak Dikenal';
                            buttonHtml = `<button class="btn-action primary" data-order-id="${order.id}" data-action="view-detail">Lihat Detail</button>`;
                    }

                    const orderItemsHtml = order.items && Array.isArray(order.items)
                        ? order.items.map(item => `<li>${item.item_name} x${item.quantity}</li>`).join('')
                        : '<li>Tidak ada item</li>';

                    const orderCard = document.createElement('div');
                    orderCard.classList.add('order-card', statusClass);
                    orderCard.innerHTML = `
                        <h3>Pesanan #${order.id} - ${displayTableCode}</h3>
                        <p>Pelanggan: ${order.customer_name}</p>
                        <ul class="order-items-list">${orderItemsHtml}</ul>
                        <span class="order-status">${statusText}</span>
                        <div class="order-actions">${buttonHtml}</div>
                    `;
                    ordersListDiv.appendChild(orderCard);
                });

                ordersListDiv.querySelectorAll('.btn-action').forEach(button => {
                    button.addEventListener('click', function() {
                        const orderId = this.dataset.orderId;
                        const action = this.dataset.action;
                        handleWaiterOrderAction(orderId, action);
                    });
                });
            } catch (error) {
                ordersListDiv.innerHTML = '<p>Gagal terhubung ke server untuk memuat pesanan.</p>';
                console.error('Error fetching orders:', error);
            }
        }

        async function handleWaiterOrderAction(orderId, action) {
            if (action === 'deliver') {
                window.showCustomConfirm(`Apakah Anda yakin pesanan #${orderId} telah sampai di meja pelanggan?`, async function() {
                    try {
                        const response = await fetch('api/orders_api.php', {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ orderId: parseInt(orderId), newStatus: 'delivered' })
                        });
                        const result = await response.json();

                        if (result.success) {
                            window.showCustomAlert(`Pesanan #${orderId} telah berhasil diantar!`);
                            refreshAllData();
                        } else {
                            window.showCustomAlert(`Gagal mengantar pesanan: ${result.message}`);
                        }
                    } catch (error) {
                        console.error('Error delivering order:', error);
                        window.showCustomAlert('Terjadi kesalahan saat mengantar pesanan.');
                    }
                });
            } else if (action === 'view-detail') {
                try {
                    const response = await fetch(`api/orders_api.php?order_id=${orderId}`);
                    const result = await response.json();

                    if (result.success && result.data.length > 0) {
                        const order = result.data[0];
                        const itemsDetail = order.items.map(item => `${item.item_name} (${item.quantity})`).join('\n');
                        window.showCustomAlert(`Detail Pesanan #${order.id}:\nMeja: ${order.table_code}\nPelanggan: ${order.customer_name}\nTotal: Rp ${parseFloat(order.total_amount).toLocaleString('id-ID')}\nStatus: ${order.status}\n\nItem:\n${itemsDetail}`);
                    } else {
                        window.showCustomAlert('Detail pesanan tidak ditemukan.');
                    }
                } catch (error) {
                    console.error('Error fetching order details:', error);
                    window.showCustomAlert('Terjadi kesalahan saat mengambil detail pesanan.');
                }
            }
        }

        async function renderTables() {
            const tablesGridDiv = document.getElementById('tablesGrid');
            if (!tablesGridDiv) return;

            tablesGridDiv.innerHTML = '<p>Memuat status meja...</p>';

            try {
                const response = await fetch('api/tables_api.php?action=getAll');
                const result = await response.json();

                if (!result.success) {
                    tablesGridDiv.innerHTML = `<p>Gagal memuat meja: ${result.message || 'Terjadi kesalahan.'}</p>`;
                    console.error('API Error:', result.message);
                    return;
                }

                const allTables = result.data;
                tablesGridDiv.innerHTML = '';

                if (allTables.length === 0) {
                    tablesGridDiv.innerHTML = '<p>Tidak ada meja yang terdaftar di sistem.</p>';
                    return;
                }

                allTables.forEach(table => {
                    let tableCardClass = '';
                    let tableCardContent = `${table.table_code} <br>`;

                    const tableStatus = table.status ? table.status.toLowerCase() : 'unknown';

                    switch (tableStatus) {
                        case 'available':
                            tableCardClass = 'table-card available';
                            tableCardContent += '(Kosong)';
                            break;
                        case 'occupied':
                            tableCardClass = 'table-card occupied';
                            tableCardContent += `(Terisi - ${table.customer_name || 'Pelanggan'})`;
                            break;
                        case 'reserved':
                            tableCardClass = 'table-card reserved';
                            tableCardContent += `(Reservasi - ${table.customer_name || 'Pelanggan'})`;
                            break;
                        case 'ordering':
                            tableCardClass = 'table-card ordering';
                            tableCardContent += `(Memesan - ${table.customer_name || 'Pelanggan'})`;
                            break;
                        default:
                            tableCardClass = 'table-card';
                            tableCardContent += '(Status Tidak Dikenal)';
                    }

                    const tableCardDiv = document.createElement('div');
                    tableCardDiv.className = tableCardClass;
                    tableCardDiv.innerHTML = tableCardContent;
                    tablesGridDiv.appendChild(tableCardDiv);
                });

            } catch (error) {
                tablesGridDiv.innerHTML = '<p>Gagal terhubung ke server untuk memuat meja.</p>';
                console.error('Error fetching tables:', error);
            }
        }

        async function renderRecentActivity() {
            const activityList = document.getElementById('recentActivityList');
            if (!activityList) return;

            activityList.innerHTML = '<li><span class="activity-time">Memuat...</span></li>';

            try {
                const response = await fetch('api/orders_api.php');
                const result = await response.json();

                if (result.success) {
                    const allOrders = result.data;

                    // Filter aktivitas yang relevan untuk pelayan: pesanan siap diantar, sudah diantar, dan selesai diantar.
                    const recentActivities = allOrders.filter(order =>
                        ['ready_for_delivery', 'delivered', 'completed'].includes(order.status)
                    );

                    recentActivities.sort((a, b) => new Date(b.order_time).getTime() - new Date(a.order_time).getTime());

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
                            case 'ready_for_delivery':
                                activityText = `Pesanan #${activity.id} (Meja ${activity.table_code}) - Siap Diantar`;
                                break;
                            case 'delivered':
                                activityText = `Pesanan #${activity.id} (Meja ${activity.table_code}) - Sudah Diantar`;
                                break;
                            case 'completed':
                                activityText = `Pesanan #${activity.id} (Meja ${activity.table_code}) - Selesai Diantar`;
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

        function refreshAllData() {
            renderOrders();
            renderTables();
            renderOverviewStats();
            renderRecentActivity();
        }

        const refreshDashboardBtn = document.getElementById('refreshDashboardBtn');
        if (refreshDashboardBtn) {
            refreshDashboardBtn.addEventListener('click', function() {
                refreshAllData();
                window.showCustomAlert('Dashboard telah diperbarui.');
            });
        }
    }
});
