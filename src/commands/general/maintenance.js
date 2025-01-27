const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');


function loadGuildData(guildPath) {
    try {
        if (fs.existsSync(guildPath)) {
            const data = fs.readFileSync(guildPath, 'utf-8');
            return JSON.parse(data);
        } else {
            console.log(`Le fichier pour la guilde ${guildPath} n'existe pas.`);
            return {};
        }
    } catch (err) {
        console.error('Erreur lors du chargement des données de la guilde:', err);
        return {};
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('maintenance')
        .setDescription('Affiche si le bot est en maintenance ou non.'),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);

        // Variables pour les émojis personnalisés
        let emojis = {
            status: {
                functional: '<:7431theconnectionisexcellent:1328478446795358330>',
                maintenance: '<a:28213ttsloading:1328488543726866553>',
            }
        };

        // Embed pour le statut des services
        const embed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setDescription(
                `# ${emojis.status.functional} | ETA:
\`\`Dispatch.IO n'est pas en maintenance !\`\`
                `
            );

        await interaction.editReply({ content: '', embeds: [embed], ephemeral: true });
        const fetchedMessage = await interaction.fetchReply();
        // await fetchedMessage.react(`${emojis.status.functional}`); // Réaction d'engrenage
    },
};
