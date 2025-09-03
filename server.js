const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Khởi tạo Gemini (miễn phí!)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Zalo Bot API Configuration (Official)
const ZALO_BOT_API_BASE = 'https://bot-api.zapps.me/bot';
const BOT_TOKEN = process.env.ZALO_BOT_TOKEN;
const SECRET_TOKEN = process.env.ZALO_SECRET_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

// Lưu trữ lịch sử chat (trong production nên dùng database)
const chatHistory = new Map();

// Middleware xác thực secret token từ Zalo
function verifyZaloRequest(req, res, next) {
  const receivedToken = req.headers['x-bot-api-secret-token'];
  
  if (receivedToken !== SECRET_TOKEN) {
    console.log('❌ Invalid secret token:', receivedToken);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
}

// Hàm setup webhook tự động
async function setupWebhook() {
  try {
    const response = await axios.post(`${ZALO_BOT_API_BASE}${BOT_TOKEN}/setWebhook`, {
      url: WEBHOOK_URL,
      secret_token: SECRET_TOKEN
    });
    
    console.log('📡 Webhook response:', response.data);
    
    // Kiểm tra kết quả thực tế
    if (response.data.ok === false) {
      throw new Error(`Webhook setup failed: ${response.data.description} (${response.data.error_code})`);
    }
    
    console.log('✅ Webhook đã được cấu hình thành công!');
    return response.data;
  } catch (error) {
    console.error('❌ Lỗi cấu hình webhook:', error.response?.data || error.message);
    throw error;
  }
}

// Hàm gửi chat action (hiển thị "đang gõ")
async function sendChatAction(chatId, action = 'typing') {
  try {
    const response = await axios.post(`${ZALO_BOT_API_BASE}${BOT_TOKEN}/sendChatAction`, {
      chat_id: chatId,
      action: action
    });
    
    console.log('⌨️ Đã gửi chat action:', action);
    return response.data;
  } catch (error) {
    console.error('❌ Lỗi gửi chat action:', error.response?.data || error.message);
    // Không throw error vì đây chỉ là tính năng phụ
  }
}

// Hàm gửi tin nhắn đến Zalo (Bot API)
async function sendZaloMessage(chatId, message) {
  try {
    const response = await axios.post(`${ZALO_BOT_API_BASE}${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: message
    });
    
    console.log('✅ Đã gửi tin nhắn thành công:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Lỗi khi gửi tin nhắn:', error.response?.data || error.message);
    throw error;
  }
}

// Hàm xử lý với Gemini (miễn phí!)
async function getGeminiResponse(message, userId) {
  try {
    // Lấy lịch sử chat của user
    let history = chatHistory.get(userId) || [];
    
    // Tạo context từ lịch sử chat
    let contextPrompt = `Bạn là một AI assistant thông minh và hữu ích tên là Gemini Bot. Hãy trả lời bằng tiếng Việt một cách tự nhiên và thân thiện. Bạn có thể giúp viết code, giải thích kiến thức, dịch thuật và nhiều việc khác.\n\n`;
    
    // Thêm lịch sử chat vào context (giữ 10 tin nhắn gần nhất)
    if (history.length > 0) {
      const recentHistory = history.slice(-10);
      contextPrompt += "Lịch sử cuộc trò chuyện:\n";
      recentHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'Người dùng' : 'Bot';
        contextPrompt += `${role}: ${msg.content}\n`;
      });
      contextPrompt += "\n";
    }
    
    contextPrompt += `Câu hỏi hiện tại: ${message}`;
    
    // Gọi Gemini API
    const result = await model.generateContent(contextPrompt);
    const aiResponse = result.response.text();
    
    // Thêm vào lịch sử
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: aiResponse });
    
    // Giới hạn lịch sử (giữ 20 tin nhắn gần nhất)
    if (history.length > 20) {
      history = history.slice(-20);
    }
    
    chatHistory.set(userId, history);
    
    return aiResponse;
  } catch (error) {
    console.error('❌ Lỗi Gemini API:', error.response?.data || error.message);
    return '🤖 Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.';
  }
}

// Webhook endpoint để nhận tin nhắn từ Zalo
app.post('/webhook', verifyZaloRequest, async (req, res) => {
  try {
    console.log('📨 Nhận webhook:', JSON.stringify(req.body, null, 2));
    
    const { event_name, message } = req.body;
    
    if (event_name === 'message.text.received' && message && message.text) {
      const chatId = message.chat.id;
      const userId = message.from.id;
      const userMessage = message.text;
      const userName = message.from.display_name || 'Bạn';
      
      console.log(`💬 Tin nhắn từ ${userName} (${userId}): ${userMessage}`);
      
      // Xử lý các lệnh đặc biệt
      if (userMessage.toLowerCase() === '/start') {
        await sendZaloMessage(chatId, `Xin chào ${userName}! 👋

🤖 Tôi là Gemini Bot trên Zalo. Tôi có thể:
• Trả lời câu hỏi về mọi chủ đề
• Viết và giải thích code
• Dịch thuật đa ngôn ngữ  
• Giải thích kiến thức phức tạp
• Sáng tạo nội dung
• Và nhiều thứ khác!

💡 Hãy chat bình thường với tôi như ChatGPT nhé! (Powered by Google Gemini)

📝 Lệnh hữu ích:
/help - Xem hướng dẫn
/clear - Xóa lịch sử chat`);

      } else if (userMessage.toLowerCase() === '/clear') {
        chatHistory.delete(userId);
        await sendZaloMessage(chatId, '🗑️ Đã xóa lịch sử chat. Bắt đầu cuộc trò chuyện mới!');
        
              } else if (userMessage.toLowerCase() === '/help') {
          await sendZaloMessage(chatId, `📚 Hướng dẫn sử dụng Gemini Bot:

🔹 **Chat bình thường:** Gửi bất kỳ câu hỏi nào
🔹 **/start** - Khởi động bot và xem giới thiệu
🔹 **/clear** - Xóa lịch sử cuộc trò chuyện
🔹 **/help** - Hiển thị hướng dẫn này

💡 **Ví dụ sử dụng:**
• "Giải thích thuật toán bubble sort"
• "Viết code Python tính giai thừa"
• "Dịch sang tiếng Anh: Xin chào"
• "Tóm tắt cuốn sách Sapiens"

🎯 Bot nhớ ngữ cảnh cuộc trò chuyện để trả lời chính xác hơn!`);

        } else {
          // Gửi tin nhắn đến Gemini và trả lời
          console.log('🤖 Đang xử lý với Gemini...');
          await sendChatAction(chatId, 'typing'); // Hiển thị "đang gõ"
          const aiResponse = await getGeminiResponse(userMessage, userId);
        
        // Chia nhỏ tin nhắn nếu quá dài (Zalo giới hạn ~2000 ký tự)
        const maxLength = parseInt(process.env.MAX_MESSAGE_LENGTH) || 2000;
        if (aiResponse.length > maxLength) {
          const chunks = aiResponse.match(new RegExp(`.{1,${maxLength}}`, 'g'));
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const prefix = i === 0 ? '' : `...(${i + 1}/${chunks.length}) `;
            await sendZaloMessage(chatId, prefix + chunk);
            
            // Delay nhỏ để tránh spam
            if (i < chunks.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } else {
          await sendZaloMessage(chatId, aiResponse);
        }
      }
    }
    
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('❌ Lỗi xử lý webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    webhook_url: WEBHOOK_URL,
    bot_token_configured: !!BOT_TOKEN,
    gemini_configured: !!process.env.GEMINI_API_KEY
  });
});

// Endpoint để setup webhook
app.post('/setup-webhook', async (req, res) => {
  try {
    const result = await setupWebhook();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint để test gửi tin nhắn
app.post('/test-send', async (req, res) => {
  try {
    const { chatId, message } = req.body;
    const result = await sendZaloMessage(chatId, message);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Khởi động server và setup webhook
app.listen(PORT, async () => {
  console.log(`🚀 Bot Zalo ChatGPT đang chạy tại port ${PORT}`);
  console.log(`📱 Webhook URL: ${WEBHOOK_URL}`);
  console.log(`🔑 Bot Token: ${BOT_TOKEN ? 'Đã cấu hình' : 'Chưa cấu hình'}`);
  console.log(`🔐 Secret Token: ${SECRET_TOKEN ? 'Đã cấu hình' : 'Chưa cấu hình'}`);
  console.log(`🤖 Gemini API: ${process.env.GEMINI_API_KEY ? 'Đã cấu hình' : 'Chưa cấu hình'}`);
  
  // Tự động setup webhook khi khởi động
  if (WEBHOOK_URL && BOT_TOKEN && SECRET_TOKEN) {
    console.log('🔧 Đang cấu hình webhook tự động...');
    try {
      await setupWebhook();
      console.log('✅ Webhook đã được cấu hình thành công!');
    } catch (error) {
      console.error('❌ Không thể cấu hình webhook:', error.message);
      console.log('💡 Bạn có thể setup thủ công bằng cách POST đến /setup-webhook');
    }
  } else {
    console.log('⚠️ Thiếu thông tin để setup webhook tự động');
  }
}); 