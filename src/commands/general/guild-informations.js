const { EmbedBuilder, ChannelType } = require('discord.js');
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

function formatDate(date) {
    return new Date(date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getVerificationLevel(level) {
    const levels = {
        0: 'Aucune',
        1: 'Faible (E-mail vérifié)',
        2: 'Moyenne (Inscrit depuis 5 minutes)',
        3: 'Élevée (Membre depuis 10 minutes)',
        4: 'Très élevée (Téléphone vérifié)'
    };
    return levels[level] || 'Inconnue';
}

function getNsfwLevel(level) {
    const levels = {
        0: 'Par défaut',
        1: 'Explicite',
        2: 'Sûr',
        3: 'Restreint par l\'âge'
    };
    return levels[level] || 'Inconnu';
}

module.exports = {
    data: {
        name: 'guild-informations',
        description: 'Affiche toutes les informations détaillées du serveur.',
    },
    async execute(interaction) {
        const guild = interaction.guild;
        const guildId = guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);

        // Compter les différents types de salons
        const channels = {
            total: guild.channels.cache.size,
            text: guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size,
            voice: guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size,
            announcement: guild.channels.cache.filter(c => c.type === ChannelType.GuildAnnouncement).size,
            category: guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size,
            stage: guild.channels.cache.filter(c => c.type === ChannelType.GuildStageVoice).size,
            forum: guild.channels.cache.filter(c => c.type === ChannelType.GuildForum).size
        };

        // Récupérer les statistiques des membres
        const members = {
            total: guild.memberCount,
            humans: guild.members.cache.filter(member => !member.user.bot).size,
            bots: guild.members.cache.filter(member => member.user.bot).size,
            online: guild.members.cache.filter(member => member.presence?.status === 'online').size,
            idle: guild.members.cache.filter(member => member.presence?.status === 'idle').size,
            dnd: guild.members.cache.filter(member => member.presence?.status === 'dnd').size,
            offline: guild.members.cache.filter(member => !member.presence || member.presence.status === 'offline').size
        };

        // Créer les embeds avec toutes les informations
        const mainEmbed = new EmbedBuilder()
            .setTitle(`📊 Informations sur ${guild.name}`)
            .setColor(guildData.botColor || '#f40076')
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .addFields(
                { name: '🆔 ID du serveur', value: guild.id, inline: false },
                { name: '👑 Propriétaire', value: `<@${guild.ownerId}>`, inline: false },
                { name: '📅 Créé le', value: formatDate(guild.createdAt), inline: false },
                { name: '🌍 Région', value: guild.preferredLocale || 'Non définie', inline: false },
                { name: '🛡️ Niveau de vérification', value: getVerificationLevel(guild.verificationLevel), inline: false },
                { name: '🔞 Niveau NSFW', value: getNsfwLevel(guild.nsfwLevel), inline: false },
                { name: '✨ Niveau de boost', value: `Niveau ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, inline: false },
                { name: '🎭 Rôles', value: `${guild.roles.cache.size} rôles`, inline: false },
                { name: '😀 Emojis', value: `${guild.emojis.cache.size} emojis`, inline: false }
            );

        const channelsEmbed = new EmbedBuilder()
            .setTitle('📺 Statistiques des salons')
            .setColor(guildData.botColor || '#f40076')
            .addFields(
                { name: '📝 Salons textuels', value: channels.text.toString(), inline: true },
                { name: '🔊 Salons vocaux', value: channels.voice.toString(), inline: true },
                { name: '📢 Salons d\'annonces', value: channels.announcement.toString(), inline: true },
                { name: '📁 Catégories', value: channels.category.toString(), inline: true },
                { name: '🎭 Salons de scène', value: channels.stage.toString(), inline: true },
                { name: '💬 Forums', value: channels.forum.toString(), inline: true },
                { name: '📊 Total', value: channels.total.toString(), inline: true }
            );

        const membersEmbed = new EmbedBuilder()
            .setTitle('👥 Statistiques des membres')
            .setColor(guildData.botColor || '#f40076')
            .addFields(
                { name: '👤 Humains', value: members.humans.toString(), inline: true },
                { name: '🤖 Bots', value: members.bots.toString(), inline: true },
                { name: '👥 Total', value: members.total.toString(), inline: true },
                { name: '🟢 En ligne', value: members.online.toString(), inline: true },
                { name: '🌙 Inactif', value: members.idle.toString(), inline: true },
                { name: '⛔ Ne pas déranger', value: members.dnd.toString(), inline: true },
                { name: '⚫ Hors ligne', value: members.offline.toString(), inline: true }
            );

        // Informations sur les fonctionnalités
        const features = guild.features.length > 0 
            ? guild.features.map(f => `\`${f}\``).join(', ')
            : 'Aucune fonctionnalité spéciale';

        const featuresEmbed = new EmbedBuilder()
            .setTitle('⚙️ Fonctionnalités du serveur')
            .setColor(guildData.botColor || '#f40076')
            .setDescription(features);

        // Envoyer tous les embeds
        await interaction.editReply({ 
            content: '',
            embeds: [mainEmbed, channelsEmbed, membersEmbed, featuresEmbed],
            ephemeral: false 
        });
    },
};