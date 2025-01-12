require('dotenv').config();
const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
        } else {
        }
    } catch (err) {
        console.error('Erreur lors du chargement des données de la guilde:', err);
        return {};
    }
}

async function generateGeminiResponse(prompt) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error generating response:', error);
        throw error;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gemini')
        .setDescription('Pose une question à Gemini ! 🤖')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('La question que vous souhaitez poser à Gemini')
                .setRequired(true)
        ),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        let guildData = loadGuildData(filePath);

        const question = interaction.options.getString('question');

        // Envoie un message de "Chargement en cours" avant de générer la réponse
        await interaction.reply({ content: 'Chargement en cours... <:supportscommands:1327778758337236992>', ephemeral: false });

        try {
            const response = await generateGeminiResponse(question);

            const responseEmbed = new EmbedBuilder()
                .setTitle(`Gemini AI par Google <:discordearlysupporter:1327777649803788370>`)
                .setDescription(`**La question:**\n *${question}* \n\n **Gemini à répondu:** 📨 \n${response}`)
                .setColor(guildData.botColor || '#f40076')
                .setFooter({
                    text: `Propulsé par Gemini (Google AI)`,
                    iconURL: interaction.guild.iconURL()
                })
                .setImage('https://c.tenor.com/8XNzAxRRcpUAAAAd/tenor.gif')
                .setTimestamp();

            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setURL(`https://discord.com/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`)
                        .setLabel('Inviter le bot 🩵')
                        .setStyle(ButtonStyle.Link)
                );
            // Modifie le message avec l'embed une fois la réponse obtenue
            await interaction.editReply({ content: '**Gemini vous à répondu.** 📨', embeds: [responseEmbed], components: [actionRow], });
        } catch (error) {
            console.error('Erreur lors de la génération de la réponse:', error);
            await interaction.editReply({
                content: 'Désolé, une erreur est survenue lors de la génération de la réponse.',
                ephemeral: true
            });
        }
    },
};
