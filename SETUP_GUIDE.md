# 📋 Hướng dẫn Setup Bot Zalo ChatGPT

## 🔧 Bước 1: Lấy Access Token từ Zalo

### Cách lấy Access Token:

1. **Truy cập Zalo Developer Console**
   - Vào: https://developers.zalo.me/
   - Đăng nhập bằng tài khoản Zalo

2. **Tạo/Chọn Official Account (OA)**
   - Chọn "Official Account" từ menu
   - Nếu chưa có OA: Tạo mới theo hướng dẫn
   - Nếu đã có: Chọn OA muốn làm bot

3. **Lấy Access Token**
   - Vào phần "Cài đặt" của OA
   - Tìm mục "Thông tin ứng dụng" hoặc "API"
   - Copy **Access Token** (giống như token bạn đã có)

### ⚠️ Lưu ý quan trọng:

- **KHÔNG CÓ "App Secret"** riêng trong Zalo OA
- Chỉ cần **Access Token** là đủ
- Token có format: `app_id:secret_key` (như token bạn đã có)

## 🤖 Bước 2: Lấy OpenAI API Key

1. **Truy cập OpenAI Platform**
   - Vào: https://platform.openai.com/
   - Đăng ký/đăng nhập tài khoản

2. **Tạo API Key**
   - Vào "API Keys" trong sidebar
   - Click "Create new secret key"
   - Đặt tên và copy key (bắt đầu bằng `sk-...`)

3. **Nạp credit (nếu cần)**
   - Vào "Billing" để nạp tiền
   - Minimum $5 để sử dụng API

## ⚙️ Bước 3: Cấu hình Bot

1. **Chỉnh sửa file `config.env`:**

```env
# Zalo Bot Configuration
ZALO_ACCESS_TOKEN=3290951124946212613:kjzybUhWcwAWXvOdWhjmUjHTRBPTLeJZfDlhKPbubpoNjzKspaFkiEzpRGrJUQzr

# OpenAI Configuration  
OPENAI_API_KEY=sk-your-openai-key-here

# Server Configuration
PORT=3000
WEBHOOK_URL=https://your-domain.com/webhook

# Bot Settings
BOT_NAME=ChatGPT Bot
MAX_MESSAGE_LENGTH=2000
```

2. **Cài đặt dependencies:**

```bash
npm install
```

3. **Chạy bot:**

```bash
npm run dev
```

## 🌐 Bước 4: Setup Webhook

### Option 1: Test với ngrok (Local)

```bash
# Terminal 1: Chạy bot
npm run dev

# Terminal 2: Tạo tunnel
npx ngrok http 3000
```

Copy URL từ ngrok (ví dụ: `https://abc123.ngrok.io`)

### Option 2: Deploy lên server

Có thể deploy lên:
- **Heroku** (miễn phí với giới hạn)
- **Railway** (dễ dùng)
- **Vercel** (cho serverless)
- **VPS** (control hoàn toàn)

## 🔗 Bước 5: Cấu hình Webhook trong Zalo

1. **Vào Zalo Developer Console**
   - Chọn OA của bạn
   - Vào "Cài đặt" → "Webhook"

2. **Cấu hình Webhook URL:**
   - **URL:** `https://your-domain.com/webhook`
   - **Events:** Chọn "Nhận tin nhắn từ người dùng"
   - Click "Lưu"

3. **Test webhook:**
   - Nhắn tin vào OA từ tài khoản Zalo khác
   - Kiểm tra logs trong console

## ✅ Kiểm tra hoạt động

### Test các lệnh:

- `/start` - Xem thông báo chào mừng
- `/help` - Xem hướng dẫn
- `/clear` - Xóa lịch sử chat
- Chat bình thường để test ChatGPT

### Debug nếu có lỗi:

1. **Bot không phản hồi:**
   - Kiểm tra webhook URL
   - Xem console logs
   - Test endpoint `/health`

2. **Lỗi OpenAI:**
   - Kiểm tra API key
   - Kiểm tra credit balance
   - Xem error logs

3. **Lỗi Zalo API:**
   - Kiểm tra access token
   - Kiểm tra OA đã được duyệt chưa
   - Kiểm tra format request

## 🎯 Tính năng Bot

✅ **Đã có:**
- Chat với ChatGPT
- Ghi nhớ lịch sử hội thoại
- Lệnh điều khiển cơ bản
- Xử lý tin nhắn dài

🚀 **Có thể mở rộng:**
- Tích hợp database
- Multiple AI models
- Rich message templates
- File upload support
- User management

---

**🎉 Chúc mừng! Bot ChatGPT trên Zalo của bạn đã sẵn sàng!** 