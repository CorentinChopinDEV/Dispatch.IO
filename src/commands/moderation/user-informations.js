const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const loadGuildData = (guildPath) => {
    try {
        if (fs.existsSync(guildPath)) {
            return JSON.parse(fs.readFileSync(guildPath, 'utf8'));
        }
    } catch (error) {
        return console.error(`Erreur lors du chargement des données : ${error.message}`);
    }
};

module.exports = {
    data: {
        name: 'user-informations',
        description: 'Avoir des informations sur un utilisateur.',
        options: [
            {
                name: 'user',
                type: 6, // USER
                description: 'Information de l\'utilisateur',
                required: true,
            }
        ],
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildPath = path.join(__dirname, `../../../guilds-data/${guildId}.json`);

        // Charger les données de la guilde
        const guildData = loadGuildData(guildPath);
        if (guildData.ownerId) {
            const isOwner = guildData.ownerId === interaction.user.id;
            const modRoleId = guildData.mod_role;
            const hasmodRole = interaction.member.roles.cache.has(modRoleId);
            const adminRoleId = guildData.admin_role;
            const hasadminRole = interaction.member.roles.cache.has(adminRoleId);
        
            // Autoriser seulement si l'utilisateur est soit ownerId, soit possède le rôle Dev
            if (!isOwner && !hasadminRole && !hasmodRole) {
                return interaction.editReply({
                    content: 'Vous n\'avez pas la permission de consulter ceci. 🔴',
                    ephemeral: true,
                });
            }
        } else {
            return interaction.editReply({
                content: '**Rôle administrateur non configuré ->** `/config-general`',
                ephemeral: true,
            });
        }
        const target = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(target.id);

        // Fetch les données utilisateur complètes pour obtenir la bannière et les flags
        const user = await target.fetch();

        // Vérifie si les flags sont disponibles (target.flags peut être null si non chargé correctement)
        const userFlags = user.flags?.toArray() || [];

        // Correspondance des badges avec des icônes
        const badgeIcons = {
            Staff: '<:discordemployee:1327777831928860836>',
            Partner: '<:discordpartner:1327777756414480414>',
            Hypesquad: '<:discordhypesquad:1327777672494972948>',
            BugHunterLevel1: '<:discordbughunterlv1:1327777776186560542>',
            HypeSquadOnlineHouse1: '<:discordbravery:1327777580736315492>', // House of Bravery
            HypeSquadOnlineHouse2: '<:discordbrillance:1327777598763171901>', // House of Brilliance
            HypeSquadOnlineHouse3: '<:discordbalance:1327777740186976446>', // House of Balance
            PremiumEarlySupporter: '<:discordearlysupporter:1327777649803788370>',
            BugHunterLevel2: '<:discordbughunterlv2:1327777795681681560>',
            VerifiedBot: '<:certifiedmod:1327778663378194452>',
            VerifiedDeveloper: '<:activedeveloper:1327778740322832386>',
            ActiveDeveloper: '<:activedeveloper:1327778740322832386>',
        };

        // Construction de la chaîne de badges affichée
        const badges = userFlags.length > 0
            ? userFlags.map(flag => badgeIcons[flag] || flag).join(' ')
            : 'Aucun badge';
        // Vérification si la bannière est animée ou non
        const bannerURL = user.banner
        ? `https://cdn.discordapp.com/banners/${user.id}/${user.banner}${user.banner.startsWith('a_') ? '.gif' : ''}?size=4096${user.banner.startsWith('a_') ? '&dynamic=true' : ''}`
        : null;

        // Embed principal
        const embed = new EmbedBuilder()
        .setColor(guildData.botColor || '#f40076')
        .setAuthor({
            name: `Informations sur l'utilisateur`,
            iconURL: target.displayAvatarURL({ dynamic: true })
        })
        .setDescription(`**${target.username}** 🍕`)
        .addFields(
            {
            name: '👤 • Informations sur l’utilisateur :',
            value: `
    **ID** : \`${target.id}\`
    **Nom** : [${target.username}](https://discord.com/users/${target.id}) / <@${target.id}>
    **Badges** : ${badges}
    **Création le** : <t:${Math.floor(target.createdTimestamp / 1000)}:F>
    **Bot** : ${target.bot ? '✅ Oui' : '❌ Non'}
            `,
            inline: false
            },
            {
            name: '🖥️ • Informations sur le serveur :',
            value: `
    **Pseudo** : ${member.nickname || target.username}
    **Rejoint le** : <t:${Math.floor(member.joinedTimestamp / 1000)}:F>
            `,
            inline: false
            }
        )
        .setImage(bannerURL || 'https://via.placeholder.com/1024x256?text=Pas+de+bannière') // Affiche la bannière si elle existe
        .setFooter({
            text: `Demandé par ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

        // Boutons d'action
        const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Avatar')
            .setStyle(5)
            .setURL(target.displayAvatarURL({ dynamic: true, size: 1024 })),
        new ButtonBuilder()
            .setLabel('Bannière de profil')
            .setStyle(5)
            .setURL(bannerURL || 'https://discord.com') // Lien vers la bannière si elle existe
        );

        await interaction.editReply({ content: '', embeds: [embed], components: [row] });
    },
};
