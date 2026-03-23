# Hướng dẫn Import Users từ File Excel

## Chuẩn bị

File Excel `uploads/user.xlsx` đã có 99 users với format:
- Column 1: `username` (user01, user02, ...)
- Column 2: `email` (user01@haha.com, user02@haha.com, ...)

## Cách test với Postman

### Bước 1: Đăng nhập với tài khoản ADMIN
```
POST /api/v1/auth/login
Body: {
  "username": "admin_username",
  "password": "admin_password"
}
```
Lưu token từ response.

### Bước 2: Upload file Excel
```
POST /api/v1/import-users/upload
Headers:
  - Authorization: Bearer <your_token>
Body:
  - Type: form-data
  - Key: file
  - Type: File
  - Value: Chọn file uploads/user.xlsx
```

### Response ngay lập tức:
```json
{
  "message": "Import process started. Emails will be sent every 30 seconds.",
  "totalUsers": 99,
  "note": "This process will take approximately 2970 seconds. Check server logs for progress."
}
```

## Quá trình xử lý

1. Server sẽ xử lý từng user một
2. Mỗi user:
   - Tạo tài khoản với password ngẫu nhiên 16 ký tự
   - Gán role USER
   - Tạo cart
   - Gửi email với username và password
   - Đợi 30 giây trước khi xử lý user tiếp theo

3. Theo dõi progress trong server console:
```
Processing file: 1234567890-user.xlsx
Found 99 users in Excel file
Sending email to user01@haha.com (1/99)...
Email sent successfully to user01@haha.com
Waiting 30 seconds before next email...
Sending email to user02@haha.com (2/99)...
...
```

## Kiểm tra Mailtrap

1. Đăng nhập vào Mailtrap: https://mailtrap.io
2. Vào inbox của bạn
3. Bạn sẽ thấy email xuất hiện từ từ, mỗi 30 giây một email
4. Mỗi email chứa:
   - Username
   - Password (16 ký tự ngẫu nhiên)

## Thời gian ước tính

- 99 users × 30 giây = 2,970 giây ≈ 49.5 phút
- Email đầu tiên: ngay lập tức
- Email cuối cùng: sau ~49 phút

## Lưu ý

- Process chạy background, bạn có thể đóng Postman sau khi nhận response
- Kiểm tra server logs để theo dõi tiến trình
- Nếu có lỗi, user vẫn được tạo nhưng password sẽ được log trong console
- File Excel tạm sẽ tự động xóa sau khi xử lý xong

## Alternative: Test với ít users hơn

Nếu muốn test nhanh, tạo file Excel mới với 3-5 users:

```
POST /api/v1/import-users
Headers:
  - Authorization: Bearer <your_token>
  - Content-Type: application/json
Body: {
  "users": [
    { "username": "test1", "email": "test1@example.com" },
    { "username": "test2", "email": "test2@example.com" },
    { "username": "test3", "email": "test3@example.com" }
  ]
}
```

Thời gian: 3 users × 30 giây = 90 giây (1.5 phút)
