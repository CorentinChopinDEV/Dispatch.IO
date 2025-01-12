const { EmbedBuilder } = require('discord.js');
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
        name: 'avertir',
        description: 'Avertir un utilisateur pour une infraction.',
        options: [
            {
                name: 'utilisateur',
                type: 6, // USER
                description: 'L\'utilisateur à avertir',
                required: true,
            },
            {
                name: 'raison',
                type: 3, // STRING
                description: 'La raison de l\'avertissement',
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
        
            // Autoriser seulement si l'utilisateur est soit ownerId, soit possède le rôle Mod ou Admin
            if (!isOwner && !hasAdminRole && !hasModRole) {
                return interaction.editReply({
                    content: 'Vous n\'avez pas la permission d\'avertir un utilisateur. 🔴',
                    ephemeral: true,
                });
            }
        } else {
            return interaction.editReply({
                content: '**Rôle administrateur non configuré ->** `/config-general`',
                ephemeral: true,
            });
        }

        const utilisateur = interaction.options.getUser('utilisateur');
        const raison = interaction.options.getString('raison') || 'Aucune raison spécifiée.';

        if (!utilisateur) {
            console.log('Aucun utilisateur spécifié.');
            return interaction.editReply({
                content: 'Veuillez spécifier un utilisateur à avertir.',
                ephemeral: true,
            });
        }

        // Ajouter l'avertissement dans le fichier JSON
        try {
            console.log(`Tentative d'avertissement de ${utilisateur.tag}`);

            const infractions = guildData.infractions || [];
            infractions.push({
                id: utilisateur.id,
                tag: utilisateur.tag,
                raison,
                warnedBy: interaction.user.id,
                type: 'Avertissement',
                date: new Date().toISOString(),
            });

            saveGuildData(guildPath, { infractions });

            const userWarningEmbed = new EmbedBuilder()
                .setTitle('⚠️ Avertissement reçu')
                .setDescription(`Vous avez été averti sur le serveur **${interaction.guild.name}**.`)
                .addFields(
                    { name: '❌ Raison', value: raison, inline: false },
                    { name: '🔨 Averti par', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                )
                .setColor('#FFAA00')
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

            await utilisateur.send({ embeds: [userWarningEmbed] }).catch((err) => {
                console.warn(`Impossible d'envoyer un message privé à ${utilisateur.tag}.`, err.message);
            });

            const warningEmbed = new EmbedBuilder()
                .setTitle('⚠️ Avertissement sur le serveur')
                .setDescription(`L'utilisateur <@${utilisateur.id}> a été averti sur le serveur **${interaction.guild.name}**.`)
                .addFields(
                    { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                    { name: '🔨 Averti par', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '❌ Raison', value: raison, inline: false },
                )
                .setColor('#FFAA00')
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

            // Envoi du log d'avertissement
            const logChannelId = guildData.logs_member_channel;
            const logEmbed = new EmbedBuilder()
                .setTitle('⚠️ Avertissement sur le serveur')
                .setDescription(`L'utilisateur <@${utilisateur.id}> a été averti sur le serveur **${interaction.guild.name}**.`)
                .addFields(
                    { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                    { name: '🔨 Averti par', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '❌ Raison', value: raison, inline: false },
                )
                .setColor('#FFAA00')
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });
            const confirmWarn = new EmbedBuilder()
                .setTitle('⚠️ Avertissement sur le serveur')
                .setDescription(`L'utilisateur <@${utilisateur.id}> a été averti sur le serveur **${interaction.guild.name}**.`)
                .setColor('#FFAA00')
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });
            if (logChannelId) {
                const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    console.log('Envoi des logs dans le canal de modération.');
                    await logChannel.send({ embeds: [logEmbed] });
                    await interaction.editReply({ content: '', embeds: [confirmWarn] });
                } else {
                    console.warn(`Le salon logs_moderation_channel (${logChannelId}) n'a pas pu être trouvé.`);
                    await interaction.editReply({ content: '', embeds: [warningEmbed] });
                }
            } else {
                console.log('Aucun salon de logs configuré. Envoi dans l\'interaction.');
                await interaction.editReply({ content: '', embeds: [warningEmbed] });
            }

        } catch (error) {
            console.error('Erreur lors du processus d\'avertissement :', error);
            await interaction.editReply({
                content: 'Une erreur est survenue lors de l\'avertissement.',
                ephemeral: true,
            });
        }
    },
};
