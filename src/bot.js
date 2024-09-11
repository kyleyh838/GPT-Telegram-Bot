const TelegramBot = require('node-telegram-bot-api');
const { TELEGRAM_BOT_TOKEN, WHITELISTED_USERS } = require('./config');
const { generateStreamResponse } = require('./api');

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

bot.onText(/\/start/, (msg) => {
  console.log('Received /start command');
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome! Send me a message and I\'ll generate a response using AI.')
    .catch(error => console.error('Error sending start message:', error));
});

async function handleMessage(msg) {
  console.log('Handling message:', JSON.stringify(msg));
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    if (!WHITELISTED_USERS.includes(userId)) {
      console.log('User not whitelisted:', userId);
      console.log('Whitelisted users:', WHITELISTED_USERS);
      await bot.sendMessage(chatId, 'Sorry, you are not authorized to use this bot.');
      return;
    }

    if (msg.text && !msg.text.startsWith('/')) {
      const processingMessage = await bot.sendMessage(chatId, 'Processing your request...');
      console.log('Generating response for:', msg.text);

      let fullResponse = '';
      const stream = await generateStreamResponse(msg.text);

      for await (const part of stream) {
        const content = part.choices[0]?.delta?.content || '';
        fullResponse += content;

        // 实现打字机效果
        if (content) {
          try {
            await bot.editMessageText(fullResponse, {
              chat_id: chatId,
              message_id: processingMessage.message_id
            });
          } catch (editError) {
            console.error('Error updating message:', editError);
          }
        }
      }

      if (!fullResponse.trim()) {
        await bot.editMessageText('Sorry, I couldn\'t generate a response. Please try again.', {
          chat_id: chatId,
          message_id: processingMessage.message_id
        });
      }
      console.log('Response sent successfully');
    } else {
      console.log('Received non-text or command message');
    }
  } catch (error) {
    console.error('Error in handleMessage:', error);
    await bot.sendMessage(chatId, 'Sorry, there was an error processing your message. Please try again later.')
      .catch(sendError => console.error('Error sending error message:', sendError));
  }
}

module.exports = { bot, handleMessage };
