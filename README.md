# 🤖 Zalo ChatGPT Bot

Bot Zalo tích hợp ChatGPT để trò chuyện thông minh và tự nhiên.

## ✨ Tính năng

- 💬 Chat với AI như ChatGPT
- 🧠 Ghi nhớ lịch sử cuộc trò chuyện
- 🔧 Các lệnh điều khiển bot
- 📝 Xử lý tin nhắn dài tự động
- ⚡ Phản hồi nhanh chóng

## 🚀 Cài đặt

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình môi trường

Sao chép và chỉnh sửa file `config.env`:

```bash
cp config.env .env
```

Điền các thông tin sau vào file `config.env`:

```env
# Zalo Bot Configuration
ZALO_APP_ID=your_zalo_app_id
ZALO_APP_SECRET=your_zalo_app_secret
ZALO_ACCESS_TOKEN=your_access_token_here

# OpenAI Configuration  
OPENAI_API_KEY=your_openai_api_key

# Server Configuration
PORT=3000
WEBHOOK_URL=https://your-domain.com/webhook
```

### 3. Lấy OpenAI API Key

1. Truy cập [OpenAI Platform](https://platform.openai.com/)
2. Đăng ký/đăng nhập tài khoản
3. Vào phần API Keys và tạo key mới
4. Copy key vào file `config.env`

### 4. Chạy bot

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🌐 Deploy và cấu hình Webhook

### Sử dụng ngrok (cho test local)

```bash
# Cài đặt ngrok
npm install -g ngrok

# Chạy bot local
npm run dev

# Trong terminal khác, tạo tunnel
ngrok http 3000
```

Copy URL từ ngrok (ví dụ: `https://abc123.ngrok.io`) và cập nhật webhook trong Zalo Developer Console:

**Webhook URL:** `https://abc123.ngrok.io/webhook`

### Deploy lên Heroku/Railway/Vercel

1. Push code lên GitHub
2. Connect với platform deploy
3. Thêm environment variables
4. Cập nhật webhook URL trong Zalo

## 📱 Cách sử dụng

### Lệnh bot

- `/start` - Bắt đầu sử dụng bot
- `/clear` - Xóa lịch sử chat
- `/help` - Hiển thị hướng dẫn

### Chat bình thường

Gửi bất kỳ tin nhắn nào và bot sẽ trả lời như ChatGPT:

```
User: "Viết cho tôi một bài thơ về mùa thu"
Bot: "Mùa thu về trên phố phường
     Lá vàng rơi nhẹ như thương nhớ
     ..."

User: "Giải thích thuật toán bubble sort"
Bot: "Bubble sort là thuật toán sắp xếp đơn giản..."
```

## 🛠️ Cấu trúc project

```
bot zalo/
├── server.js          # Server chính
├── package.json       # Dependencies
├── config.env         # Cấu hình môi trường
└── README.md         # Hướng dẫn
```

## 🔧 Troubleshooting

### Lỗi thường gặp

1. **Bot không phản hồi**
   - Kiểm tra webhook URL đã đúng chưa
   - Kiểm tra access token còn hiệu lực
   - Xem logs trong console

2. **Lỗi OpenAI API**
   - Kiểm tra API key đã đúng
   - Đảm bảo tài khoản OpenAI có credit
   - Kiểm tra rate limit

3. **Lỗi Zalo API**
   - Kiểm tra access token
   - Đảm bảo OA đã được duyệt
   - Kiểm tra format tin nhắn

### Debug

Xem logs trong console để debug:

```bash
npm run dev
```

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy kiểm tra:

1. Console logs
2. Network requests trong browser dev tools
3. Zalo Developer Console để xem webhook status

## 🔐 Bảo mật

- Không commit file `.env` hoặc `config.env` với thông tin thật
- Sử dụng HTTPS cho webhook URL
- Định kỳ rotate API keys
- Giới hạn rate limiting nếu cần

## 📈 Nâng cao

Có thể mở rộng bot với:

- Database để lưu lịch sử chat lâu dài
- Redis cho cache
- Multiple AI models
- Rich message templates
- File upload handling
- User management system 