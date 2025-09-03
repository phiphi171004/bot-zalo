const axios = require('axios');
require('dotenv').config();

const BOT_TOKEN = process.env.ZALO_BOT_TOKEN;

async function checkBotToken() {
  console.log('🔍 Kiểm tra Bot Token...');
  console.log('Token:', BOT_TOKEN);
  
  try {
    // Test API getMe để kiểm tra token
    const response = await axios.get(`https://bot-api.zapps.me/bot${BOT_TOKEN}/getMe`);
    
    console.log('✅ Bot Token hợp lệ!');
    console.log('Bot info:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Bot Token không hợp lệ:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    return false;
  }
}

async function testWebhook() {
  console.log('\n🔧 Test setup webhook...');
  
  try {
    const response = await axios.post(`https://bot-api.zapps.me/bot${BOT_TOKEN}/setWebhook`, {
      url: process.env.WEBHOOK_URL,
      secret_token: process.env.ZALO_SECRET_TOKEN
    });
    
    console.log('📡 Webhook response:', response.data);
    
    if (response.data.ok === false) {
      console.error('❌ Webhook setup failed:', response.data.description);
    } else {
      console.log('✅ Webhook setup thành công!');
    }
  } catch (error) {
    console.error('❌ Lỗi test webhook:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
  }
}

async function main() {
  console.log('🤖 Zalo Bot Token Checker\n');
  
  const tokenValid = await checkBotToken();
  
  if (tokenValid) {
    await testWebhook();
  } else {
    console.log('\n💡 Hướng dẫn lấy Bot Token đúng:');
    console.log('1. Vào https://bot.zapps.me/');
    console.log('2. Tạo Bot mới (không phải OA)');
    console.log('3. Copy Bot Token từ dashboard');
    console.log('4. Bot Token khác với OA Access Token!');
  }
}

main(); 