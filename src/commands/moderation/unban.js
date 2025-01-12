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
        name: 'unban',
        description: 'Débannir un utilisateur du serveur',
        options: [
            {
                name: 'utilisateur',
                type: 6, // USER
                description: 'L\'utilisateur à débannir',
                required: true,
            }
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
            if (!isOwner && !hasadminRole) {
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
                content: 'Veuillez spécifier un utilisateur à débannir.',
                ephemeral: true,
            });
        }

        try {
            // Vérifier si l'utilisateur est banni
            const bans = await interaction.guild.bans.fetch();
            const isBanned = bans.has(utilisateur.id);

            if (!isBanned) {
                console.log(`L'utilisateur ${utilisateur.tag} n'est pas banni.`);
                return interaction.editReply({
                    content: `L'utilisateur ${utilisateur.tag} n'est pas banni du serveur.`,
                    ephemeral: true,
                });
            }

            // Si l'utilisateur est banni, on le débannit
            await interaction.guild.members.unban(utilisateur.id, raison);

            // Enregistrer le débannissement dans le fichier JSON
            const infractions = guildData.infractions || [];
            const index = infractions.findIndex(infraction => infraction.id === utilisateur.id && infraction.type === 'Bannissement');
            if (index !== -1) {
                // Au lieu de supprimer, on ajoute une nouvelle ligne de débannissement
                infractions.push({
                    id: utilisateur.id,
                    warnedBy: interaction.user.id,
                    type: 'Débannissement',
                    date: new Date().toISOString(),
                });
            } else {
                // Si aucune infraction de type Bannissement n'est trouvée, vous pouvez ajouter une nouvelle ligne de débannissement
                infractions.push({
                    id: utilisateur.id,
                    warnedBy: interaction.user.id,
                    type: 'Débannissement',
                    date: new Date().toISOString(),
                });
            }

            saveGuildData(guildPath, { infractions });


            console.log(`Tentative de débannissement de ${utilisateur.tag}`);

            // Envoi de l'embed pour le DM
            const unbanDMEmbed = new EmbedBuilder()
                .setTitle('✅ Vous avez été débanni')
                .setDescription(`Vous avez été débanni du serveur **${interaction.guild.name}**.`)
                .addFields(
                    { name: '🔨 Débanni par', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                )
                .setColor(guildData.botColor || '#f40076')
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

            await utilisateur.send({ embeds: [unbanDMEmbed] }).catch((err) => {
                console.warn(`Impossible d'envoyer un message privé à ${utilisateur.tag}.`, err.message);
            });

            const userUnbanEmbed = new EmbedBuilder()
                .setTitle('✅ Débanni du serveur')
                .setDescription(`L'utilisateur <@${utilisateur.id}> a été débanni du serveur **${interaction.guild.name}**.`)
                .addFields(
                    { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                    { name: '🔨 Débanni par', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setColor(guildData.botColor || '#f40076')
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

            // Envoi des logs dans le salon de modération ou l'interaction
            const logChannelId = guildData.logs_member_channel;
            const logEmbed = new EmbedBuilder()
                .setTitle('✅ Débanni du serveur')
                .setDescription(`L'utilisateur <@${utilisateur.id}> a été débanni du serveur **${interaction.guild.name}**.`)
                .addFields(
                    { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                    { name: '🔨 Débanni par', value: `<@${interaction.user.id}>`, inline: true },
                )
                .setColor(guildData.botColor || '#f40076')
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

            if (logChannelId) {
                const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    console.log('Envoi des logs dans le canal de modération.');
                    await logChannel.send({ embeds: [logEmbed] });
                    await interaction.editReply({ content: '', embeds: [userUnbanEmbed] });
                } else {
                    console.warn(`Le salon logs_moderation_channel (${logChannelId}) n'a pas pu être trouvé.`);
                    await interaction.editReply({ content: '', embeds: [userUnbanEmbed] });
                }
            } else {
                console.log('Aucun salon de logs configuré. Envoi dans l\'interaction.');
                await interaction.editReply({ content: '', embeds: [userUnbanEmbed] });
            }
        } catch (error) {
            console.error('Erreur lors du processus de débannissement :', error);
            await interaction.editReply({
                content: 'Une erreur est survenue lors du débannissement. Assurez-vous que l\'utilisateur est banni et que vous avez les permissions nécessaires.',
                ephemeral: true,
            });
        }
    },
};
