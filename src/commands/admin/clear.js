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
        name: 'clear',
        description: 'Supprime un nombre spécifié de messages (jusqu’à 100).',
        options: [
            {
                type: 4,
                name: 'nombre',
                description: 'Le nombre de messages à supprimer.',
                required: true
            },
        ],
    },
    async execute(interaction) {
        const channel = interaction.channel;
        const numberOfMessages = interaction.options.getInteger('nombre');
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
            return interaction.reply({ content: '**Rôle administrateur non configurée ->** ``/config-general``', ephemeral: true });
        }
        try {
            const messagesToDelete = await channel.bulkDelete(numberOfMessages, true);
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
                            .setDescription(`L'administrateur **${interaction.user.tag}** a supprimé **${messagesToDelete.size}** messages dans **${channel.name}**.`)
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
