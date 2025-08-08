<?php
// api/menu_api.php
// Mengelola operasi terkait menu_items

require_once 'config.php'; // Sertakan file konfigurasi database

$method = $_SERVER['REQUEST_METHOD'];
$response = ['success' => false, 'message' => 'Permintaan tidak valid.'];

switch ($method) {
    case 'GET':
        // Ambil semua item menu, termasuk stok
        $sql = "SELECT id, name, description, price, category, image_url, stock FROM menu_items ORDER BY category, name";
        $result = $conn->query($sql);

        if ($result) {
            $menuItems = [];
            while ($row = $result->fetch_assoc()) {
                $menuItems[] = $row;
            }
            $response = ['success' => true, 'data' => $menuItems];
        } else {
            $response = ['success' => false, 'message' => 'Gagal mengambil item menu: ' . $conn->error];
        }
        break;

    case 'POST':
        // Tambah item menu baru (contoh, jika ada fitur admin untuk menambah menu)
        $data = json_decode(file_get_contents("php://input"), true);
        $name = $conn->real_escape_string($data['name'] ?? '');
        $description = $conn->real_escape_string($data['description'] ?? '');
        $price = $data['price'] ?? 0;
        $category = $conn->real_escape_string($data['category'] ?? '');
        $imageUrl = $conn->real_escape_string($data['image_url'] ?? NULL);
        $stock = $data['stock'] ?? 0; // Tambahkan stok

        if (empty($name) || empty($price) || empty($category)) {
            $response = ['success' => false, 'message' => 'Nama, Harga, dan Kategori harus diisi.'];
            break;
        }

        $stmt = $conn->prepare("INSERT INTO menu_items (name, description, price, category, image_url, stock) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssdssi", $name, $description, $price, $category, $imageUrl, $stock);

        if ($stmt->execute()) {
            $response = ['success' => true, 'message' => 'Item menu berhasil ditambahkan.', 'id' => $stmt->insert_id];
        } else {
            $response = ['success' => false, 'message' => 'Gagal menambahkan item menu: ' . $stmt->error];
        }
        $stmt->close();
        break;

    case 'PUT':
        // Perbarui stok item menu
        $data = json_decode(file_get_contents("php://input"), true);
        $itemId = $data['id'] ?? null;
        $quantityChange = $data['quantity_change'] ?? 0; // Perubahan stok (bisa negatif untuk mengurangi)

        if (!$itemId || $quantityChange === 0) {
            $response = ['success' => false, 'message' => 'ID Item atau Perubahan Kuantitas tidak valid.'];
            break;
        }

        // Ambil stok saat ini
        $stmt = $conn->prepare("SELECT stock FROM menu_items WHERE id = ?");
        $stmt->bind_param("i", $itemId);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows === 0) {
            $response = ['success' => false, 'message' => 'Item menu tidak ditemukan.'];
            $stmt->close();
            break;
        }
        $currentStock = $result->fetch_assoc()['stock'];
        $stmt->close();

        $newStock = $currentStock + $quantityChange;

        // Pastikan stok tidak negatif
        if ($newStock < 0) {
            $response = ['success' => false, 'message' => 'Stok tidak cukup.'];
            break;
        }

        $stmt = $conn->prepare("UPDATE menu_items SET stock = ? WHERE id = ?");
        $stmt->bind_param("ii", $newStock, $itemId);

        if ($stmt->execute()) {
            $response = ['success' => true, 'message' => 'Stok item menu berhasil diperbarui.', 'new_stock' => $newStock];
        } else {
            $response = ['success' => false, 'message' => 'Gagal memperbarui stok item menu: ' . $stmt->error];
        }
        $stmt->close();
        break;

    case 'DELETE':
        // Hapus item menu
        $itemId = $_GET['id'] ?? null;
        if (!$itemId) {
            $response = ['success' => false, 'message' => 'ID Item tidak valid.'];
            break;
        }
        $stmt = $conn->prepare("DELETE FROM menu_items WHERE id = ?");
        $stmt->bind_param("i", $itemId);
        if ($stmt->execute()) {
            $response = ['success' => true, 'message' => 'Item menu berhasil dihapus.'];
        } else {
            $response = ['success' => false, 'message' => 'Gagal menghapus item menu: ' . $stmt->error];
        }
        $stmt->close();
        break;

    default:
        // Pesan default sudah diatur di awal
        break;
}

echo json_encode($response);
$conn->close();
?>
