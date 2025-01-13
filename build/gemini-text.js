require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Charger les données de la guilde
function loadGuildData(guildPath) {
    try {
        if (fs.existsSync(guildPath)) {
            const data = fs.readFileSync(guildPath, 'utf-8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('Erreur lors du chargement des données de la guilde:', err);
        return {};
    }
}

// Fonction pour générer une réponse avec Gemini
async function generateGeminiResponse(prompt) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error generating response:', error);
        throw error;
    }
}

// Fonction pour diviser une chaîne de texte en morceaux de moins de 2000 caractères
function chunkText(text, maxLength = 2000) {
    const chunks = [];
    let currentChunk = '';

    for (const word of text.split(' ')) {
        if ((currentChunk + word).length > maxLength) {
            chunks.push(currentChunk);
            currentChunk = word;
        } else {
            currentChunk += ' ' + word;
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}

// L'événement 'messageCreate' pour écouter les messages envoyés
module.exports = {
    async execute(message) {
        // Ne pas répondre aux messages envoyés par le bot
        if (message.author.bot) return;

        // Charger les données de la guilde
        const guildId = message.guild.id;
        const filePath = path.join(__dirname, '../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);

        // Vérifier si le message provient du salon spécifié
        if (guildData && guildData.gemini_channel && message.channel.id === guildData.gemini_channel) {
            // Vérifier si le message contient des fichiers ou des images
            if (message.attachments.size > 0) {
                // Si un fichier ou une image est attaché, envoyer un message d'avertissement
                return message.reply("Attention, vous n'avez pas la permission d'envoyer de fichier ou des dossiers à Gemini.");
            } else {
                // Générer une réponse via Gemini AI
                const question = message.content;
                try {
                    const response = await generateGeminiResponse(question);

                    // Diviser la réponse en morceaux si elle dépasse 2000 caractères
                    const chunks = chunkText(response);

                    // Envoyer chaque morceau dans un message séparé
                    for (const chunk of chunks) {
                        await message.reply(chunk);
                    }
                } catch (error) {
                    console.error('Erreur lors de la génération de la réponse:', error);
                    await message.reply({
                        content: 'Désolé, une erreur est survenue lors de la génération de la réponse.',
                        ephemeral: true
                    });
                }
            }
        }
    },
};
