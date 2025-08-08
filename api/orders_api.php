<?php
// api/orders_api.php
// Mengelola operasi terkait pesanan (orders) dan item pesanan (order_items)

require_once 'config.php'; // Sertakan file konfigurasi database

$method = $_SERVER['REQUEST_METHOD'];
$response = ['success' => false, 'message' => 'Permintaan tidak valid.'];

switch ($method) {
    case 'GET':
        $orderId = $_GET['order_id'] ?? null;
        $statusFilter = $_GET['status'] ?? null;

        if ($orderId) {
            // Ambil detail pesanan berdasarkan ID
            $stmt = $conn->prepare("SELECT o.id, o.table_id, t.table_code, o.customer_name, o.order_time, o.total_amount, o.status FROM orders o JOIN tables t ON o.table_id = t.id WHERE o.id = ?");
            $stmt->bind_param("i", $orderId);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result->num_rows > 0) {
                $order = $result->fetch_assoc();
                // Ambil item pesanan untuk pesanan ini
                $itemsStmt = $conn->prepare("SELECT oi.menu_item_id, oi.quantity, oi.price_at_order, oi.item_name FROM order_items oi WHERE oi.order_id = ?");
                $itemsStmt->bind_param("i", $orderId);
                $itemsStmt->execute();
                $itemsResult = $itemsStmt->get_result();
                $order['items'] = [];
                while ($itemRow = $itemsResult->fetch_assoc()) {
                    $order['items'][] = $itemRow;
                }
                $itemsStmt->close();
                $response = ['success' => true, 'data' => [$order]]; // Kembalikan sebagai array untuk konsistensi
            } else {
                $response = ['success' => false, 'message' => 'Pesanan tidak ditemukan.'];
            }
            $stmt->close();
        } else {
            // Ambil semua pesanan atau filter berdasarkan status
            $sql = "SELECT o.id, o.table_id, t.table_code, o.customer_name, o.order_time, o.total_amount, o.status FROM orders o JOIN tables t ON o.table_id = t.id";
            $params = [];
            $types = "";
            if ($statusFilter) {
                $sql .= " WHERE o.status = ?";
                $params[] = $statusFilter;
                $types .= "s";
            }
            $sql .= " ORDER BY o.order_time DESC";

            $stmt = $conn->prepare($sql);
            if ($statusFilter) {
                $stmt->bind_param($types, ...$params);
            }
            $stmt->execute();
            $result = $stmt->get_result();
            $orders = [];
            while ($order = $result->fetch_assoc()) {
                // Ambil item pesanan untuk setiap pesanan
                $itemsStmt = $conn->prepare("SELECT oi.menu_item_id, oi.quantity, oi.price_at_order, oi.item_name FROM order_items oi WHERE oi.order_id = ?");
                $itemsStmt->bind_param("i", $order['id']);
                $itemsStmt->execute();
                $itemsResult = $itemsStmt->get_result();
                $order['items'] = [];
                while ($itemRow = $itemsResult->fetch_assoc()) {
                    $order['items'][] = $itemRow;
                }
                $itemsStmt->close();
                $orders[] = $order;
            }
            $stmt->close();
            $response = ['success' => true, 'data' => $orders];
        }
        break;

    case 'POST':
        // Buat pesanan baru
        $data = json_decode(file_get_contents('php://input'), true);
        $tableId = $data['tableId'] ?? null;
        $customerName = $data['customerName'] ?? 'Pelanggan';
        $orderItems = $data['orderItems'] ?? [];

        if (!$tableId || empty($orderItems)) {
            $response = ['success' => false, 'message' => 'Data pesanan tidak lengkap.'];
            break;
        }

        $conn->begin_transaction();
        try {
            // Hitung total harga
            $totalAmount = 0;
            $menuItemPrices = [];
            $menuIds = array_map(function($item) { return $item['menu_item_id']; }, $orderItems);
            $inClause = implode(',', array_fill(0, count($menuIds), '?'));
            $types = str_repeat('i', count($menuIds));
            $pricesStmt = $conn->prepare("SELECT id, price FROM menu_items WHERE id IN ($inClause)");
            $pricesStmt->bind_param($types, ...$menuIds);
            $pricesStmt->execute();
            $pricesResult = $pricesStmt->get_result();
            while ($row = $pricesResult->fetch_assoc()) {
                $menuItemPrices[$row['id']] = $row['price'];
            }
            $pricesStmt->close();

            foreach ($orderItems as $item) {
                if (!isset($menuItemPrices[$item['menu_item_id']])) {
                    throw new Exception('Item menu tidak valid: ' . $item['menu_item_id']);
                }
                $totalAmount += $menuItemPrices[$item['menu_item_id']] * $item['quantity'];
            }

            // Masukkan pesanan ke tabel 'orders'
            $stmt = $conn->prepare("INSERT INTO orders (table_id, customer_name, order_time, total_amount, status) VALUES (?, ?, NOW(), ?, 'pending')");
            $stmt->bind_param("isd", $tableId, $customerName, $totalAmount);
            $stmt->execute();
            $orderId = $conn->insert_id;
            $stmt->close();

            // Masukkan item pesanan ke tabel 'order_items'
            $itemsStmt = $conn->prepare("INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, price_at_order) VALUES (?, ?, ?, ?, ?)");
            foreach ($orderItems as $item) {
                $itemName = $item['item_name']; // Asumsikan nama item juga dikirim dari klien
                $priceAtOrder = $menuItemPrices[$item['menu_item_id']];
                $itemsStmt->bind_param("iisid", $orderId, $item['menu_item_id'], $itemName, $item['quantity'], $priceAtOrder);
                $itemsStmt->execute();
            }
            $itemsStmt->close();

            // Perbarui status meja menjadi 'occupied'
            $updateTableStmt = $conn->prepare("UPDATE tables SET status = 'occupied' WHERE id = ?");
            $updateTableStmt->bind_param("i", $tableId);
            $updateTableStmt->execute();
            $updateTableStmt->close();

            $conn->commit();
            $response = ['success' => true, 'message' => 'Pesanan berhasil dibuat.', 'order_id' => $orderId];
        } catch (mysqli_sql_exception $e) {
            $conn->rollback();
            $response = ['success' => false, 'message' => 'Gagal membuat pesanan: ' . $e->getMessage()];
        } catch (Exception $e) {
            $conn->rollback();
            $response = ['success' => false, 'message' => 'Gagal membuat pesanan: ' . $e->getMessage()];
        }
        break;

    case 'PUT':
        // Perbarui status pesanan
        $data = json_decode(file_get_contents('php://input'), true);
        $orderId = $data['orderId'] ?? null;
        $newStatus = $data['newStatus'] ?? null;

        if (!$orderId || !$newStatus) {
            $response = ['success' => false, 'message' => 'ID Pesanan atau status baru tidak valid.'];
            break;
        }

        // Daftar status yang valid
        $validStatuses = ['pending', 'preparing', 'ready_for_delivery', 'delivered', 'completed', 'paid', 'cancelled'];
        if (!in_array($newStatus, $validStatuses)) {
            $response = ['success' => false, 'message' => 'Status baru tidak valid.'];
            break;
        }

        $conn->begin_transaction();
        try {
            // Dapatkan ID meja dari pesanan
            $tableId = null;
            $stmt = $conn->prepare("SELECT table_id FROM orders WHERE id = ?");
            $stmt->bind_param("i", $orderId);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($row = $result->fetch_assoc()) {
                $tableId = $row['table_id'];
            }
            $stmt->close();

            if (!$tableId) {
                $conn->rollback();
                $response = ['success' => false, 'message' => 'Pesanan tidak ditemukan.'];
                break;
            }

            $stmt = $conn->prepare("UPDATE orders SET status = ? WHERE id = ?");
            $stmt->bind_param("si", $newStatus, $orderId);
            if ($stmt->execute()) {
                // Perbarui status meja berdasarkan status pesanan yang baru
                if ($newStatus === 'delivered') {
                    // Ketika pesanan diantar oleh pelayan, meja tetap terisi (occupied)
                    $updateTableStmt = $conn->prepare("UPDATE tables SET status = 'occupied' WHERE id = ?");
                    $updateTableStmt->bind_param("i", $tableId);
                    $updateTableStmt->execute();
                    $updateTableStmt->close();
                }

                // Jika statusnya 'paid' atau 'completed', perbarui status meja menjadi 'available'
                if ($newStatus === 'paid' || $newStatus === 'completed') {
                    // Ketika pembayaran selesai atau pesanan selesai, meja menjadi kosong (available)
                    $updateTableStmt = $conn->prepare("UPDATE tables SET status = 'available', customer_name = NULL WHERE id = ?");
                    $updateTableStmt->bind_param("i", $tableId);
                    $updateTableStmt->execute();
                    $updateTableStmt->close();
                }

                $conn->commit();
                $response = ['success' => true, 'message' => 'Status pesanan berhasil diperbarui.'];
            } else {
                $conn->rollback();
                $response = ['success' => false, 'message' => 'Gagal memperbarui status pesanan: ' . $stmt->error];
            }
            $stmt->close();
        } catch (mysqli_sql_exception $e) {
            $conn->rollback();
            $response = ['success' => false, 'message' => 'Gagal memperbarui status pesanan: ' . $e->getMessage()];
        }
        break;

    case 'DELETE':
        // Hapus pesanan (opsional, mungkin hanya admin yang bisa)
        $orderId = $_GET['order_id'] ?? null;
        if (!$orderId) {
            $response = ['success' => false, 'message' => 'ID Pesanan tidak valid.'];
            break;
        }
        $stmt = $conn->prepare("DELETE FROM orders WHERE id = ?");
        $stmt->bind_param("i", $orderId);
        if ($stmt->execute()) {
            $response = ['success' => true, 'message' => 'Pesanan berhasil dihapus.'];
        } else {
            $response = ['success' => false, 'message' => 'Gagal menghapus pesanan: ' . $stmt->error];
        }
        $stmt->close();
        break;

    default:
        // Metode tidak didukung
        http_response_code(405);
        $response = ['success' => false, 'message' => 'Metode tidak diizinkan.'];
        break;
}

header('Content-Type: application/json');
echo json_encode($response);

$conn->close();
?>
