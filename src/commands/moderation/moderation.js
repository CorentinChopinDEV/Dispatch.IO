const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

const saveGuildData = (guildPath, newData) => {
    try {
        const currentData = loadGuildData(guildPath);
        const mergedData = { ...currentData, ...newData };
        fs.writeFileSync(guildPath, JSON.stringify(mergedData, null, 2));
    } catch (error) {
        console.error(`Erreur lors de la sauvegarde des données : ${error.message}`);
    }
};

module.exports = {
    data: {
        name: 'modération',
        description: 'Action de modération envers un utilisateur.',
        options: [
            {
                name: 'utilisateur',
                type: 6,
                description: 'L\'utilisateur en question',
                required: true,
            },
            {
                name: 'raison',
                type: 3,
                description: 'La raison de la sanction',
                required: false,
            },
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
            const hasModRole = interaction.member.roles.cache.has(modRoleId);
            const adminRoleId = guildData.admin_role;
            const hasAdminRole = interaction.member.roles.cache.has(adminRoleId);
        
            if (!isOwner && !hasAdminRole && !hasModRole) {
                return interaction.reply({
                    content: 'Vous n\'avez pas la permission d\'avertir un utilisateur. 🔴',
                    ephemeral: true,
                });
            }

            const targetUser = interaction.options.getUser('utilisateur');
            const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
            const member = await interaction.guild.members.fetch(targetUser.id);

            const embed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('🛡️ Panel de Modération')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Utilisateur', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
                    { name: 'Rejoint le', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
                    { name: 'Compte créé le', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: true },
                    { name: 'Raison', value: reason, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: `Modérateur: ${interaction.user.tag}` });

            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('avertir')
                        .setLabel('Avertir')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('unban')
                        .setLabel('Unban')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('kick')
                        .setLabel('Expulser')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('ban')
                        .setLabel('Bannir')
                        .setStyle(ButtonStyle.Danger)
                );

            await interaction.reply({
                embeds: [embed],
                components: [row1]
            });

            // Collector pour les boutons
            const filter = i => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 });

            collector.on('collect', async i => {
                await i.deferUpdate();
                
                // Créer une fausse interaction pour exécuter les commandes
                const fakeInteraction = {
                    ...interaction,
                    options: {
                        getUser: (name) => (name === 'utilisateur' ? targetUser : null),
                        getString: (name) => (name === 'raison' ? reason : null),
                        getInteger: () => 7, // Par exemple, pour timeout
                    },
                    user: interaction.user,
                    guild: interaction.guild,
                    member: interaction.member,
                    client: interaction.client,
                    channel: interaction.channel,
                    // Lier les méthodes nécessaires
                     followUp: (...args) => interaction.followUp(...args),
                    deferReply: (...args) => interaction.deferReply(...args),
                    editReply: (...args) => interaction.editReply(...args),
                };

                try {
                    const command = interaction.client.commands.get(i.customId);
                    if (command) {
                        await command.execute(fakeInteraction);
                    } else {
                        await i.followUp({
                            content: 'Commande non reconnue ou indisponible.',
                            ephemeral: true,
                        });
                    }
                    // Mettre à jour l'embed pour refléter l'action
                    const newEmbed = EmbedBuilder.from(embed)
                        .setDescription(`✅ Action \`${i.customId}\` exécutée avec succès.`);
                    
                    await i.message.edit({
                        embeds: [newEmbed],
                        components: [row1, row2]
                    });

                } catch (error) {
                    console.error(`Erreur lors de l'exécution de la commande ${i.customId}:`, error);
                    
                    // Informer l'utilisateur de l'erreur
                    const errorEmbed = EmbedBuilder.from(embed)
                        .setDescription(`❌ Erreur lors de l'exécution de \`${i.customId}\`: ${error.message}`);
                    
                    await i.message.edit({
                        embeds: [errorEmbed],
                        components: [row1]
                    });
                }
            });

            collector.on('end', collected => {
                const endedEmbed = EmbedBuilder.from(embed)
                    .setDescription('⏰ Panel de modération expiré. Utilisez à nouveau la commande pour un nouveau panel.');
                
                interaction.editReply({
                    embeds: [endedEmbed],
                    components: [] // Désactive les boutons
                });
            });

        } else {
            return interaction.reply({
                content: '**Rôle administrateur non configuré ->** `/config-general`',
                ephemeral: true,
            });
        }
    },
};