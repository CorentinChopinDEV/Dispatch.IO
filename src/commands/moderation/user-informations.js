const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const loadGuildData = (guildPath) => {
    try {
        if (fs.existsSync(guildPath)) {
            return JSON.parse(fs.readFileSync(guildPath, 'utf8'));
        }
    } catch (error) {
        console.error(`Erreur lors du chargement des données : ${error.message}`);
    }
    return {};
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
        const guildData = loadGuildData(guildPath);

        const target = interaction.options.getUser('user') || interaction.user;
        const user = await target.fetch();
        const member = interaction.guild.members.cache.get(target.id);

        const userFlags = user.flags?.toArray() || [];
        const badgeIcons = {
            Staff: '<:discordemployee:1327777831928860836>',
            Partner: '<:discordpartner:1327777756414480414>',
            Hypesquad: '<:discordhypesquad:1327777672494972948>',
            BugHunterLevel1: '<:discordbughunterlv1:1327777776186560542>',
            HypeSquadOnlineHouse1: '<:discordbravery:1327777580736315492>',
            HypeSquadOnlineHouse2: '<:discordbrillance:1327777598763171901>',
            HypeSquadOnlineHouse3: '<:discordbalance:1327777740186976446>',
            PremiumEarlySupporter: '<:discordearlysupporter:1327777649803788370>',
            BugHunterLevel2: '<:discordbughunterlv2:1327777795681681560>',
            VerifiedBot: '<:certifiedmod:1327778663378194452>',
            VerifiedDeveloper: '<:activedeveloper:1327778740322832386>',
            ActiveDeveloper: '<:activedeveloper:1327778740322832386>',
        };

        const badges = userFlags.length > 0
            ? userFlags.map(flag => badgeIcons[flag] || flag).join(' ')
            : 'Aucun badge';

        const bannerURL = user.banner
            ? `https://cdn.discordapp.com/banners/${user.id}/${user.banner}${user.banner.startsWith('a_') ? '.gif' : '.png'}?size=4096`
            : null;

        const embed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setAuthor({
                name: `Informations sur l'utilisateur`,
                iconURL: target.displayAvatarURL({ dynamic: true }),
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
                    inline: false,
                }
            );

        if (member) {
            embed.addFields(
                {
                    name: '🖥️ • Informations sur le serveur :',
                    value: `
**Pseudo** : ${member.nickname || target.username}
**Rejoint le** : <t:${Math.floor(member.joinedTimestamp / 1000)}:F>
                    `,
                    inline: false,
                }
            );
        } else {
            embed.addFields(
                {
                    name: '🖥️ • Informations sur le serveur :',
                    value: 'Cet utilisateur n’est pas dans ce serveur.',
                    inline: false,
                }
            );
        }

        embed.setImage(bannerURL || 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExeDZybGU5dXY2a2JkcDZ3amxnZXB1Z2c2eDlhcjdxcXlpcm5iZXFnbSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3orif9bOI9WDvGoSmk/giphy.gif')
            .setFooter({
                text: `Demandé par ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
            })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Avatar')
                .setStyle(5)
                .setURL(target.displayAvatarURL({ dynamic: true, size: 1024 })),
            new ButtonBuilder()
                .setLabel('Bannière de profil')
                .setStyle(5)
                .setURL(bannerURL || 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExeDZybGU5dXY2a2JkcDZ3amxnZXB1Z2c2eDlhcjdxcXlpcm5iZXFnbSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3orif9bOI9WDvGoSmk/giphy.gif')
        );

        await interaction.editReply({ content: '', embeds: [embed], components: [row] });
    },
};
