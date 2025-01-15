const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

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
        name: 'serveur-informations',
        description: 'Affiche des informations détaillées sur le serveur.',
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        // Récupérer les informations nécessaires
        const guild = interaction.guild;
        const owner = await guild.fetchOwner();
        const memberCount = guild.memberCount;
        const activeMembers = guild.members.cache.filter(member => 
            ['online', 'idle', 'dnd'].includes(member.presence?.status)
        ).size;        
        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount;
        const creationDate = `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`;
        const bannerURL = guild.bannerURL({ size: 1024, format: 'png' });
        const iconURL = guild.iconURL({ size: 512, format: 'png' });

        // Créer l'embed
        const embed = new EmbedBuilder()
            .setAuthor({ name: guild.name, iconURL: iconURL || null })
            .setTitle('Informations sur le serveur')
            .setThumbnail(iconURL || null)
            .setColor(guildData.botColor || '#f40076')
            .addFields(
                { name: '🖥️・Informations sur le serveur :', value: `> **ID :** \`\`${guild.id}\`\`\n> **Nom :** \`\`${guild.name}\`\`\n> **Description :** ${guild.description || 'Aucune description disponible.'}\n> **Date de création :** ${creationDate}\n> **Propriétaire :** <@${owner.user.id}>`, inline: false },
                { name: '📊・Statistiques du serveur :', value: `> **Membres :** ${memberCount} (${activeMembers} en ligne)\n> **Niveau de Boost :** ${boostLevel} (${boostCount} boosts)`, inline: false }
            )
            .setImage(bannerURL || guildData.welcomeIMG)
            .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();
        const row = new ActionRowBuilder();
        if (iconURL) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel('Icône')
                    .setStyle(ButtonStyle.Link)
                    .setURL(iconURL)
            );
        }
        if (bannerURL) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel('Bannière d’arrière-plan')
                    .setStyle(ButtonStyle.Link)
                    .setURL(bannerURL)
            );
        }
        if (guild.vanityURLCode) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel('Bannière d’invitation')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.gg/${guild.vanityURLCode}`)
            );
        }
        await interaction.editReply({ content: '', embeds: [embed], components: [row] });
    },
};
