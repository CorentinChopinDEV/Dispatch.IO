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
            return {};
        }
    } catch (err) {
        console.error('Erreur lors du chargement des données de la guilde:', err);
        return {};
    }
}

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

// Fonction pour découper le texte en morceaux de 2000 caractères
function chunkText(text, chunkSize) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
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

        // Envoie un message initial de "Chargement en cours"
        await interaction.editReply({
            content: 'Chargement de la réponse... 🧠',
            ephemeral: true,
        });

        try {
            const response = await generateGeminiResponse(question);

            // Découper la réponse en morceaux de 2000 caractères
            const chunks = chunkText(response, 2000);

            for (const [index, chunk] of chunks.entries()) {
                const embed = new EmbedBuilder()
                    .setDescription(chunk)
                    .setColor(guildData.botColor || '#f40076')
                    .setFooter({
                        text: `Partie ${index + 1}/${chunks.length}`,
                        iconURL: interaction.guild.iconURL(),
                    })
                    .setTimestamp();
                if (index === 0) {
                    embed.setTitle(`Gemini AI par Google <:discordearlysupporter:1327777649803788370>`);
                    embed.setDescription(`**Gemini a répondu :** 📨\n${chunk}`)
                }
                if (index === 0) {
                    // Modifier le message initial pour la première partie
                    await interaction.editReply({
                        content: '**Gemini vous a répondu.** 📨',
                        embeds: [embed],
                    });
                } else {
                    // Envoyer de nouveaux messages pour les parties suivantes
                    await interaction.followUp({
                        embeds: [embed],
                    });
                }
            }

            // Ajouter un bouton pour inviter le bot dans le dernier message
            if (chunks.length > 1) {
                const actionRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setURL(`https://discord.com/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`)
                            .setLabel('Inviter le bot 🩵')
                            .setStyle(ButtonStyle.Link)
                    );

                await interaction.followUp({
                    content: 'Besoin d’un coup de main ? Invitez-moi !',
                    components: [actionRow],
                });
            }
        } catch (error) {
            console.error('Erreur lors de la génération de la réponse:', error);
            await interaction.editReply({
                content: 'Désolé, une erreur est survenue lors de la génération de la réponse.',
                ephemeral: true,
            });
        }
    },
};
