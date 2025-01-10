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
                return interaction.reply({
                    content: 'Vous n\'avez pas la permission de consulter ceci. 🔴',
                    ephemeral: true,
                });
            }
        } else {
            return interaction.reply({
                content: '**Rôle administrateur non configuré ->** `/config-general`',
                ephemeral: true,
            });
        }
        const target = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(target.id);

        // Fetch les données utilisateur complètes pour obtenir la bannière
        const user = await target.fetch();

        // Récupération des badges officiels Discord en utilisant bitfield
        const badgeFlags = target.flags.bitfield;

        // Correspondance des badges avec des icônes
        const badgeIcons = {
        DISCORD_EMPLOYEE: '👨‍💻',
        PARTNERED_SERVER_OWNER: '🎮',
        HYPESQUAD_EVENTS: '🎉',
        BUGHUNTER_LEVEL_1: '🐛',
        HOUSE_BRAVERY: '🦁',
        HOUSE_BRILLIANCE: '⚡',
        HOUSE_BALANCE: '⚖️',
        EARLY_SUPPORTER: '⏳',
        TEAM_USER: '🧑‍🤝‍🧑',
        BUGHUNTER_LEVEL_2: '🐛',
        VERIFIED_BOT: '🤖',
        VERIFIED_BOT_DEVELOPER: '👨‍💻',
        };

        // Vérification des badges actifs en fonction du bitfield
        const badgesDisplay = [];

        if (badgeFlags & (1 << 2)) badgesDisplay.push('HYPESQUAD_EVENTS'); // Hypesquad Events
        if (badgeFlags & (1 << 3)) badgesDisplay.push('BUGHUNTER_LEVEL_1'); // Bug Hunter Level 1
        if (badgeFlags & (1 << 6)) badgesDisplay.push('HOUSE_BRAVERY'); // House of Bravery
        if (badgeFlags & (1 << 7)) badgesDisplay.push('HOUSE_BRILLIANCE'); // House of Brilliance
        if (badgeFlags & (1 << 8)) badgesDisplay.push('HOUSE_BALANCE'); // House of Balance
        if (badgeFlags & (1 << 9)) badgesDisplay.push('EARLY_SUPPORTER'); // Early Supporter
        if (badgeFlags & (1 << 10)) badgesDisplay.push('TEAM_USER'); // Team User

        // Construction de la chaîne de badges affichée
        const badges = badgesDisplay.length > 0 
        ? badgesDisplay.map(badge => badgeIcons[badge]).join(' ') 
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

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};
