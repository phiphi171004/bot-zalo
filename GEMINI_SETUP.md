# 🆓 Hướng dẫn lấy Gemini API Key MIỄN PHÍ

## 🎉 **Tại sao chọn Gemini:**

- ✅ **MIỄN PHÍ** - Không cần nạp tiền
- ✅ **Mạnh mẽ** - Tương đương ChatGPT
- ✅ **Hỗ trợ tiếng Việt** tốt
- ✅ **Rate limit cao** - 15 requests/phút

## 📝 **Các bước lấy API Key:**

### 1. **Truy cập Google AI Studio**
- Vào: https://makersuite.google.com/app/apikey
- Hoặc: https://aistudio.google.com/app/apikey
- Đăng nhập bằng Gmail

### 2. **Tạo API Key**
- Click **"Create API Key"**
- Chọn **"Create API key in new project"**
- Copy API key (bắt đầu bằng `AIza...`)

### 3. **Cập nhật file `.env`**

```env
# Zalo Bot Configuration
ZALO_BOT_TOKEN=3290951124946212613:kjzybUhWcwAWXvOdWhjmUjHTRBPTLeJZfDlhKPbubpoNjzKspaFkiEzpRGrJUQzr
ZALO_SECRET_TOKEN=mykey-chatgpt-bot-2025

# Gemini Configuration (MIỄN PHÍ!)
GEMINI_API_KEY=AIza...your-gemini-key-here

# Server Configuration
PORT=3000
WEBHOOK_URL=https://bot-zalo-6v6l.onrender.com/webhook

# Bot Settings
BOT_NAME=Gemini Bot
MAX_MESSAGE_LENGTH=2000
```

### 4. **Cài đặt dependency mới**

```bash
npm install @google/generative-ai
```

### 5. **Deploy lại**

```bash
# Local
npm run dev

# Hoặc push lên Render để auto-deploy
```

## 🎯 **Ưu điểm Gemini:**

### 📊 **So sánh với ChatGPT:**

| Tính năng | ChatGPT | Gemini |
|-----------|---------|--------|
| Giá | $5+ | **MIỄN PHÍ** |
| Tiếng Việt | Tốt | **Rất tốt** |
| Code | Excellent | **Excellent** |
| Rate Limit | 3-20/min | **15/min** |
| Context | 4K tokens | **32K tokens** |

### 🚀 **Model sử dụng:**
- **gemini-1.5-flash** - Nhanh, miễn phí, smart
- **gemini-1.5-pro** - Chậm hơn nhưng mạnh hơn

## ⚠️ **Lưu ý:**

- **Không cần thẻ tín dụng** để dùng Gemini
- **Rate limit:** 15 requests/phút (đủ dùng)
- **Context window:** 32K tokens (rất lớn)
- **Hỗ trợ đa ngôn ngữ** tốt

---

**🎊 Bot của bạn giờ sẽ sử dụng Gemini hoàn toàn MIỄN PHÍ!** 