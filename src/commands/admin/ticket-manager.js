const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
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
        name: 'ticket-manager',
        description: 'Gérez les tickets : ajouter ou retirer un membre, ou renommer le ticket.',
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        const channel = interaction.channel;
        if (guildData.admin_role && guildData.ownerId) {
            const isAdmin = interaction.member.roles.cache.has(guildData.admin_role);
            const isOwner = guildData.ownerId === interaction.user.id;
            if (!isAdmin && !isOwner) {
                return interaction.reply({ content: 'Vous n\'avez pas la permission de consulter ceci.', ephemeral: true });
            }
        } else {
            return interaction.reply({ content: '**Rôle administrateur non configurée ->** ``/config-general``', ephemeral: true });
        }


        // Vérifie si le salon est un ticket
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: '# Ce salon n’est pas un ticket. ⚠️', ephemeral: true });
        }
        // Menu déroulant pour les actions
        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket-manager-menu')
                .setPlaceholder('Sélectionnez une action')
                .addOptions([
                    {
                        label: 'Ajouter un utilisateur',
                        value: 'add_member',
                        description: 'Ajouter un utilisateur au ticket.',
                    },
                    {
                        label: 'Retirer un utilisateur',
                        value: 'remove_member',
                        description: 'Retirer un utilisateur du ticket.',
                    },
                    {
                        label: 'Renommer le ticket',
                        value: 'rename_ticket',
                        description: 'Changer le nom du ticket.',
                    }
                ])
        );

        const embed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setTitle('Gestion du Ticket 📑') // Titre plus accrocheur
            .setDescription('Sélectionnez une action à réaliser sur ce ticket à l\'aide du menu déroulant ci-dessous.')
            .setTimestamp(); // Ajoute un timestamp pour une touche professionnelle

        await interaction.reply({ embeds: [embed], components: [selectMenu], ephemeral: true });

        // Gestion des interactions avec le menu déroulant
        const filter = (i) => i.customId === 'ticket-manager-menu' && i.user.id === interaction.user.id;
        const collector = channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (menuInteraction) => {
            const guildId = interaction.guild.id;
            const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
            const guildData = loadGuildData(filePath);
            const action = menuInteraction.values[0];

            if (action === 'add_member') {
                await menuInteraction.reply({ content: 'Mentionnez l’utilisateur à ajouter.', ephemeral: true });
                const addCollector = channel.createMessageCollector({
                    filter: (m) => m.author.id === interaction.user.id,
                    max: 1,
                    time: 30000,
                });

                addCollector.on('collect', async (msg) => {
                    const member = msg.mentions.members.first();
                    if (!member) {
                        return menuInteraction.followUp({ content: 'Utilisateur invalide.', ephemeral: true });
                    }

                    await channel.permissionOverwrites.edit(member, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true,
                    });
                    const confirmEmbed = new EmbedBuilder()
                        .setColor(guildData.botColor || '#f40076')
                        .setDescription(`L’utilisateur ${member} a été ajouté au ticket avec succès.`);
                    await menuInteraction.channel.send({ embeds: [confirmEmbed] });
                    await menuInteraction.deleteReply();
                    msg.delete();
                    await interaction.deleteReply();
                });
            } else if (action === 'remove_member') {
                await menuInteraction.reply({ content: 'Mentionnez l’utilisateur à retirer.', ephemeral: true });
                const removeCollector = channel.createMessageCollector({
                    filter: (m) => m.author.id === interaction.user.id,
                    max: 1,
                    time: 30000,
                });

                removeCollector.on('collect', async (msg) => {
                    const member = msg.mentions.members.first();
                    if (!member) {
                        return menuInteraction.followUp({ content: 'Utilisateur invalide.', ephemeral: true });
                    }

                    await channel.permissionOverwrites.delete(member);
                    msg.delete();
                    const confirmEmbed = new EmbedBuilder()
                        .setColor(guildData.botColor || '#f40076')
                        .setDescription(`L’utilisateur ${member} a été retiré du ticket avec succès.`);
                    await menuInteraction.channel.send({ embeds: [confirmEmbed] });
                    await menuInteraction.deleteReply();
                    await interaction.deleteReply();
                });
            } else if (action === 'rename_ticket') {
                await menuInteraction.reply({ content: 'Veuillez fournir un nouveau nom pour le ticket.', ephemeral: true });
                const renameCollector = channel.createMessageCollector({
                    filter: (m) => m.author.id === interaction.user.id,
                    max: 1,
                    time: 30000,
                });

                renameCollector.on('collect', async (msg) => {
                    const newName = msg.content.trim();
                    if (!newName || newName.length > 100) {
                        return menuInteraction.followUp({ content: 'Nom de ticket invalide.', ephemeral: true });
                    }

                    await channel.setName(`ticket-${newName}`);
                    msg.delete();
                    const confirmEmbed = new EmbedBuilder()
                        .setColor(guildData.botColor || '#f40076')
                        .setDescription(`Le ticket a été renommé en **ticket-${newName}** avec succès.`);
                    await menuInteraction.channel.send({ embeds: [confirmEmbed] });
                    await menuInteraction.deleteReply();
                    await interaction.deleteReply();
                });
            }
        });

        collector.on('end', async () => {
            await interaction.editReply({ components: [] });
        });
    },
};
