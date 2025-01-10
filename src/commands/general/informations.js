const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const os = require('os');
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
        name: 'informations',
        description: 'Affiche les informations détaillées sur le bot.',
    },
    async execute(interaction) {
        const client = interaction.client;
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        // Uptime
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const uptimeString = `${days}j ${hours}h ${minutes}m ${seconds}s`;

        // Mémoire
        const memoryUsage = process.memoryUsage();
        const totalMemory = os.totalmem();
        const usedMemoryMB = (memoryUsage.rss / 1024 / 1024).toFixed(2);
        const totalMemoryMB = (totalMemory / 1024 / 1024).toFixed(2);
        const memoryPercent = ((memoryUsage.rss / totalMemory) * 100).toFixed(2);

        // CPU
        const cpuModel = os.cpus()[0].model;
        const cpuCores = os.cpus().length;

        // Serveurs et utilisateurs
        const totalGuilds = client.guilds.cache.size;
        const totalUsers = client.users.cache.size;

        // Commandes disponibles
        const commands = client.commands.map(cmd => cmd.data.name).join(', ');

        // Bannière par défaut
        let bannerURL = client.user.bannerURL({ size: 1024 });
        if (!bannerURL) {
            bannerURL = 'https://i.ibb.co/HPrWVPP/Moderation-Anti-Raid.png';
        }

        // Informations supplémentaires
        const botVersion = '0.0.8';
        const creatorID = '1215253116224671748';
        const supportServerURL = 'https://discord.gg/2sJKQNQ6jj';

        const embed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setAuthor({ 
                name: `Statistiques de ${client.user.username}`, 
                iconURL: client.user.displayAvatarURL() 
            })
            .setImage(bannerURL)
            .addFields(
                { name: '📅 Uptime', value: `\`\`\`${uptimeString}\`\`\``, inline: true },
                { name: '🌍 Serveurs', value: `\`\`\`${totalGuilds}\`\`\``, inline: true },
                { name: '👥 Utilisateurs', value: `\`\`\`${totalUsers}\`\`\``, inline: true },
                { name: '💾 Mémoire utilisée', value: `\`\`\`${usedMemoryMB} MB / ${totalMemoryMB} MB (${memoryPercent}%)\`\`\``, inline: false },
                { name: '⚙️ CPU', value: `\`\`\`${cpuModel}\`\`\``, inline: false },
                { name: '🖥️ Cœurs CPU', value: `\`\`\`${cpuCores}\`\`\``, inline: true },
                { name: '🤖 Version du bot', value: `\`\`\`${botVersion}\`\`\``, inline: true },
                { name: '⚡ Commandes disponibles', value: `\`\`\`${commands}\`\`\``, inline: false }
            )
            .setFooter({ 
                text: `Demandé par ${interaction.user.tag}`, 
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
            })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Serveur Support')
                    .setStyle(ButtonStyle.Link)
                    .setURL(supportServerURL),
            new ButtonBuilder()
                    .setLabel('Contactez le créateur')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/users/${creatorID}`)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};