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
        name: 'kick',
        description: 'Expulser un utilisateur du serveur',
        options: [
            {
                name: 'utilisateur',
                type: 6, // USER
                description: 'L\'utilisateur à expulser',
                required: true,
            },
            {
                name: 'raison',
                type: 3, // STRING
                description: 'La raison de l\'expulsion',
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
            const hasmodRole = interaction.member.roles.cache.has(modRoleId);
            const adminRoleId = guildData.admin_role;
            const hasadminRole = interaction.member.roles.cache.has(adminRoleId);
        
            // Autoriser seulement si l'utilisateur est soit ownerId, soit possède le rôle Admin ou Mod
            if (!isOwner && !hasadminRole && !hasmodRole) {
                return interaction.editReply({
                    content: 'Vous n\'avez pas la permission de consulter ceci. 🔴',
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
                content: 'Veuillez spécifier un utilisateur à expulser.',
                ephemeral: true,
            });
        }

        try {
            console.log(`Tentative d\'expulsion de ${utilisateur.tag}`);
            
            // Ajouter l'infraction dans le fichier JSON
            const infractions = guildData.infractions || [];
            infractions.push({
                id: utilisateur.id,
                tag: utilisateur.tag,
                raison,
                warnedBy: interaction.user.id,
                type: 'Expulsion',
                date: new Date().toISOString(),
            });
            const member = await interaction.guild.members.fetch(utilisateur.id).catch(() => null);
            if (!member) {
                console.log('Utilisateur introuvable dans le serveur.');
                return interaction.editReply({
                    content: 'Impossible d\'expulser cet utilisateur car il n\'est plus dans le serveur.',
                    ephemeral: true,
                });
            }
            saveGuildData(guildPath, { infractions });
            
            // Message privé à l'utilisateur expulsé
            const kickDMEmbed = new EmbedBuilder()
                .setTitle('🚫 Vous avez été expulsé')
                .setDescription(`Vous avez été expulsé du serveur **${interaction.guild.name}**.`)
                .addFields(
                    { name: '❌ Raison', value: raison || 'Aucune raison spécifiée.', inline: false },
                    { name: '🔨 Expulsé par', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                )
                .setColor('#FFA500') // Orange
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

            await utilisateur.send({ embeds: [kickDMEmbed] }).catch((err) => {
                console.warn(`Impossible d'envoyer un message privé à ${utilisateur.tag}.`, err.message);
            });

            await member.kick(raison);

            console.log('Expulsion réussie.');
            const userKickEmbed = new EmbedBuilder()
                .setTitle('🚫 Expulsé du serveur')
                .setDescription(`L'utilisateur <@${utilisateur.id}> a été expulsé du serveur **${interaction.guild.name}**.`)
                .addFields(
                    { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                    { name: '🔨 Expulsé par', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '❌ Raison', value: raison || 'Aucune raison spécifiée.', inline: false },
                )
                .setColor('#FFA500') // Orange
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

            // Envoyer les logs dans le salon de modération ou l'interaction
            const logChannelId = guildData.logs_member_channel;
            const logEmbed = new EmbedBuilder()
                .setTitle('🚫 Expulsé du serveur')
                .setDescription(`L'utilisateur <@${utilisateur.id}> a été expulsé du serveur **${interaction.guild.name}**.`)
                .addFields(
                    { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                    { name: '🔨 Expulsé par', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '❌ Raison', value: raison || 'Aucune raison spécifiée.', inline: false },
                )
                .setColor('#FFA500') // Orange
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

            const validateKick = new EmbedBuilder()
                .setTitle('🚫 Expulsé du serveur')
                .setDescription(`L'utilisateur <@${utilisateur.id}> a été expulsé du serveur.`)
                .setColor('#FFA500') // Orange
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

            if (logChannelId) {
                const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    console.log('Envoi des logs dans le canal de modération.');
                    await logChannel.send({ embeds: [logEmbed] });
                    await interaction.editReply({ content: '', embeds: [validateKick] });
                } else {
                    console.warn(`Le salon logs_moderation_channel (${logChannelId}) n'a pas pu être trouvé.`);
                    await interaction.editReply({ content: '', embeds: [userKickEmbed] });
                }
            } else {
                console.log('Aucun salon de logs configuré. Envoi dans l\'interaction.');
                await interaction.editReply({ content: '', embeds: [userKickEmbed] });
            }
        } catch (error) {
            console.error('Erreur lors du processus d\'expulsion :', error);
            await interaction.editReply({
                content: 'Une erreur est survenue lors de l\'expulsion. Assurez-vous que l\'utilisateur est encore dans le serveur.',
                ephemeral: true,
            });
        }
    },
};
