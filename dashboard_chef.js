document.addEventListener('DOMContentLoaded', function() {
    if (document.body.classList.contains('dashboard-page') && window.location.pathname.includes('dashboard_chef.html')) {
        const loggedInEmployee = JSON.parse(localStorage.getItem('employeeLoggedIn'));
        if (!loggedInEmployee || loggedInEmployee.role !== 'chef') {
            window.showCustomAlert('Akses ditolak. Anda bukan koki atau belum login.');
            window.location.href = 'index.html';
            return;
        }

        // --- Mempopulasi Informasi Pengguna ---
        if (loggedInEmployee) {
            document.getElementById('userName').textContent = loggedInEmployee.name || 'Koki';
            document.getElementById('userRole').textContent = loggedInEmployee.role === 'chef' ? 'Koki' : loggedInEmployee.role;

            // Untuk bagian profil
            document.getElementById('profileName').textContent = loggedInEmployee.name || 'N/A';
            document.getElementById('profileUsername').textContent = loggedInEmployee.username || 'N/A';
            document.getElementById('profileRole').textContent = loggedInEmployee.role === 'chef' ? 'Koki' : loggedInEmployee.role;
            document.getElementById('profileEmail').textContent = loggedInEmployee.email || 'N/A';
        }

        // --- Fungsionalitas Logout ---
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                window.showCustomConfirm('Apakah Anda yakin ingin keluar?', function() {
                    localStorage.removeItem('employeeLoggedIn');
                    window.location.href = 'index.html'; // Arahkan ke halaman login
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
                const sectionId = this.querySelector('a').getAttribute('href').substring(1); // Hapus '#'
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
            const pendingOrdersElement = document.getElementById('pendingOrdersChef');
            const preparingOrdersElement = document.getElementById('preparingOrdersChef');
            const totalMenuStockElement = document.getElementById('totalMenuStock');

            // Tampilkan pesan loading
            if (pendingOrdersElement) pendingOrdersElement.textContent = 'Memuat...';
            if (preparingOrdersElement) preparingOrdersElement.textContent = 'Memuat...';
            if (totalMenuStockElement) totalMenuStockElement.textContent = 'Memuat...';

            try {
                // Mengambil pesanan untuk statistik pending dan preparing
                const responseOrders = await fetch('api/orders_api.php');
                const resultOrders = await responseOrders.json();

                // Mengambil stok menu untuk statistik total stok menu
                const responseMenuStock = await fetch('api/menu_api.php');
                const resultMenuStock = await responseMenuStock.json();

                if (resultOrders.success) {
                    const allOrders = resultOrders.data;
                    let pendingCount = 0;
                    let preparingCount = 0;

                    allOrders.forEach(order => {
                        if (order.status === 'pending') {
                            pendingCount++;
                        } else if (order.status === 'preparing') {
                            preparingCount++;
                        }
                    });

                    if (pendingOrdersElement) pendingOrdersElement.textContent = pendingCount;
                    if (preparingOrdersElement) preparingOrdersElement.textContent = preparingCount;
                } else {
                    console.error('Gagal memuat data pesanan overview:', resultOrders.message);
                    if (pendingOrdersElement) pendingOrdersElement.textContent = 'N/A';
                    if (preparingOrdersElement) preparingOrdersElement.textContent = 'N/A';
                }

                if (resultMenuStock.success) {
                    const allMenuItems = resultMenuStock.data;
                    // Menghitung total stok dari semua item menu
                    const totalStock = allMenuItems.reduce((sum, item) => sum + parseInt(item.stock), 0);
                    if (totalMenuStockElement) totalMenuStockElement.textContent = totalStock;
                } else {
                    console.error('Gagal memuat data stok menu overview:', resultMenuStock.message);
                    if (totalMenuStockElement) totalMenuStockElement.textContent = 'N/A';
                }

            } catch (error) {
                console.error('Error fetching overview data:', error);
                if (pendingOrdersElement) pendingOrdersElement.textContent = 'Error';
                if (preparingOrdersElement) preparingOrdersElement.textContent = 'Error';
                if (totalMenuStockElement) totalMenuStockElement.textContent = 'Error';
            }
        }


        async function renderKitchenOrders() {
            const kitchenOrdersDiv = document.querySelector('#kitchen .kitchen-orders');
            if (!kitchenOrdersDiv) return;

            kitchenOrdersDiv.innerHTML = '<p>Memuat antrian dapur...</p>'; // Tampilkan pesan loading

            try {
                // Fetch orders data from API, filtering for pending and preparing statuses
                const responsePending = await fetch('api/orders_api.php?status=pending');
                const resultPending = await responsePending.json();

                const responsePreparing = await fetch('api/orders_api.php?status=preparing');
                const resultPreparing = await responsePreparing.json();

                if (!resultPending.success || !resultPreparing.success) {
                    kitchenOrdersDiv.innerHTML = `<p>Gagal memuat pesanan dapur: ${resultPending.message || resultPreparing.message || 'Terjadi kesalahan.'}</p>`;
                    console.error('API Error (Pending):', resultPending.message);
                    console.error('API Error (Preparing):', resultPreparing.message);
                    return;
                }

                // Combine pending and preparing orders
                let ordersToDisplay = [...resultPending.data, ...resultPreparing.data];

                kitchenOrdersDiv.innerHTML = ''; // Clear previous order list

                if (ordersToDisplay.length === 0) {
                    kitchenOrdersDiv.innerHTML = '<p>Tidak ada pesanan di antrian dapur.</p>';
                    return;
                }

                // Sort: pending first, then preparing (FIFO - oldest first)
                ordersToDisplay.sort((a, b) => {
                    // Pending comes before preparing
                    if (a.status === 'pending' && b.status === 'preparing') return -1;
                    if (a.status === 'preparing' && b.status === 'pending') return 1;
                    // Within the same status, sort by time (oldest first)
                    return new Date(a.order_time).getTime() - new Date(b.order_time).getTime();
                });


                ordersToDisplay.forEach(order => {
                    let statusClass = '';
                    let statusText = '';
                    let buttonHtml = '';

                    switch (order.status) {
                        case 'pending':
                            statusClass = 'status-pending';
                            statusText = 'Belum Diproses';
                            buttonHtml = `<button class="btn-action success" data-order-id="${order.id}" data-action="start-preparing">Siapkan</button>`;
                            break;
                        case 'preparing':
                            statusClass = 'status-preparing';
                            statusText = 'Sedang Diproses';
                            buttonHtml = `<button class="btn-action primary" data-order-id="${order.id}" data-action="mark-ready">Selesai</button>`;
                            break;
                    }

                    // Ensure order.items exists and is an array
                    const orderItemsHtml = order.items && Array.isArray(order.items)
                        ? order.items.map(item => `<li>${item.item_name} <span class="qty">x${item.quantity}</span></li>`).join('')
                        : '<li>Tidak ada item</li>';

                    const orderCard = document.createElement('div');
                    orderCard.classList.add('kitchen-order-card');
                    orderCard.innerHTML = `
                        <h3>Pesanan #${order.id} - Meja ${order.table_code}</h3>
                        <p>Pelanggan: ${order.customer_name}</p>
                        <p>Status: <span class="${statusClass}">${statusText}</span></p>
                        <ul class="order-items-list">${orderItemsHtml}</ul>
                        <div class="kitchen-order-actions">${buttonHtml}</div>
                    `;
                    kitchenOrdersDiv.appendChild(orderCard);
                });

                kitchenOrdersDiv.querySelectorAll('.btn-action').forEach(button => {
                    button.addEventListener('click', function() {
                        const orderId = this.dataset.orderId;
                        const action = this.dataset.action;
                        handleChefOrderAction(orderId, action);
                    });
                });
            } catch (error) {
                kitchenOrdersDiv.innerHTML = '<p>Gagal terhubung ke server untuk memuat antrian dapur.</p>';
                console.error('Error fetching kitchen orders:', error);
            }
        }

        async function handleChefOrderAction(orderId, action) {
            let newStatus = '';
            let message = '';

            if (action === 'start-preparing') {
                newStatus = 'preparing';
                // Fetch order details to get table_code for the message
                try {
                    const response = await fetch(`api/orders_api.php?order_id=${orderId}`);
                    const result = await response.json();
                    if (result.success && result.data.length > 0) {
                        const order = result.data[0];
                        message = `Mulai menyiapkan pesanan #${orderId} dari Meja ${order.table_code}`;
                    } else {
                        message = `Mulai menyiapkan pesanan #${orderId}`; // Fallback message
                    }
                } catch (error) {
                    console.error('Error fetching order for message:', error);
                    message = `Mulai menyiapkan pesanan #${orderId}`; // Fallback message on error
                }
            } else if (action === 'mark-ready') {
                newStatus = 'ready_for_delivery';
                // Fetch order details to get table_code for the message
                try {
                    const response = await fetch(`api/orders_api.php?order_id=${orderId}`);
                    const result = await response.json();
                    if (result.success && result.data.length > 0) {
                        const order = result.data[0];
                        message = `Pesanan #${order.id} untuk Meja ${order.table_code} siap diantar!`;
                    } else {
                        message = `Pesanan #${order.id} siap diantar!`; // Fallback message
                    }
                } catch (error) {
                    console.error('Error fetching order for message:', error);
                    message = `Pesanan #${order.id} siap diantar!`; // Fallback message on error
                }
            }

            window.showCustomConfirm(`Apakah Anda yakin ingin mengubah status pesanan #${orderId} menjadi "${newStatus}"?`, async function() {
                try {
                    const response = await fetch('api/orders_api.php', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ orderId: orderId, newStatus: newStatus })
                    });
                    const result = await response.json();

                    if (result.success) {
                        window.showCustomAlert(message);
                        // Panggil fungsi refresh dashboard
                        refreshAllData();
                    } else {
                        window.showCustomAlert(`Gagal memperbarui status pesanan: ${result.message}`);
                    }
                } catch (error) {
                    console.error('Error updating order status:', error);
                    window.showCustomAlert('Terjadi kesalahan saat memperbarui status pesanan.');
                }
            });
        }

        // Fungsi untuk memperbarui tampilan stok menu (menggantikan renderIngredients)
        async function renderMenuStock() {
            const menuStockTableBody = document.querySelector('#menu-stock table tbody'); // Mengubah selektor
            if (!menuStockTableBody) return;

            menuStockTableBody.innerHTML = '<tr><td colspan="5">Memuat stok menu...</td></tr>'; // Mengubah pesan loading dan colspan

            try {
                const response = await fetch('api/menu_api.php'); // Mengambil data dari menu_api.php
                const result = await response.json();

                if (result.success) {
                    const menuItems = result.data;
                    menuStockTableBody.innerHTML = ''; // Kosongkan tabel sebelumnya

                    if (menuItems.length === 0) {
                        menuStockTableBody.innerHTML = '<tr><td colspan="5">Tidak ada item menu dalam stok.</td></tr>'; // Mengubah pesan
                        return;
                    }

                    menuItems.forEach(item => {
                        let statusText = '';
                        let statusClass = '';

                        // Menentukan status berdasarkan stok
                        if (item.stock <= 5) { // Contoh: stok rendah
                            statusText = 'Rendah';
                            statusClass = 'status-cancelled'; // Menggunakan warna merah
                        } else if (item.stock <= 20) { // Contoh: stok sedang
                            statusText = 'Sedang';
                            statusClass = 'status-pending'; // Menggunakan warna kuning
                        } else {
                            statusText = 'Cukup';
                            statusClass = 'status-ready'; // Menggunakan warna hijau
                        }

                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td data-label="Nama Menu">${item.name}</td>
                            <td data-label="Stok">${item.stock}</td>
                            <td data-label="Kategori">${item.category}</td>
                            <td data-label="Status" class="${statusClass}">${statusText}</td>
                            <td data-label="Aksi">
                                <div class="stock-management">
                                    <input type="number" min="1" value="1" class="stock-input" data-item-id="${item.id}">
                                    <button class="btn-action btn-add-stock" data-item-id="${item.id}">Tambah</button>
                                </div>
                            </td>
                        `;
                        menuStockTableBody.appendChild(row);
                    });

                    // Add event listeners for the new "Tambah" buttons
                    document.querySelectorAll('.btn-add-stock').forEach(button => {
                        button.addEventListener('click', async function() {
                            const itemId = this.dataset.itemId;
                            const quantityInput = this.closest('.stock-management').querySelector('.stock-input');
                            const quantityToAdd = parseInt(quantityInput.value);

                            if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
                                window.showCustomAlert('Jumlah stok yang ditambahkan harus angka positif.');
                                return;
                            }

                            window.showCustomConfirm(`Tambahkan ${quantityToAdd} stok untuk item ini?`, async function() {
                                try {
                                    const response = await fetch('api/menu_api.php', {
                                        method: 'PUT',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({ id: itemId, quantity_change: quantityToAdd }) // Menambah stok
                                    });
                                    const result = await response.json();

                                    if (result.success) {
                                        window.showCustomAlert(`Stok berhasil ditambahkan. Stok baru: ${result.new_stock}`);
                                        // Panggil fungsi refresh dashboard
                                        refreshAllData();
                                    } else {
                                        window.showCustomAlert(`Gagal menambahkan stok: ${result.message}`);
                                    }
                                } catch (error) {
                                    console.error('Error adding stock:', error);
                                    window.showCustomAlert('Terjadi kesalahan saat menambah stok.');
                                }
                            });
                        });
                    });

                } else {
                    menuStockTableBody.innerHTML = `<tr><td colspan="5">Gagal memuat stok menu: ${result.message || 'Terjadi kesalahan.'}</td></tr>`; // Mengubah pesan error dan colspan
                    console.error('API Error (Menu Stock):', result.message);
                }
            } catch (error) {
                menuStockTableBody.innerHTML = '<tr><td colspan="5">Gagal terhubung ke server untuk memuat stok menu.</td></tr>'; // Mengubah pesan error dan colspan
                console.error('Error fetching menu stock:', error);
            }
        }

        // Fungsi baru untuk memperbarui "Aktivitas Dapur Terbaru"
        async function renderRecentActivity() {
            const activityList = document.querySelector('.recent-activity ul');
            if (!activityList) return;
            
            activityList.innerHTML = '<li>Memuat aktivitas...</li>'; // Pesan loading

            try {
                const response = await fetch('api/orders_api.php');
                const result = await response.json();

                if (result.success) {
                    const allOrders = result.data;
                    
                    // Filter pesanan yang statusnya 'pending', 'preparing', 'ready_for_delivery', atau 'delivered'
                    const recentActivities = allOrders.filter(order => 
                        ['pending', 'preparing', 'ready_for_delivery', 'delivered'].includes(order.status)
                    );
                    
                    // Urutkan berdasarkan waktu pesanan terbaru
                    recentActivities.sort((a, b) => new Date(b.order_time).getTime() - new Date(a.order_time).getTime());

                    // Ambil 5 aktivitas terbaru
                    const latestActivities = recentActivities.slice(0, 5);

                    activityList.innerHTML = ''; // Kosongkan daftar

                    if (latestActivities.length === 0) {
                        activityList.innerHTML = '<li>Tidak ada aktivitas terbaru.</li>';
                        return;
                    }

                    latestActivities.forEach(activity => {
                        const time = new Date(activity.order_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                        let activityText = '';
                        switch (activity.status) {
                            case 'pending':
                                activityText = `Pesanan Baru #${activity.id} (Meja ${activity.table_code})`;
                                break;
                            case 'preparing':
                                activityText = `Mulai Proses Pesanan #${activity.id} (Meja ${activity.table_code})`;
                                break;
                            case 'ready_for_delivery':
                                activityText = `Pesanan #${activity.id} (Meja ${activity.table_code}) - Siap Diantar`;
                                break;
                            case 'delivered':
                                activityText = `Pesanan #${activity.id} (Meja ${activity.table_code}) - Selesai`;
                                break;
                        }

                        const listItem = document.createElement('li');
                        listItem.innerHTML = `<span class="activity-time">${time}</span> ${activityText}`;
                        activityList.appendChild(listItem);
                    });

                } else {
                    activityList.innerHTML = '<li>Gagal memuat aktivitas.</li>';
                    console.error('API Error (Recent Activity):', result.message);
                }
            } catch (error) {
                activityList.innerHTML = '<li>Gagal terhubung ke server.</li>';
                console.error('Error fetching recent activity:', error);
            }
        }

        /**
         * @desc Fungsi untuk me-refresh semua data di dashboard.
         */
        function refreshAllData() {
            renderKitchenOrders(); // Memuat ulang antrian dapur
            renderOverviewStats(); // Memuat ulang statistik ringkasan
            renderMenuStock(); // Memuat ulang stok menu
            renderRecentActivity(); // Memuat ulang aktivitas terbaru
        }

        // Event listener untuk tombol "refresh" baru di header
        const refreshDashboardBtn = document.getElementById('refreshDashboardBtn');
        if (refreshDashboardBtn) {
            refreshDashboardBtn.addEventListener('click', function() {
                refreshAllData();
                window.showCustomAlert('Dashboard telah diperbarui.');
            });
        }

        // Event listener for the "Perbarui Stok" button (for manual refresh of the display)
        const refreshMenuStockBtn = document.getElementById('refreshMenuStockBtn');
        if (refreshMenuStockBtn) {
            refreshMenuStockBtn.addEventListener('click', function() {
                renderMenuStock(); // Call the function to re-render the menu stock table
                window.showCustomAlert('Tampilan stok menu telah diperbarui.');
            });
        }


        // Panggil semua fungsi saat halaman dimuat
        refreshAllData(); // Ganti panggilan individu dengan fungsi refreshAllData()
    }
});
