const { EmbedBuilder } = require('discord.js');
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
        name: 'clear-utilisateur',
        description: 'Supprime tous les messages d\'un utilisateur sur tous les salons du serveur.',
        options: [
            {
                type: 6, // Type 6 correspond à un utilisateur
                name: 'utilisateur',
                description: 'L\'utilisateur dont les messages seront supprimés.',
                required: true,
            },
        ],
    },
    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur');
        const client = interaction.client;
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
            return interaction.editReply({ content: '**Rôle administrateur non configuré ->** ``/config-general``', ephemeral: true });
        }

        try {
            const allMessagesDeleted = [];
            const channels = interaction.guild.channels.cache.filter(channel => channel.isTextBased()); // Filtrer les salons textuels

            // Parcourir chaque salon et supprimer les messages de l'utilisateur
            for (const [channelId, channel] of channels) {
                let messagesToDelete = [];
                let hasMoreMessages = true;
                let lastMessageId = null;

                while (hasMoreMessages) {
                    const messages = await channel.messages.fetch({ 
                        limit: 100,
                        before: lastMessageId,
                    });
                    if (messages.size === 0) {
                        hasMoreMessages = false;
                    }

                    // Filtrer les messages de l'utilisateur spécifique
                    const userMessages = messages.filter(msg => msg.author.id === targetUser.id);
                    messagesToDelete = [...messagesToDelete, ...userMessages.values()];  // Utilisation de .values() au lieu de .array()

                    // Enregistrer l'ID du dernier message pour la prochaine itération
                    lastMessageId = messages.last()?.id;
                }

                // Supprimer les messages collectés
                if (messagesToDelete.length > 0) {
                    await channel.bulkDelete(messagesToDelete, true);
                    allMessagesDeleted.push(messagesToDelete.length);
                }
            }

            // Résumer la suppression
            const totalDeleted = allMessagesDeleted.reduce((acc, count) => acc + count, 0);
            if (totalDeleted === 0) {
                return interaction.editReply({ content: `Aucun message trouvé de ${targetUser.tag} dans le serveur.`, ephemeral: true });
            }

            const confirmationEmbed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle('Suppression réussie')
                .setDescription(`J'ai supprimé **${totalDeleted}** messages de **${targetUser.tag}** dans tout le serveur.`)
                .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();

            await interaction.editReply({ embeds: [confirmationEmbed], ephemeral: true });

            // Envoi d'un log si un canal de logs est configuré
            if (fs.existsSync(filePath)) {
                if (guildData.logs_server_channel) {
                    const logChannel = await client.channels.fetch(guildData.logs_server_channel);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor(guildData.botColor || '#f40076')
                            .setTitle('Suppression de messages')
                            .setDescription(`L'administrateur **${interaction.user.tag}** a supprimé **${totalDeleted}** messages de **${targetUser.tag}** dans le serveur.`)
                            .setFooter({ text: `Server: ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
                            .setTimestamp();

                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }
            }
        } catch (error) {
            console.error(error);
            return interaction.editReply({ content: 'Une erreur est survenue lors de la suppression des messages.', ephemeral: true });
        }
    },
};
