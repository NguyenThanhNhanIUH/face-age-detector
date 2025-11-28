# 🎭 AI Face & Age Detector

Ứng dụng nhận diện khuôn mặt, tuổi và giới tính theo thời gian thực sử dụng AI.

## ✨ Tính năng

- 📸 Nhận diện khuôn mặt real-time qua webcam
- 👤 Dự đoán tuổi với thuật toán làm mượt
- 🚻 Nhận diện giới tính với hệ thống voting
- 🎨 Giao diện đẹp mắt với hiệu ứng gradient và animation
- 🔄 Tracking mượt mà khi di chuyển

## 🛠️ Công nghệ sử dụng

- **React** - UI Framework
- **Vite** - Build tool
- **face-api.js** - AI Face Detection
- **TensorFlow.js** - Machine Learning

## 📦 Cài đặt

```bash
# Clone repository
git clone https://github.com/NguyenThanhNhanIUH/face-age-detector.git

# Di chuyển vào thư mục
cd face-age-detector

# Cài đặt dependencies
npm install

# Tải AI models
node download-models.js

# Chạy ứng dụng
npm run dev
```

## 🚀 Sử dụng

1. Mở trình duyệt tại `http://localhost:5173`
2. Nhấn nút "Bật Camera"
3. Cho phép quyền truy cập camera
4. Ứng dụng sẽ tự động nhận diện khuôn mặt!

## 📝 Lưu ý

- AI models sẽ được tải tự động lần đầu chạy
- Cần kết nối internet để tải models (khoảng 10-20MB)
- Hoạt động tốt nhất với ánh sáng đầy đủ

## 🎯 Cấu hình

Bạn có thể điều chỉnh các thông số trong `src/App.jsx`:

```javascript
const CONFIG = {
  DETECTION: {
    INPUT_SIZE: 416,           // Độ phân giải phát hiện
    SCORE_THRESHOLD: 0.4,      // Ngưỡng tin cậy
    MAX_TRACKING_DISTANCE: 200 // Khoảng cách tracking
  },
  SMOOTHING: {
    AGE_WEIGHT_NEW: 0.1,       // Trọng số tuổi mới
    GENDER_HISTORY_SIZE: 10    // Số frame lưu lịch sử
  }
}
```

## 📄 License

MIT License

## 👨‍💻 Tác giả

NguyenThanhNhanIUH
