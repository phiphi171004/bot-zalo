const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { OpenAI } = require('openai');
require('dotenv').config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Khởi tạo OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Zalo API Configuration
const ZALO_API_BASE = 'https://openapi.zalo.me/v2.0';
const ACCESS_TOKEN = process.env.ZALO_ACCESS_TOKEN;

// Lưu trữ lịch sử chat (trong production nên dùng database)
const chatHistory = new Map();

// Hàm gửi tin nhắn đến Zalo
async function sendZaloMessage(userId, message) {
  try {
    const response = await axios.post(`${ZALO_API_BASE}/oa/message`, {
      recipient: {
        user_id: userId
      },
      message: {
        text: message
      }
    }, {
      headers: {
        'access_token': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Đã gửi tin nhắn thành công:', response.data);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi gửi tin nhắn:', error.response?.data || error.message);
    throw error;
  }
}

// Hàm xử lý với ChatGPT
async function getChatGPTResponse(message, userId) {
  try {
    // Lấy lịch sử chat của user
    let history = chatHistory.get(userId) || [];
    
    // Thêm tin nhắn mới vào lịch sử
    history.push({ role: 'user', content: message });
    
    // Giới hạn lịch sử (giữ 10 tin nhắn gần nhất)
    if (history.length > 20) {
      history = history.slice(-20);
    }
    
    // Tạo system message
    const systemMessage = {
      role: 'system',
      content: 'Bạn là một AI assistant thông minh và hữu ích. Hãy trả lời bằng tiếng Việt một cách tự nhiên và thân thiện.'
    };
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [systemMessage, ...history],
      max_tokens: 1000,
      temperature: 0.7
    });
    
    const aiResponse = response.choices[0].message.content;
    
    // Thêm phản hồi AI vào lịch sử
    history.push({ role: 'assistant', content: aiResponse });
    chatHistory.set(userId, history);
    
    return aiResponse;
  } catch (error) {
    console.error('Lỗi ChatGPT API:', error.response?.data || error.message);
    return 'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.';
  }
}

// Webhook endpoint để nhận tin nhắn từ Zalo
app.post('/webhook', async (req, res) => {
  try {
    console.log('Nhận webhook:', JSON.stringify(req.body, null, 2));
    
    const { event_name, message, sender, recipient } = req.body;
    
    if (event_name === 'user_send_text') {
      const userId = sender.id;
      const userMessage = message.text;
      
      console.log(`Tin nhắn từ ${userId}: ${userMessage}`);
      
      // Xử lý các lệnh đặc biệt
      if (userMessage.toLowerCase() === '/start') {
        await sendZaloMessage(userId, `Xin chào! 👋 
Tôi là ChatGPT Bot trên Zalo. Tôi có thể:
• Trả lời câu hỏi
• Viết code
• Dịch thuật
• Giải thích kiến thức
• Và nhiều thứ khác!

Hãy gửi tin nhắn để bắt đầu chat nhé!`);
      } else if (userMessage.toLowerCase() === '/clear') {
        chatHistory.delete(userId);
        await sendZaloMessage(userId, '✅ Đã xóa lịch sử chat. Bắt đầu cuộc trò chuyện mới!');
      } else if (userMessage.toLowerCase() === '/help') {
        await sendZaloMessage(userId, `🤖 Hướng dẫn sử dụng:
/start - Bắt đầu
/clear - Xóa lịch sử chat
/help - Hiển thị hướng dẫn

Bạn có thể chat bình thường, tôi sẽ trả lời như ChatGPT!`);
      } else {
        // Gửi tin nhắn đến ChatGPT và trả lời
        const aiResponse = await getChatGPTResponse(userMessage, userId);
        
        // Chia nhỏ tin nhắn nếu quá dài
        const maxLength = parseInt(process.env.MAX_MESSAGE_LENGTH) || 2000;
        if (aiResponse.length > maxLength) {
          const chunks = aiResponse.match(new RegExp(`.{1,${maxLength}}`, 'g'));
          for (const chunk of chunks) {
            await sendZaloMessage(userId, chunk);
            // Delay nhỏ để tránh spam
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else {
          await sendZaloMessage(userId, aiResponse);
        }
      }
    }
    
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Lỗi xử lý webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Endpoint để test gửi tin nhắn
app.post('/test-send', async (req, res) => {
  try {
    const { userId, message } = req.body;
    const result = await sendZaloMessage(userId, message);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`🚀 Bot Zalo đang chạy tại port ${PORT}`);
  console.log(`📱 Webhook URL: ${process.env.WEBHOOK_URL || `http://localhost:${PORT}/webhook`}`);
  console.log(`🔑 Zalo Access Token: ${ACCESS_TOKEN ? 'Đã cấu hình' : 'Chưa cấu hình'}`);
  console.log(`🤖 OpenAI API: ${process.env.OPENAI_API_KEY ? 'Đã cấu hình' : 'Chưa cấu hình'}`);
}); 