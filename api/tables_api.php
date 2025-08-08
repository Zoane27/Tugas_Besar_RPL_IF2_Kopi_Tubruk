<?php
// api/tables_api.php
// Mengelola operasi terkait meja (tables)

require_once 'config.php'; // Sertakan file konfigurasi database

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null; // Digunakan untuk aksi GET tertentu

$response = ['success' => false, 'message' => 'Permintaan tidak valid.'];

switch ($method) {
    case 'GET':
        if ($action === 'getAll') {
            // Ambil semua status meja
            $sql = "SELECT id, table_code, capacity, status, customer_name FROM tables ORDER BY table_code ASC";
            $result = $conn->query($sql);

            if ($result) {
                $tables = [];
                while ($row = $result->fetch_assoc()) {
                    $tables[] = $row;
                }
                $response = ['success' => true, 'data' => $tables];
            } else {
                $response = ['success' => false, 'message' => 'Gagal mengambil data meja: ' . $conn->error];
            }
        } else {
            // Ambil detail meja berdasarkan ID atau kode meja (opsional)
            $tableId = $_GET['id'] ?? null;
            $tableCode = $_GET['table_code'] ?? null;

            if ($tableId || $tableCode) {
                $sql = "SELECT id, table_code, capacity, status, customer_name FROM tables WHERE ";
                $param = null;
                $type = "";

                if ($tableId) {
                    $sql .= "id = ?";
                    $param = $tableId;
                    $type = "i";
                } elseif ($tableCode) {
                    $sql .= "table_code = ?";
                    $param = $tableCode;
                    $type = "s";
                }

                $stmt = $conn->prepare($sql);
                $stmt->bind_param($type, $param);
                $stmt->execute();
                $result = $stmt->get_result();

                if ($result->num_rows > 0) {
                    $response = ['success' => true, 'data' => [$result->fetch_assoc()]];
                } else {
                    $response = ['success' => false, 'message' => 'Meja tidak ditemukan.'];
                }
                $stmt->close();
            } else {
                $response = ['success' => false, 'message' => 'Parameter tidak valid untuk GET meja.'];
            }
        }
        break;

    case 'POST':
        // Tambah meja baru (opsional, mungkin hanya admin yang bisa)
        $data = json_decode(file_get_contents("php://input"), true);
        $tableCode = $conn->real_escape_string($data['table_code'] ?? '');
        $capacity = $data['capacity'] ?? 0;
        $status = $conn->real_escape_string($data['status'] ?? 'available');

        if (empty($tableCode) || empty($capacity)) {
            $response = ['success' => false, 'message' => 'Kode Meja dan Kapasitas harus diisi.'];
            break;
        }

        $stmt = $conn->prepare("INSERT INTO tables (table_code, capacity, status) VALUES (?, ?, ?)");
        $stmt->bind_param("sis", $tableCode, $capacity, $status);

        if ($stmt->execute()) {
            $response = ['success' => true, 'message' => 'Meja berhasil ditambahkan.', 'id' => $stmt->insert_id];
        } else {
            $response = ['success' => false, 'message' => 'Gagal menambahkan meja: ' . $stmt->error];
        }
        $stmt->close();
        break;

    case 'PUT':
        // Perbarui status meja atau detailnya
        $data = json_decode(file_get_contents("php://input"), true);
        $tableId = $data['tableId'] ?? null; // Menggunakan tableId sesuai dengan dashboard_cashier.js
        $newStatus = $conn->real_escape_string($data['newStatus'] ?? null); // Menggunakan newStatus sesuai dengan dashboard_cashier.js
        $customerName = $conn->real_escape_string($data['customer_name'] ?? null); // Ini bisa null jika tidak diatur
        $capacity = $data['capacity'] ?? null;

        if (!$tableId) {
            $response = ['success' => false, 'message' => 'ID Meja tidak valid.'];
            break;
        }

        $setClauses = [];
        $params = [];
        $types = "";

        if ($newStatus !== null) {
            $setClauses[] = "status = ?";
            $params[] = $newStatus;
            $types .= "s";

            // Jika status diatur ke 'available', set customer_name menjadi NULL
            if ($newStatus === 'available') {
                $setClauses[] = "customer_name = NULL"; // Set customer_name ke NULL
            }
        }
        if ($customerName !== null) {
            $setClauses[] = "customer_name = ?";
            $params[] = $customerName;
            $types .= "s";
        }
        if ($capacity !== null) {
            $setClauses[] = "capacity = ?";
            $params[] = $capacity;
            $types .= "i";
        }

        if (empty($setClauses)) {
            $response = ['success' => false, 'message' => 'Tidak ada data untuk diperbarui.'];
            break;
        }

        $sql = "UPDATE tables SET " . implode(", ", $setClauses) . " WHERE id = ?";
        $params[] = $tableId;
        $types .= "i";

        $stmt = $conn->prepare($sql);
        // Menggunakan call_user_func_array untuk bind_param karena jumlah parameter dinamis
        call_user_func_array([$stmt, 'bind_param'], array_merge([$types], $params));

        if ($stmt->execute()) {
            $response = ['success' => true, 'message' => 'Status meja berhasil diperbarui.'];
        } else {
            $response = ['success' => false, 'message' => 'Gagal memperbarui status meja: ' . $stmt->error];
        }
        $stmt->close();
        break;

    case 'DELETE':
        // Hapus meja (opsional, mungkin hanya admin yang bisa)
        $tableId = $_GET['id'] ?? null;
        if (!$tableId) {
            $response = ['success' => false, 'message' => 'ID Meja tidak valid.'];
            break;
        }
        $stmt = $conn->prepare("DELETE FROM tables WHERE id = ?");
        $stmt->bind_param("i", $tableId);
        if ($stmt->execute()) {
            $response = ['success' => true, 'message' => 'Meja berhasil dihapus.'];
        } else {
            $response = ['success' => false, 'message' => 'Gagal menghapus meja: ' . $stmt->error];
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
