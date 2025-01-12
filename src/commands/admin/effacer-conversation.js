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
        name: 'effacer-conversation',
        description: 'Supprime tous les messages entre deux IDs spécifiés.',
        options: [
            {
                type: 3, // STRING
                name: 'premier-message',
                description: 'ID du premier message.',
                required: true
            },
            {
                type: 3, // STRING
                name: 'dernier-message',
                description: 'ID du dernier message.',
                required: true
            },
        ],
    },
    async execute(interaction) {
        const channel = interaction.channel;
        const firstMessageId = interaction.options.getString('premier-message');
        const lastMessageId = interaction.options.getString('dernier-message');
        const client = interaction.client;
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);

        if (guildData.admin_role && guildData.ownerId) {
            const isAdmin = interaction.member.roles.cache.has(guildData.admin_role);
            const isOwner = guildData.ownerId === interaction.user.id;
            if (!isAdmin && !isOwner) {
                return interaction.reply({ content: 'Vous n\'avez pas la permission de consulter ceci.', ephemeral: true });
            }
        } else {
            return interaction.reply({ content: '**Rôle administrateur non configuré ->** ``/config-general``', ephemeral: true });
        }

        try {
            // Fetch messages from the channel, including the range of IDs
            const messages = await channel.messages.fetch({ limit: 100 });

            // Filter messages to include the first and last message within the range
            const messagesToDelete = messages.filter(msg => 
                (msg.id >= firstMessageId && msg.id <= lastMessageId) || 
                msg.id === firstMessageId || 
                msg.id === lastMessageId
            );

            // Delete the filtered messages
            await channel.bulkDelete(messagesToDelete, true);

            const confirmationEmbed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle('Suppression réussie')
                .setDescription(`J'ai supprimé **${messagesToDelete.size}** messages.`)
                .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();

            await interaction.reply({ embeds: [confirmationEmbed], ephemeral: true });

            if (fs.existsSync(filePath)) {
                if (guildData.logs_server_channel) {
                    const logChannel = await client.channels.fetch(guildData.logs_server_channel);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor(guildData.botColor || '#f40076')
                            .setTitle('Suppression de messages')
                            .setDescription(`L'administrateur **${interaction.user.tag}** a supprimé des messages dans **${channel.name}** entre les IDs **${firstMessageId}** et **${lastMessageId}**.`)
                            .setFooter({ text: `Server: ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
                            .setTimestamp();

                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }
            }
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: 'Une erreur est survenue lors de la suppression des messages.', ephemeral: true });
        }
    },
};
