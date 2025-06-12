// index.js

// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

// --- CONFIGURAÇÕES ---

// Pega os tokens do arquivo .env
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const geminiApiKey = process.env.GOOGLE_API_KEY;

// Inicializa o bot do Telegram
const bot = new TelegramBot(telegramToken, { polling: true });

// Inicializa o cliente do Google AI
const genAI = new GoogleGenerativeAI(geminiApiKey);

// **A INSTRUÇÃO DO SISTEMA: A "ALMA" DO SEU CHATBOT**
// Esta é a parte mais importante para definir o comportamento do seu bot.
const systemInstruction = {
  role: "system",
  parts: [{ text: `
    Você é 'Aura', um chatbot de apoio emocional e ouvinte compassivo. Seu propósito é:
    1.  **Ouvir com Empatia:** Oferecer um espaço seguro e sem julgamentos para o usuário expressar seus sentimentos e pensamentos. Valide os sentimentos dele (ex: "Entendo que isso deve ser muito difícil.").
    2.  **Ser Paciente:** Nunca apresse o usuário. Deixe que ele guie o ritmo da conversa.
    3.  **Fazer Perguntas Abertas:** Incentive a reflexão com perguntas como "Como isso fez você se sentir?", "O que passou pela sua cabeça nesse momento?" ou "Tem algo mais sobre isso que você gostaria de compartilhar?".
    4.  **Não Ser um Terapeuta:** Você NÃO é um profissional de saúde mental. NUNCA dê conselhos médicos, diagnósticos ou planos de tratamento. Se o usuário mencionar crises sérias (risco de vida, automutilação), você deve gentilmente sugerir a busca por ajuda profissional imediata e fornecer contatos de emergência (como o CVV no Brasil, telefone 188), afirmando claramente que a segurança dele é a prioridade máxima.
    5.  **Manter a Calma e o Apoio:** Sua linguagem deve ser sempre gentil, acolhedora e positiva. Evite clichês e respostas robóticas.
  `}],
};

// Configurações de segurança para o modelo Gemini
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// Objeto para armazenar o histórico de conversas de cada usuário
const chats = {};

console.log('🤖 Bot de apoio emocional iniciado e aguardando mensagens...');

// --- LÓGICA DO BOT ---

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userInput = msg.text;

    // Ignora qualquer mensagem que não seja texto
    if (!userInput) return;

    // Inicia um "digitando..." para o usuário saber que o bot está processando
    bot.sendChatAction(chatId, 'typing');

    try {
        // Se for a primeira mensagem do usuário, cria um novo histórico de chat
        if (!chats[chatId]) {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest", systemInstruction, safetySettings });
            chats[chatId] = model.startChat({
                history: [],
                generationConfig: {
                    maxOutputTokens: 1000,
                },
            });
            console.log(`Nova conversa iniciada para o chat ID: ${chatId}`);
        }

        // Envia a mensagem do usuário para o Gemini e aguarda a resposta
        const chatSession = chats[chatId];
        const result = await chatSession.sendMessage(userInput);
        const response = result.response;
        const botResponse = response.text();

        // Envia a resposta do bot de volta para o usuário no Telegram
        bot.sendMessage(chatId, botResponse);

    } catch (error) {
        console.error('❌ Erro ao processar a mensagem:', error);
        bot.sendMessage(chatId, 'Desculpe, estou com um pouco de dificuldade para processar sua mensagem agora. Vamos tentar de novo em um instante.');
    }
});

// Mensagem para o comando /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Olá! Eu sou a Aura, sua ouvinte e companheira de apoio emocional. Sinta-se à vontade para compartilhar o que está em sua mente. Estou aqui para ouvir, sem julgamentos.');
});