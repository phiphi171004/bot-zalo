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

// Lưu trữ model preference của từng user
const userModels = new Map();

// Danh sách models có sẵn
const AVAILABLE_MODELS = {
  'flash': {
    name: 'gemini-1.5-flash',
    display: '⚡ Flash (Nhanh)',
    description: 'Phản hồi nhanh, phù hợp chat thường'
  },
  'pro': {
    name: 'gemini-1.5-pro',
    display: '🧠 Pro (Thông minh)', 
    description: 'Suy luận sâu, giải toán, lập trình phức tạp'
  },
  'flash-8b': {
    name: 'gemini-1.5-flash-8b',
    display: '🔥 Flash 8B (Ổn định)',
    description: 'Model nhẹ, ít bị overload'
  }
};

// Fallback models khi bị overload
const FALLBACK_MODELS = ['gemini-1.5-flash-8b', 'gemini-1.5-flash', 'gemini-1.5-pro'];

// Hàm lấy model hiện tại của user
function getUserModel(userId, taskType = 'text') {
  const modelKey = userModels.get(userId) || 'auto';
  
  // Nếu chế độ AUTO, chỉ dùng các model nhanh
  if (modelKey === 'auto') {
    if (taskType === 'image') {
      return AVAILABLE_MODELS['flash']; // Flash tốt cho vision
    } else if (taskType === 'math' || taskType === 'code') {
      return AVAILABLE_MODELS['flash-8b']; // Flash 8B ổn định cho logic
    } else {
      return AVAILABLE_MODELS['flash']; // Flash cho chat thường
    }
  }
  
  return AVAILABLE_MODELS[modelKey];
}

