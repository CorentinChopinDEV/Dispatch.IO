const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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

function saveGuildData(guildPath, data) {
    try {
        fs.writeFileSync(guildPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('Erreur lors de la sauvegarde des données de la guilde:', err);
    }
}

module.exports = {
    data: {
        name: 'config-color',
        description: 'Configurer la couleur du BOT.',
    },
    async execute(interaction) {
        const client = interaction.client; // Assurez-vous que le client est accessible à partir de l'interaction
        const guildId = interaction.guild.id;
        const guildPath = path.join(__dirname, `../../../guilds-data/${guildId}.json`);

        // Charger les données de la guilde
        const guildData = loadGuildData(guildPath);
        if (guildData.ownerId) {
            const isOwner = guildData.ownerId === interaction.user.id;
            const devRoleId = guildData.dev_role; // ID du rôle Dev, si configuré
            const hasDevRole = devRoleId && interaction.member.roles.cache.has(devRoleId); // Vérifie si l'utilisateur possède le rôle Dev
        
            // Autoriser seulement si l'utilisateur est soit ownerId, soit possède le rôle Dev
            if (!isOwner && !hasDevRole) {
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
        // Création de l'embed de configuration
        const embed = new EmbedBuilder()
            .setTitle('Configuration de la couleur du bot')
            .setDescription('Choisissez une couleur pour le bot en cliquant sur le bouton ci-dessous.')
            .setColor(guildData.botColor || '#f40076')
            .setFooter({ text: 'Configurer une couleur qui représentera le bot.' });

        // Boutons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('configureColor')
                .setLabel('Configurer la couleur')
                .setStyle(ButtonStyle.Primary)
        );

        // Si une couleur existe déjà, ajouter un bouton "Supprimer la couleur"
        if (guildData.botColor) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('removeColor')
                    .setLabel('Supprimer la couleur')
                    .setStyle(ButtonStyle.Danger)
            );
        }

        // Envoyer l'embed
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

        // Gérer les interactions avec les boutons
        const filter = (btnInteraction) => btnInteraction.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.customId === 'configureColor') {
                // Création de la modal pour entrer la couleur
                const modal = new ModalBuilder()
                    .setCustomId('setBotColorModal')
                    .setTitle('Configurer la couleur du bot');

                const colorInput = new TextInputBuilder()
                    .setCustomId('botColorInput')
                    .setLabel('Entrez une couleur HEX (ex: #7289DA)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('#7289DA')
                    .setRequired(true);

                const modalRow = new ActionRowBuilder().addComponents(colorInput);
                modal.addComponents(modalRow);

                await btnInteraction.showModal(modal);
            }

            if (btnInteraction.customId === 'removeColor') {
                // Supprimer la couleur du bot
                guildData.botColor = null;
                saveGuildData(guildPath, guildData);

                // Mise à jour de l'embed
                const updatedEmbed = new EmbedBuilder()
                    .setTitle('Configuration de la couleur du bot')
                    .setDescription('La couleur du bot a été supprimée avec succès.')
                    .setColor('#f40076') // Couleur par défaut
                    .setFooter({ text: 'Configurer une couleur qui représentera le bot.' });

                await btnInteraction.update({ embeds: [updatedEmbed], components: [] });
            }
        });

        // Gérer l'interaction de la modal
        client.on('interactionCreate', async (modalInteraction) => {
            if (!modalInteraction.isModalSubmit()) return;
            if (modalInteraction.customId === 'setBotColorModal') {
                const newColor = modalInteraction.fields.getTextInputValue('botColorInput');

                // Validation de la couleur HEX
                if (!/^#([0-9A-Fa-f]{6})$/.test(newColor)) {
                    return modalInteraction.reply({ content: 'Couleur invalide. Veuillez entrer une couleur HEX valide (ex: #7289DA).', ephemeral: true });
                }

                // Sauvegarder la nouvelle couleur
                guildData.botColor = newColor;
                saveGuildData(guildPath, guildData);

                // Mise à jour de l'embed
                const updatedEmbed = new EmbedBuilder()
                    .setTitle('Configuration de la couleur du bot')
                    .setDescription(`Couleur mise à jour avec succès : ${newColor}`)
                    .setColor(newColor)
                    .setFooter({ text: 'Configurer une couleur qui représentera le bot.' });

                await modalInteraction.update({ embeds: [updatedEmbed], components: [] });
            }
        });
    }
};
