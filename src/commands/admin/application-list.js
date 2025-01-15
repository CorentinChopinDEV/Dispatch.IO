const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
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
        name: 'applications-list',
        description: 'Affiche la liste des bots présents sur le serveur avec pagination.',
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);

        // Vérification des permissions
        if (guildData.admin_role && guildData.ownerId) {
            const isAdmin = interaction.member.roles.cache.has(guildData.admin_role);
            const isOwner = guildData.ownerId === interaction.user.id;
            if (!isAdmin && !isOwner) {
                return interaction.editReply({ content: 'Vous n\'avez pas la permission de consulter ceci.', ephemeral: true });
            }
        } else {
            return interaction.editReply({ content: '**Rôle administrateur non configuré ->** `/config-general`', ephemeral: true });
        }

        // Récupérer les bots
        const bots = interaction.guild.members.cache.filter(member => member.user.bot);
        if (!bots.size) {
            return interaction.editReply({
                content: 'Aucun bot présent sur ce serveur.',
                ephemeral: true
            });
        }

        // Configuration de la pagination
        const botsArray = Array.from(bots.values());
        const botsPerPage = 3;
        const totalPages = Math.ceil(botsArray.length / botsPerPage);

        // Fonction pour générer un embed pour une page donnée
        const generateEmbed = (page) => {
            const start = page * botsPerPage;
            const end = start + botsPerPage;
            const botsPage = botsArray.slice(start, end);

            const botsInfo = botsPage.map(bot => {
                const hasAdmin = new PermissionsBitField(bot.permissions || 0).has(PermissionsBitField.Flags.Administrator)
                    ? 'Oui'
                    : 'Non';
                return `**${bot.user.username}** (\`${bot.user.id}\`)\n🔹 **Tag** : ${bot.user.tag}\n🔹 **Administrateur** : ${hasAdmin}\n🔹 **Créé le** : <t:${Math.floor(bot.user.createdTimestamp / 1000)}:R>`;
            }).join('\n\n');
            

            return new EmbedBuilder()
                .setTitle(`🤖 Liste des bots sur le serveur (Page ${page + 1}/${totalPages})`)
                .setColor(guildData.botColor || '#f40076')
                .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 1024 }))
                .setDescription(botsInfo || 'Aucun bot sur cette page.')
                .setFooter({
                    text: `Total : ${bots.size} bots`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();
        };

        // Création des boutons
        const generateButtons = (currentPage) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('⬅️ Précédent')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('➡️ Suivant')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === totalPages - 1)
            );
        };

        let currentPage = 0;

        // Envoyer le premier embed avec les boutons
        const message = await interaction.editReply({
            content: '',
            embeds: [generateEmbed(currentPage)],
            components: [generateButtons(currentPage)],
            ephemeral: true,
        });

        // Gestion des interactions des boutons
        const collector = message.createMessageComponentCollector({ time: 240000 });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.user.id !== interaction.user.id) {
                return btnInteraction.reply({ content: 'Vous ne pouvez pas utiliser ces boutons.', ephemeral: true });
            }

            if (btnInteraction.customId === 'next') {
                currentPage++;
            } else if (btnInteraction.customId === 'previous') {
                currentPage--;
            }

            await btnInteraction.update({
                embeds: [generateEmbed(currentPage)],
                components: [generateButtons(currentPage)],
            });
        });

        collector.on('end', async () => {
            await message.deleteReply();
        });
    },
};
