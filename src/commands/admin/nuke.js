const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, PermissionsBitField } = require('discord.js');
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
        name: 'nuke',
        description: 'Détruit et recrée un salon avec sa position et ses paramètres.',
    },
    async execute(interaction) {
        try {
            // Vérifie si l'utilisateur a la permission de gérer les salons
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return interaction.reply({
                    content: "🚫 Vous n'avez pas la permission de gérer les salons !",
                    ephemeral: true
                });
            }

            const channel = interaction.channel;
            const guildPath = path.join('./guilds-data', `${interaction.guild.id}.json`);
            const guildData = loadGuildData(guildPath);

            // Confirmation avant de supprimer
            await interaction.reply({
                content: `⚠️ Êtes-vous sûr de vouloir recréer ce salon ? Cette action est irréversible ! Tapez **confirmer** pour valider.`,
                ephemeral: true
            });

            const filter = (m) => m.author.id === interaction.user.id && m.content.toLowerCase() === 'confirmer';
            const collected = await interaction.channel.awaitMessages({
                filter,
                max: 1,
                time: 15000,
                errors: ['time']
            });

            if (collected) {
                const newChannel = await channel.clone(); // Clone le salon actuel
                await channel.delete(); // Supprime le salon actuel

                await newChannel.send(`🚀 Le salon a été recréé avec succès par ${interaction.user.tag}.`);

                // Si "logs_server_channel" est défini, envoie un embed dans ce salon
                if (guildData && guildData.logs_server_channel) {
                    const logsChannel = interaction.guild.channels.cache.get(guildData.logs_server_channel);
                    if (logsChannel) {
                        const embed = new EmbedBuilder()
                            .setTitle('🔄 Salon Recréé')
                            .setDescription(`Le salon **${channel.name}** a été recréé avec succès. [Nuked]`)
                            .setColor(guildData.botColor || '#f40076')
                            .addFields(
                                { name: 'Utilisateur', value: `${interaction.user.tag}`, inline: true },
                                { name: 'ID du Salon', value: `${channel.id}`, inline: true },
                                { name: 'Heure', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                            )
                            .setImage('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWs3YW1qamZ3MmxxdDc2bGMycjhkNWo2dXJ2dHlscXhqYTV6OG00OCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/rSxGPn046lZGE/giphy.gif')
                            .setFooter({ text: `Action effectuée par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
                            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                            .setTimestamp();

                        await logsChannel.send({ embeds: [embed] });
                    }
                }
            }
        } catch (error) {
            if (error.code === 10008) {
                interaction.followUp({
                    content: "⏳ Le temps imparti pour confirmer est écoulé.",
                    ephemeral: true
                });
            } else {
                console.error(`Erreur lors de l'exécution de la commande nuke: ${error.message}`);
                interaction.reply({
                    content: "❌ Une erreur est survenue lors de la tentative de recréer le salon.",
                    ephemeral: true
                });
            }
        }
    },
};
