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

function formatZuluTime() {
    const now = new Date();
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[now.getUTCMonth()];
    const year = now.getUTCFullYear();

    return {
        time: `${hours}:${minutes}Z`,
        date: `${day} ${month} ${year}`,
        raw: `${hours}${minutes}Z`
    };
}

module.exports = {
    data: {
        name: 'heure-zulu',
        description: 'Affiche l\'heure UTC (Zulu)',
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        
        const zuluTime = formatZuluTime();
        
        const embed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setTitle('⏰ Heure Zulu (UTC)')
            .setDescription(`L'heure Zulu actuelle est:`)
            .addFields(
                { name: '🕒 Heure', value: `\`${zuluTime.time}\``, inline: true },
                { name: '📅 Date', value: `\`${zuluTime.date}\``, inline: true },
                { name: '🎯 Format ATC', value: `\`${zuluTime.raw}\``, inline: true }
            )
            .setFooter({
                text: `Demandé par ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.editReply({ content: '', embeds: [embed] });
    },
};