document.addEventListener('DOMContentLoaded', function() {
    // --- Konfigurasi URL API ---
    const BASE_API_URL = 'http://localhost/TUBES_RPL/api/';

    const tableCode = localStorage.getItem('currentTableCode');
    const customerName = localStorage.getItem('currentCustomerName');

    const displayedTableCode = document.getElementById('displayedTableCode');
    const displayedCustomerName = document.getElementById('displayedCustomerName');

    if (!tableCode || !customerName) {
        window.showCustomAlert('Anda harus login sebagai pelanggan terlebih dahulu.');
        window.location.href = 'index.html';
        return;
    }

    if (displayedTableCode) displayedTableCode.textContent = tableCode;
    if (displayedCustomerName) displayedCustomerName.textContent = customerName;

    const menuItemsSection = document.getElementById('menuItems');
    const cartModal = document.getElementById('cartModal');
    const closeBtn = document.querySelector('.close-btn');
    const viewCartBtn = document.getElementById('viewCartBtn');
    const cartItemsDiv = document.getElementById('cartItems');
    const cartTotalSpan = document.getElementById('cartTotal');
    const cartItemCountSpan = document.getElementById('cartItemCount');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const emptyCartMessage = document.querySelector('.empty-cart-message');
    const filterButtons = document.querySelectorAll('.filter-btn');

    let cart = JSON.parse(localStorage.getItem('restaurantCart')) || [];
    let allMenuItems = [];
    let currentTableId = null; // Tambahkan variabel untuk menyimpan ID meja

    // Fungsi untuk memperbarui tampilan keranjang dan total
    function updateCartDisplay() {
        cartItemsDiv.innerHTML = '';
        let total = 0;

        if (cart.length === 0) {
            emptyCartMessage.style.display = 'block';
            checkoutBtn.disabled = true;
            cartItemCountSpan.textContent = '0';
            cartTotalSpan.textContent = 'Rp 0';
            return;
        } else {
            emptyCartMessage.style.display = 'none';
            checkoutBtn.disabled = false;
        }

        cart.forEach((item, index) => {
            const cartItemDiv = document.createElement('div');
            cartItemDiv.classList.add('cart-item');
            cartItemDiv.innerHTML = `
                <span>${item.name}</span>
                <div class="cart-item-actions">
                    <button class="qty-btn decrement" data-index="${index}">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn increment" data-index="${index}">+</button>
                    <span>Rp ${(item.price * item.qty).toLocaleString('id-ID')}</span>
                    <button class="remove-item-btn" data-index="${index}">Hapus</button>
                </div>
            `;
            cartItemsDiv.appendChild(cartItemDiv);
            total += item.price * item.qty;
        });

        cartTotalSpan.textContent = `Rp ${total.toLocaleString('id-ID')}`;
        cartItemCountSpan.textContent = cart.reduce((sum, item) => sum + item.qty, 0);
        localStorage.setItem('restaurantCart', JSON.stringify(cart));
    }

    // Fungsi untuk mengambil ID Meja dari API
    async function fetchTableId() {
        try {
            const response = await fetch(`${BASE_API_URL}tables_api.php?table_code=${tableCode}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.success && result.data.length > 0) {
                currentTableId = result.data[0].id;
                console.log('Fetched tableId:', currentTableId);
            } else {
                window.showCustomAlert('Kode meja tidak ditemukan atau tidak valid.');
                console.error('API Error (fetchTableId):', result.message);
                return null;
            }
        } catch (error) {
            console.error('Error fetching table ID:', error);
            window.showCustomAlert('Gagal mengambil ID meja. Terjadi kesalahan jaringan.');
            return null;
        }
    }


    // Fungsi untuk mengambil dan merender menu dari API
    async function fetchAndRenderMenu() {
        if (!menuItemsSection) return;

        menuItemsSection.innerHTML = '<p>Memuat menu...</p>';
        try {
            const response = await fetch(`${BASE_API_URL}menu_api.php`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();

            if (result.success) {
                // Menggunakan properti 'image_url' dari data untuk gambar
                allMenuItems = result.data.map((item, index) => ({
                    ...item,
                    id: parseInt(item.id),
                    stock: parseInt(item.stock),
                    image: item.image_url // Menggunakan URL gambar dari database
                }));
                console.log('Fetched allMenuItems (parsed):', allMenuItems);
                renderMenu(allMenuItems);
            } else {
                menuItemsSection.innerHTML = `<p>Error memuat menu: ${result.message}</p>`;
                console.error('API Error (fetchAndRenderMenu):', result.message);
            }
        } catch (error) {
            console.error('Error fetching menu:', error);
            menuItemsSection.innerHTML = '<p>Gagal memuat menu. Terjadi kesalahan jaringan.</p>';
        }
    }

    function renderMenu(menuItemsToRender) {
        if (!menuItemsSection) return;
        menuItemsSection.innerHTML = '';

        if (menuItemsToRender.length === 0) {
            menuItemsSection.innerHTML = '<p>Tidak ada item menu untuk kategori ini.</p>';
            return;
        }

        menuItemsToRender.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.classList.add('menu-item-card');
            itemCard.setAttribute('data-category', item.category);

            const isOutOfStock = item.stock <= 0;
            const buttonDisabled = isOutOfStock ? 'disabled' : '';
            const stockText = isOutOfStock ? '<span class="stock-out">Stok Habis</span>' : `<span class="stock-available">Stok: ${item.stock}</span>`;

            itemCard.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="menu-item-image">
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                    <span class="price">Rp ${parseFloat(item.price).toLocaleString('id-ID')}</span>
                    ${stockText}
                    <button class="add-to-cart-btn" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" ${buttonDisabled}>Tambah ke Keranjang</button>
                </div>
            `;
            menuItemsSection.appendChild(itemCard);
        });

        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = parseInt(this.dataset.id);
                const itemName = this.dataset.name;
                const itemPrice = parseFloat(this.dataset.price);

                const menuItem = allMenuItems.find(menu => menu.id === itemId);

                if (!menuItem || menuItem.stock <= 0) {
                    window.showCustomAlert('Maaf, stok untuk item ini sudah habis.');
                    return;
                }

                const existingItemInCartIndex = cart.findIndex(item => item.id === itemId);

                if (existingItemInCartIndex > -1) {
                    const currentItemInCartQty = cart[existingItemInCartIndex].qty;
                    const availableStockForThisItem = menuItem.stock + currentItemInCartQty;

                    if (currentItemInCartQty < availableStockForThisItem) {
                        cart[existingItemInCartIndex].qty++;
                    } else {
                        window.showCustomAlert('Anda telah mencapai batas stok yang tersedia untuk item ini.');
                        return;
                    }
                } else {
                    cart.push({ id: itemId, name: itemName, price: itemPrice, qty: 1 });
                }

                menuItem.stock--;
                renderMenu(allMenuItems);
                updateCartDisplay();
            });
        });
    }

    if (viewCartBtn) {
        viewCartBtn.addEventListener('click', () => {
            cartModal.style.display = 'block';
            updateCartDisplay();
        });
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            cartModal.style.display = 'none';
        });
    }
    window.addEventListener('click', (event) => {
        if (event.target == cartModal) {
            cartModal.style.display = 'none';
        }
    });

    cartItemsDiv.addEventListener('click', function(event) {
        const target = event.target;
        if (target.classList.contains('increment')) {
            const index = target.dataset.index;
            const itemId = cart[index].id;
            const menuItem = allMenuItems.find(menu => menu.id === itemId);

            const initialStock = menuItem.stock + cart[index].qty;
            if (cart[index].qty < initialStock) {
                cart[index].qty++;
                menuItem.stock--;
            } else {
                window.showCustomAlert('Anda telah mencapai batas stok yang tersedia untuk item ini.');
            }
        } else if (target.classList.contains('decrement')) {
            const index = target.dataset.index;
            const itemId = cart[index].id;
            const menuItem = allMenuItems.find(menu => menu.id === itemId);

            if (cart[index].qty > 1) {
                cart[index].qty--;
                menuItem.stock++;
            } else {
                menuItem.stock += cart[index].qty;
                cart.splice(index, 1);
            }
        } else if (target.classList.contains('remove-item-btn')) {
            const index = target.dataset.index;
            const itemId = cart[index].id;
            const menuItem = allMenuItems.find(menu => menu.id === itemId);

            menuItem.stock += cart[index].qty;
            cart.splice(index, 1);
        }
        renderMenu(allMenuItems);
        updateCartDisplay();
    });

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const category = this.dataset.category;
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            if (category === 'all') {
                renderMenu(allMenuItems);
            } else {
                const filteredItems = allMenuItems.filter(item => item.category === category);
                renderMenu(filteredItems);
            }
        });
    });

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async function() {
            if (cart.length === 0) {
                window.showCustomAlert('Keranjang Anda kosong.');
                return;
            }

            if (!currentTableId) {
                window.showCustomAlert('ID meja tidak ditemukan. Silakan muat ulang halaman.');
                return;
            }

            const orderData = {
                tableId: currentTableId,
                customerName: customerName,
                orderItems: cart.map(item => ({
                    menu_item_id: item.id,
                    quantity: item.qty,
                    item_name: item.name
                }))
            };

            try {
                const response = await fetch(`${BASE_API_URL}orders_api.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(orderData)
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const result = await response.json();

                    if (result.success) {
                        window.showCustomAlert('Pesanan Anda berhasil dikirim! Silakan tunggu.');
                        cart = [];
                        localStorage.removeItem('restaurantCart');
                        await fetchAndRenderMenu();
                        updateCartDisplay();
                        cartModal.style.display = 'none';
                    } else {
                        window.showCustomAlert(`Gagal mengirim pesanan: ${result.message}`);
                    }
                } catch (error) {
                    console.error('Error saat checkout:', error);
                    window.showCustomAlert('Terjadi kesalahan saat mengirim pesanan. Silakan coba lagi.');
                }
            });
        }

        // Inisialisasi: Ambil menu, ID meja, dan perbarui tampilan keranjang
        async function initialize() {
            await fetchTableId();
            await fetchAndRenderMenu();
            updateCartDisplay();
        }

        initialize();
    });