// Hàm làm sạch markdown cho Zalo
function cleanMarkdownForZalo(text) {
  return text
    // Xóa câu chào tự động từ Gemini
    .replace(/^🔥\s*Gemini\s*Bot\s*đây!?\s*😊?\s*\n?/i, '')  // Xóa "🔥 Gemini Bot đây! 😊"
    .replace(/^Xin\s*chào!?\s*Tôi\s*là\s*Gemini\s*Bot\s*[.!]?\s*\n?/i, '')  // Xóa "Xin chào! Tôi là Gemini Bot."
    .replace(/^Chào\s*bạn!?\s*Tôi\s*là\s*Gemini\s*Bot\s*[.!]?\s*\n?/i, '')  // Xóa "Chào bạn! Tôi là Gemini Bot."
    // Xóa markdown formatting
    .replace(/\*\*(.*?)\*\*/g, '$1')  // **bold** → bold
    .replace(/\*(.*?)\*/g, '$1')      // *italic* → italic
    .replace(/`(.*?)`/g, '$1')        // `code` → code
    .replace(/#{1,6}\s/g, '')         // # headers → text
    .replace(/^\s*[-*+]\s/gm, '• ')   // - list → • list
    .replace(/^\s*\d+\.\s/gm, '• ')   // 1. numbered → • list
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](link) → text
    .replace(/```[\s\S]*?```/g, (match) => {
      // Xử lý code blocks
      return match
        .replace(/```\w*\n?/g, '')  // Xóa ```
        .replace(/```/g, '')        // Xóa ```
        .trim();
    })
    // Làm sạch whitespace thừa
    .replace(/\n{3,}/g, '\n\n')       // Giảm line breaks thừa
    .replace(/^\s+|\s+$/g, '')        // Trim đầu cuối
    .trim();
}

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

// Hàm download ảnh từ URL
async function downloadImageAsBase64(imageUrl) {
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    let mimeType = response.headers['content-type'] || 'image/jpeg';
    
    // Fix MIME type cho Gemini
    if (mimeType === 'image/jpg') {
      mimeType = 'image/jpeg';
    }
    
    console.log(`📸 Downloaded image: ${mimeType}, size: ${base64.length} chars`);
    return { base64, mimeType };
  } catch (error) {
    console.error('❌ Lỗi download ảnh:', error.message);
    throw error;
  }
}



// Hàm xử lý với Gemini (miễn phí!)
async function getGeminiResponse(message, userId, imageUrl = null) {
  try {
    // Lấy lịch sử chat của user
    let history = chatHistory.get(userId) || [];
    
    // Lấy model preference của user (tự động detect task type)
    let taskType = 'text';
    if (imageUrl) taskType = 'image';
    else if (message.includes('code') || message.includes('lập trình') || message.includes('thuật toán')) taskType = 'code';
    else if (message.includes('toán') || message.includes('tính') || message.includes('phương trình')) taskType = 'math';
    
    const userModel = getUserModel(userId, taskType);
    const currentModel = genAI.getGenerativeModel({ model: userModel.name });
    
    console.log(`🎯 Sử dụng model: ${userModel.display} (task: ${taskType})`);
    
    // Tạo context từ lịch sử chat
    let contextPrompt = `Bạn là một AI assistant thông minh và hữu ích tên là Gemini Bot (${userModel.display}). Hãy trả lời bằng tiếng Việt một cách tự nhiên và thân thiện. 

QUAN TRỌNG: 
1. Trả lời bằng văn bản thuần túy, KHÔNG sử dụng markdown formatting như **, *, #, backticks, []() vì đây là chat trên Zalo. Sử dụng emoji và ký tự đặc biệt để làm đẹp tin nhắn thay vì markdown.
2. KHÔNG tự thêm "🔥 Gemini Bot đây! 😊" hoặc bất kỳ câu chào nào vào đầu câu trả lời.
3. Trả lời trực tiếp vào nội dung, không cần giới thiệu bản thân.

Bạn có thể giúp viết code, giải thích kiến thức, dịch thuật và nhiều việc khác.

`;
    
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
    
    // Gọi Gemini API với retry mechanism
    let result;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        
        // Chọn model (thử fallback nếu không phải lần đầu)
        let modelToUse = currentModel;
        if (attempts > 1) {
          const fallbackModelName = FALLBACK_MODELS[attempts - 2];
          if (fallbackModelName) {
            modelToUse = genAI.getGenerativeModel({ model: fallbackModelName });
            console.log(`🔄 Retry ${attempts} với model: ${fallbackModelName}`);
          }
        }
        
        if (imageUrl) {
          // Xử lý với ảnh (Gemini Vision)
          console.log('🖼️ Phân tích ảnh với Gemini Vision...');
          const imageData = await downloadImageAsBase64(imageUrl);
          
          const prompt = `${contextPrompt}

Người dùng đã gửi kèm một hình ảnh. Hãy phân tích ảnh và trả lời câu hỏi dựa trên nội dung ảnh.`;

          result = await modelToUse.generateContent([
            prompt,
            {
              inlineData: {
                data: imageData.base64,
                mimeType: imageData.mimeType
              }
            }
          ]);
        } else {
          // Xử lý text thông thường
          result = await modelToUse.generateContent(contextPrompt);
        }
        
        // Nếu thành công, thoát loop
        break;
        
      } catch (error) {
        console.error(`❌ Lỗi attempt ${attempts}:`, error.message);
        
        if (attempts >= maxAttempts) {
          // Hết attempts, throw error
          throw error;
        }
        
        // Đợi 1-2 giây trước khi retry
        await new Promise(resolve => setTimeout(resolve, 1000 + (attempts * 500)));
      }
    }
    
    let aiResponse = result.response.text();
    
    // Làm sạch format markdown cho Zalo
    aiResponse = cleanMarkdownForZalo(aiResponse);
    
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
    
    // Xử lý tin nhắn text
    if (event_name === 'message.text.received' && message && message.text) {
      const chatId = message.chat.id;
      const userId = message.from.id;
      const userMessage = message.text;
      const userName = message.from.display_name || 'Bạn';
      
      console.log(`💬 Tin nhắn text từ ${userName} (${userId}): ${userMessage}`);
      
      // Xử lý các lệnh đặc biệt
      if (userMessage.toLowerCase() === '/start') {
        await sendZaloMessage(chatId, `Xin chào ${userName}! 👋

🤖 Tôi là Gemini Bot trên Zalo. Tôi có thể:
• Trả lời câu hỏi về mọi chủ đề
• Viết và giải thích code
• Dịch thuật đa ngôn ngữ  
• Giải thích kiến thức phức tạp
• Sáng tạo nội dung
• 📸 Phân tích ảnh (OCR, mô tả)
• 📋 Phân tích text/code được paste
• Và nhiều thứ khác!

💡 Hãy chat bình thường với tôi như ChatGPT nhé! (Powered by Google Gemini)

📝 Lệnh hữu ích:
/help - Xem hướng dẫn
/clear - Xóa lịch sử chat
/model - Xem/chọn AI model`);

        } else if (userMessage.toLowerCase() === '/clear') {
          chatHistory.delete(userId);
          await sendZaloMessage(chatId, '🗑️ Đã xóa lịch sử chat. Bắt đầu cuộc trò chuyện mới!');
          
        } else if (userMessage.toLowerCase() === '/model') {
          // Hiển thị model hiện tại và danh sách
          const currentModelKey = userModels.get(userId) || 'flash';
          const currentModel = getUserModel(userId);
          
          let modelList = `🤖 Model hiện tại: ${currentModel.display}`;
          if (currentModelKey === 'auto') {
            modelList += ` (AUTO - tự động chọn)`;
          }
          modelList += `\n\n📋 Danh sách models:\n\n`;
          
          // Hiển thị AUTO mode
          const autoCheck = currentModelKey === 'auto' ? '✅ ' : '   ';
          modelList += `${autoCheck}🎯 AUTO (Khuyến nghị)\n   Tự động chọn model phù hợp\n   Lệnh: /model auto\n\n`;
          
          Object.entries(AVAILABLE_MODELS).forEach(([key, model]) => {
            const current = userModels.get(userId) === key ? '✅ ' : '   ';
            modelList += `${current}${model.display}\n   ${model.description}\n   Lệnh: /model ${key}\n\n`;
          });
          
          modelList += `💡 Cách dùng:\n/model auto - Tự động NHANH (khuyến nghị)\n/model flash - Luôn dùng Flash\n/model pro - Thông minh nhưng CHẬM`;
          
          await sendZaloMessage(chatId, modelList);
          
        } else if (userMessage.toLowerCase().startsWith('/model ')) {
          // Chuyển đổi model
          const modelKey = userMessage.toLowerCase().replace('/model ', '').trim();
          
          if (modelKey === 'auto') {
            userModels.set(userId, 'auto');
            await sendZaloMessage(chatId, `🎯 Đã bật chế độ AUTO!

🤖 Bot sẽ tự động chọn model NHANH:
• 📸 Ảnh → Flash (tốt cho vision)
• 🧮 Toán/Code → Flash 8B (ổn định)
• 💬 Chat thường → Flash (nhanh)

⚡ Chỉ dùng model nhanh, không dùng Pro để tránh chậm!

/model để xem chi tiết`);
          } else if (AVAILABLE_MODELS[modelKey]) {
            userModels.set(userId, modelKey);
            const selectedModel = AVAILABLE_MODELS[modelKey];
            await sendZaloMessage(chatId, `✅ Đã chuyển sang model: ${selectedModel.display}

📝 ${selectedModel.description}

🎯 Áp dụng cho: text, ảnh, file

💡 Dùng /model auto để bot tự chọn model phù hợp`);
          } else {
            const availableKeys = Object.keys(AVAILABLE_MODELS).join(', ');
            await sendZaloMessage(chatId, `❌ Model không hợp lệ!

📋 Models có sẵn: ${availableKeys}, auto

💡 Ví dụ: /model pro hoặc /model auto`);
          }
          
        } else if (userMessage.toLowerCase() === '/help') {
          await sendZaloMessage(chatId, `📚 Hướng dẫn sử dụng Gemini Bot:

🔹 **Chat bình thường:** Gửi bất kỳ câu hỏi nào
🔹 **/start** - Khởi động bot và xem giới thiệu
🔹 **/clear** - Xóa lịch sử cuộc trò chuyện
🔹 **/model** - Xem/chọn AI model (Flash/Pro)
🔹 **/help** - Hiển thị hướng dẫn này

💡 **Ví dụ sử dụng:**
• "Giải thích thuật toán bubble sort"
• "Viết code Python tính giai thừa"
• "Dịch sang tiếng Anh: Xin chào"
• "Tóm tắt cuốn sách Sapiens"
• 📸 Chụp ảnh code + "Review code này"
• 📋 Paste code + "Tìm lỗi: [code]"

🤖 **Models AI:**
• /model auto - Tự động chọn (khuyến nghị)
• /model flash - Chat nhanh
• /model pro - Thông minh (chậm hơn)

🎯 Bot nhớ ngữ cảnh cuộc trò chuyện để trả lời chính xác hơn!`);

                } else {
          // Chat bình thường với Gemini
          console.log('🤖 Đang xử lý với Gemini...');
          await sendChatAction(chatId, 'typing');
          const aiResponse = await getGeminiResponse(userMessage, userId);
          
          // Gửi trực tiếp, để Zalo tự cắt nếu cần
          await sendZaloMessage(chatId, aiResponse);
        }
      }
      // Xử lý tin nhắn có ảnh
      else if (event_name === 'message.image.received' && message && message.photo_url) {
        const chatId = message.chat.id;
        const userId = message.from.id;
        const userName = message.from.display_name || 'Bạn';
        const imageUrl = message.photo_url;
        const caption = message.caption || 'Phân tích ảnh này giúp tôi';
        
        console.log(`🖼️ Tin nhắn ảnh từ ${userName} (${userId}): ${caption}`);
        console.log(`📸 URL ảnh: ${imageUrl}`);
        
        try {
          // Hiển thị "đang gõ"
          await sendChatAction(chatId, 'typing');
          
          // Phân tích ảnh với Gemini Vision
          console.log('🤖 Đang phân tích ảnh với Gemini...');
          const aiResponse = await getGeminiResponse(caption, userId, imageUrl);
          
          // Gửi trực tiếp với prefix ảnh
          await sendZaloMessage(chatId, `🖼️ ${aiResponse}`);
        } catch (error) {
          console.error('❌ Lỗi xử lý ảnh:', error);
          await sendZaloMessage(chatId, '🖼️ Xin lỗi, tôi không thể phân tích ảnh này. Vui lòng thử lại sau.');
        }
      }
      // Xử lý message không hỗ trợ (bao gồm file uploads)
      else if (event_name === 'message.unsupported.received') {
        const chatId = message.chat.id;
        const userId = message.from.id;
        const userName = message.from.display_name || 'Bạn';
        
        console.log(`❌ Tin nhắn không hỗ trợ từ ${userName} (${userId})`);
        
        await sendZaloMessage(chatId, `❌ Xin lỗi ${userName}, tôi không hỗ trợ file uploads!

🔄 **Thay vào đó:**

📸 **Chụp ảnh** thay vì gửi file
• Chụp màn hình code/document  
• Gửi ảnh + câu hỏi
• Tôi sẽ OCR và phân tích

📋 **Copy-paste text**
• Copy nội dung cần phân tích
• Paste vào chat + câu hỏi

💡 **Ví dụ:**
• Chụp ảnh code → "Review code này"
• Paste: "Tìm lỗi: function test() {...}"

🤖 Tôi hỗ trợ: TEXT và ẢNH`);
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
  console.log(`🚀 Bot Zalo Gemini đang chạy tại port ${PORT}`);
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
