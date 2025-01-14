const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
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

function deleteBackup(backupId) {
    try {
        const backupPath = path.join(__dirname, '../../../backup', `${backupId}-backup.json`);
        if (fs.existsSync(backupPath)) {
            fs.unlinkSync(backupPath);
            return true;
        }
        return false;
    } catch (err) {
        console.error('Erreur lors de la suppression de la sauvegarde:', err);
        return false;
    }
}

function getBackupsList(guildId) {
    try {
        const backupDir = path.join(__dirname, '../../../backup');
        if (!fs.existsSync(backupDir)) {
            return [];
        }

        const files = fs.readdirSync(backupDir);
        const backups = [];

        for (const file of files) {
            if (file.endsWith('-backup.json')) {
                const backupPath = path.join(backupDir, file);
                const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
                
                if (backupData.guildId === guildId) {
                    backups.push({
                        id: file.replace('-backup.json', ''),
                        name: backupData.guildName,
                        createdAt: backupData.createdAt || 'Date inconnue',
                        channelCount: backupData.channels?.length || 0,
                        roleCount: backupData.roles?.length || 0
                    });
                }
            }
        }

        return backups;
    } catch (err) {
        console.error('Erreur lors de la lecture des sauvegardes:', err);
        return [];
    }
}

module.exports = {
    data: {
        name: 'backup-list',
        description: 'Affiche la liste des sauvegardes disponibles pour ce serveur'
    },
    async execute(interaction) {
        const client = this.client;
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);

        if (guildData.ownerId) {
            const isOwner = guildData.ownerId === interaction.user.id;
            if (!isOwner) {
                return interaction.reply({ 
                    content: 'Vous n\'avez pas la permission de consulter ceci.', 
                    ephemeral: true 
                });
            }
        } else {
            return interaction.reply({ 
                content: '**Rôle administrateur non configuré ->** `/config-general`', 
                ephemeral: true 
            });
        }

        const backups = getBackupsList(guildId);

        if (backups.length === 0) {
            return interaction.reply({
                content: 'Aucune sauvegarde trouvée pour ce serveur.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setTitle('📋 **Liste des Sauvegardes Disponibles**')
            .setDescription('Choisissez une sauvegarde dans le menu déroulant pour afficher les options détaillées.')
            .setThumbnail(client.user.avatarURL()) // Utilisation de l'avatar du bot comme thumbnail
            .setTimestamp() // Horodatage
        
            // Ajouter le footer avec le nom du bot et une empreinte copyright
            .setFooter({ 
                text: `© 2025 ${client.user.username} - Tous droits réservés`, // Nom du bot et copyright
                iconURL: client.user.avatarURL() // Icône du bot (logo)
            })

        backups.forEach((backup, index) => {
            embed.addFields({
                name: `Sauvegarde #${index + 1}`,
                value: `**ID:** \`${backup.id}\`\n` +
                    `**Nom du serveur:** ${backup.name}\n` +
                    `**Date de création:** ${new Date(backup.createdAt).toLocaleString()}\n` +
                    `**Salons:** ${backup.channelCount}\n` +
                    `**Rôles:** ${backup.roleCount}`,
            });
        });

        // Création du menu déroulant
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_backup')
            .setPlaceholder('Sélectionnez une sauvegarde')
            .addOptions(
                backups.map((backup, index) => ({
                    label: `Sauvegarde #${index + 1} - ${backup.name}`,
                    description: `Créée le ${new Date(backup.createdAt).toLocaleString()}`,
                    value: backup.id,
                    emoji: '💾'
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const response = await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });

        const collector = response.createMessageComponentCollector({ time: 300000 }); // 5 minutes

        collector.on('collect', async i => {
            if (i.customId === 'select_backup') {
                const selectedBackupId = i.values[0];
                const selectedBackup = backups.find(b => b.id === selectedBackupId);

                const backupEmbed = new EmbedBuilder()
                    .setColor('#f40076')
                    .setTitle('📋 Détails de la sauvegarde')
                    .setDescription(`**Sauvegarde sélectionnée:** ${selectedBackup.name}
                        \n**Date de création:** ${new Date(selectedBackup.createdAt).toLocaleString()}
                        \n**Nombre de salons:** ${selectedBackup.channelCount}
                        \n**Nombre de rôles:** ${selectedBackup.roleCount}`)
                    .setTimestamp();

                const actionRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`load_${selectedBackupId}`)
                            .setLabel('Restaurer')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🔄'),
                        new ButtonBuilder()
                            .setCustomId(`delete_${selectedBackupId}`)
                            .setLabel('Supprimer')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🗑️'),
                        new ButtonBuilder()
                            .setCustomId('back')
                            .setLabel('Retour')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('↩️')
                    );

                await i.update({
                    embeds: [backupEmbed],
                    components: [actionRow]
                });
            } else if (i.customId.startsWith('load_')) {
                const backupId = i.customId.split('_')[1];
                const backup = backups.find(b => b.id === backupId);

                const confirmEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('⚠️ Confirmation de restauration')
                    .setDescription(`Êtes-vous sûr de vouloir restaurer la sauvegarde **${backup.name}** ?\n\n` +
                                  `Cette action remplacera la configuration actuelle du serveur.`)
                    .setTimestamp();

                const confirmRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`confirm_load_${backupId}`)
                            .setLabel('Confirmer')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('cancel')
                            .setLabel('Annuler')
                            .setStyle(ButtonStyle.Secondary)
                    );

                await i.update({
                    embeds: [confirmEmbed],
                    components: [confirmRow]
                });
            } else if (i.customId.startsWith('delete_')) {
                const backupId = i.customId.split('_')[1];
                const backup = backups.find(b => b.id === backupId);

                const confirmEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('⚠️ Confirmation de suppression')
                    .setDescription(`Êtes-vous sûr de vouloir supprimer la sauvegarde **${backup.name}** ?\n\n` +
                                  `Cette action est irréversible !`)
                    .setTimestamp();

                const confirmRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`confirm_delete_${backupId}`)
                            .setLabel('Confirmer')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('cancel')
                            .setLabel('Annuler')
                            .setStyle(ButtonStyle.Secondary)
                    );

                await i.update({
                    embeds: [confirmEmbed],
                    components: [confirmRow]
                });
            } else if (i.customId.startsWith('confirm_')) {
                const [, action, backupId] = i.customId.split('_');
                
                if (action === 'delete') {
                    const success = deleteBackup(backupId);
                    if (success) {
                        await i.update({
                            embeds: [new EmbedBuilder()
                                .setColor('#00FF00')
                                .setTitle('✅ Suppression réussie')
                                .setDescription('La sauvegarde a été supprimée avec succès.')
                                .setTimestamp()
                            ],
                            components: []
                        });
                    } else {
                        await i.update({
                            embeds: [new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Erreur')
                                .setDescription('Une erreur est survenue lors de la suppression de la sauvegarde.')
                                .setTimestamp()
                            ],
                            components: []
                        });
                    }
                } else if (action === 'load') {
                    try {
                        const backupLoadCommand = interaction.client.commands.get('backup-load');
                        if (backupLoadCommand) {
                            const modifiedInteraction = {
                                ...i,
                                guild: i.guild,
                                member: i.member,
                                client: i.client,
                                channel: i.channel,
                                options: {
                                    getString: (name) => {
                                        if (name === 'id') return backupId;
                                        return null;
                                    }
                                },
                                reply: i.update.bind(i),
                                editReply: i.update.bind(i),
                                followUp: i.followUp.bind(i)
                            };
                            await backupLoadCommand.execute(modifiedInteraction);
                        }
                    } catch (error) {
                        console.error('Erreur lors de l\'exécution de backup-load:', error);
                        await i.update({
                            embeds: [new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Erreur')
                                .setDescription('Une erreur est survenue lors de la restauration de la sauvegarde.')
                                .setTimestamp()
                            ],
                            components: []
                        });
                    }
                }
            } else if (i.customId === 'cancel' || i.customId === 'back') {
                await i.update({
                    embeds: [embed],
                    components: [row]
                });
            }
        });

        collector.on('end', () => {
            interaction.editReply({
                components: []
            }).catch(console.error);
        });
    },
};