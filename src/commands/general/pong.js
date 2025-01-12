const { EmbedBuilder } = require('discord.js');
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
    data: {
        name: 'ping',
        description: 'Affiche la latence du Bot et de l\'API.',
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        const client = interaction.client;
        const startTimestamp = Date.now();
        await interaction.deferReply();
        const endTimestamp = Date.now();
        const botLatency = endTimestamp - startTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        // Calcul de l'uptime
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const uptimeString = `${days}j ${hours}h ${minutes}m ${seconds}s`;
        let bannerURL = client.user.bannerURL({ size: 1024 });
        let logoURL = 'https://i.ibb.co/TcdznPc/IO-2.png';
        if (!bannerURL) {
            bannerURL = 'https://i.ibb.co/HPrWVPP/Moderation-Anti-Raid.png';
        }
        const embed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setTitle('🏓 Latence et Statistiques du Bot')
            .setThumbnail(logoURL)
            .setDescription('Voici les performances actuelles du bot :')
            .addFields(
                { name: '🤖 Latence Bot', value: `\`${botLatency}ms\``, inline: true },
                { name: '🌐 Latence API', value: `\`${apiLatency}ms\``, inline: true },
                { name: '⏱️ Uptime', value: `\`${uptimeString}\``, inline: false }
            )
            .setImage(bannerURL)
            .setFooter({
                text: `Demandé par ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], ephemeral: true });
    },
};
