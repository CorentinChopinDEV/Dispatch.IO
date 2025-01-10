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
        name: 'ban',
        description: 'Bannir un utilisateur de ce serveur',
        options: [
            {
                name: 'utilisateur',
                type: 6, // USER
                description: 'L\'utilisateur à bannir',
                required: true,
            },
            {
                name: 'raison',
                type: 3, // STRING
                description: 'La raison du bannissement',
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
        
            // Autoriser seulement si l'utilisateur est soit ownerId, soit possède le rôle Dev
            if (!isOwner && !hasadminRole && !hasmodRole) {
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
        const utilisateur = interaction.options.getUser('utilisateur');
        const raison = interaction.options.getString('raison') || 'Aucune raison spécifiée.';

        if (!utilisateur) {
            console.log('Aucun utilisateur spécifié.');
            return interaction.reply({
                content: 'Veuillez spécifier un utilisateur à bannir.',
                ephemeral: true,
            });
        }

        // Vérifier si l'utilisateur est déjà banni
        if (guildData.bans?.some(ban => ban.id === utilisateur.id)) {
            console.log(`L'utilisateur ${utilisateur.tag} est déjà banni.`);
            return interaction.reply({
                content: `L'utilisateur ${utilisateur.tag} est déjà banni.`,
                ephemeral: true,
            });
        }

        try {
            console.log(`Tentative de bannissement de ${utilisateur.tag}`);
            
            // Ajout du bannissement dans le fichier JSON
            const infractions = guildData.infractions || [];
            infractions.push({
                id: utilisateur.id,
                tag: utilisateur.tag,
                raison,
                warnedBy: interaction.user.id,
                type: 'Bannissement',
                date: new Date().toISOString(),
            });
            saveGuildData(guildPath, { infractions });

            // Si l'utilisateur est toujours dans le serveur, tentez de l'envoyer un message privé
            try {
                const banDMEmbed = new EmbedBuilder()
                    .setTitle('🚫 Vous avez été banni')
                    .setDescription(`Vous avez été banni du serveur **${interaction.guild.name}**.`)
                    .addFields(
                        { name: '❌ Raison', value: raison || 'Aucune raison spécifiée.', inline: false },
                        { name: '🔨 Banni par', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                    )
                    .setColor('#FF0000')
                    .setTimestamp()
                    .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

                await utilisateur.send({ embeds: [banDMEmbed] }).catch((err) => {
                    console.warn(`Impossible d'envoyer un message privé à ${utilisateur.tag}.`, err.message);
                });
            } catch (e) {
                console.log(e);
            }

            // Bannir l'utilisateur
            await interaction.guild.bans.create(utilisateur.id, { reason: raison }).catch((err) => {
                console.error('Erreur lors du bannissement :', err);
            });

            console.log('Bannissement réussi.');
            const userBanEmbed = new EmbedBuilder()
                .setTitle('🚫 Banni du serveur')
                .setDescription(`L'utilisateur <@${utilisateur.id}> a été banni du serveur **${interaction.guild.name}**.`)
                .addFields(
                    { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                    { name: '🔨 Banni par', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '❌ Raison', value: raison || 'Aucune raison spécifiée.', inline: false },
                )
                .setColor('#FF0000')
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

            // Envoyer les logs dans le salon de modération ou l'interaction
            const logChannelId = guildData.logs_member_channel;
            const logEmbed = new EmbedBuilder()
                .setTitle('🚫 Banni du serveur')
                .setDescription(`L'utilisateur <@${utilisateur.id}> a été banni du serveur **${interaction.guild.name}**.`) // Utilisation de la mention de l'utilisateur
                .addFields(
                    { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                    { name: '🔨 Banni par', value: `<@${interaction.user.id}>`, inline: true }, // Utilisation de la mention pour l'auteur
                    { name: '❌ Raison', value: raison || 'Aucune raison spécifiée.', inline: false },
                )
                .setColor('#FF0000')
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

            const validateBan = new EmbedBuilder()
                .setTitle('🚫 Banni du serveur')
                .setDescription(`L'utilisateur <@${utilisateur.id}> a été banni du serveur.`)
                .setColor('#FF0000')
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

            if (logChannelId) {
                const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    console.log('Envoi des logs dans le canal de modération.');
                    await logChannel.send({ embeds: [logEmbed] });
                    await interaction.reply({ embeds: [validateBan] });
                } else {
                    console.warn(`Le salon logs_moderation_channel (${logChannelId}) n'a pas pu être trouvé.`);
                    await interaction.reply({ embeds: [userBanEmbed] });
                }
            } else {
                console.log('Aucun salon de logs configuré. Envoi dans l\'interaction.');
                await interaction.reply({ embeds: [userBanEmbed] });
            }
        } catch (error) {
            console.error('Erreur lors du processus de bannissement :', error);
            await interaction.reply({
                content: 'Une erreur est survenue lors du bannissement. Assurez-vous que l\'utilisateur est encore dans le serveur.',
                ephemeral: true,
            });
        }
    },
};
