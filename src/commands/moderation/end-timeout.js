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
        name: 'end-timeout',
        description: 'Retirer un utilisateur du timeout',
        options: [
            {
                name: 'utilisateur',
                type: 6, // USER
                description: 'L\'utilisateur à retirer du timeout',
                required: true,
            },
        ],
    },
    async execute(interaction) {
        const utilisateur = interaction.options.getUser('utilisateur');

        const guildId = interaction.guild.id;
        const guildPath = path.join(__dirname, `../../../guilds-data/${guildId}.json`);
        const guildData = loadGuildData(guildPath);

        if (guildData.ownerId) {
            const isOwner = guildData.ownerId === interaction.user.id;
            const modRoleId = guildData.mod_role;
            const hasmodRole = interaction.member.roles.cache.has(modRoleId);
            const adminRoleId = guildData.admin_role;
            const hasadminRole = interaction.member.roles.cache.has(adminRoleId);

            // Autoriser seulement si l'utilisateur est soit ownerId, soit possède le rôle Admin ou Mod
            if (!isOwner && !hasadminRole && !hasmodRole) {
                return interaction.reply({
                    content: 'Vous n\'avez pas la permission de retirer un timeout.',
                    ephemeral: true,
                });
            }
        } else {
            return interaction.reply({
                content: '**Rôle administrateur non configuré ->** `/config-general`',
                ephemeral: true,
            });
        }

        try {
            const member = await interaction.guild.members.fetch(utilisateur.id);
            if (!member) {
                return interaction.reply({
                    content: 'Impossible de trouver cet utilisateur sur le serveur.',
                    ephemeral: true,
                });
            }

            // Retirer le timeout
            await member.timeout(null);

            // Enregistrer l'infraction "Fin de timeout"
            const infractions = guildData.infractions || [];
            infractions.push({
                id: utilisateur.id,
                tag: utilisateur.tag,
                warnedBy: interaction.user.id,
                type: 'Fin de timeout',
                date: new Date().toISOString(),
            });

            saveGuildData(guildPath, { infractions });

            // DM à l'utilisateur
            const dmEmbed = new EmbedBuilder()
                .setTitle('✅ Vous avez été retiré du timeout')
                .setDescription(`Vous avez été retiré du timeout dans le serveur **${interaction.guild.name}**.`)
                .setColor('#00FF00')
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

            await utilisateur.send({ embeds: [dmEmbed] }).catch(err => {
                console.warn(`Impossible d'envoyer un message privé à ${utilisateur.tag}.`);
            });

            // Réponse dans le salon
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Timeout retiré')
                .setDescription(`L'utilisateur <@${utilisateur.id}> a été retiré du timeout.`)
                .setColor('#00FF00')
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({ embeds: [successEmbed] });

            // Vérifier si le salon des logs existe
            const logsChannelId = guildData.logs_member_channel;
            if (logsChannelId) {
                const logsChannel = interaction.guild.channels.cache.get(logsChannelId);
                const logEmbed = new EmbedBuilder()
                    .setTitle('✅ Timeout retiré à un membre')
                    .setDescription(`L'utilisateur <@${utilisateur.id}> a été retiré du timeout.`)
                    .addFields(
                        { name: 'Utilisateur retiré du timeout', value: `<@${utilisateur.id}>`, inline: true },
                        { name: 'Retiré par', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'Date', value: new Date().toLocaleString(), inline: true }
                    )
                    .setColor('#00FF00')
                    .setTimestamp()
                    .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });
            
                await logsChannel.send({ embeds: [logEmbed] });
            }            
        } catch (error) {
            console.error('Erreur lors du retrait du timeout :', error);
            await interaction.reply({
                content: 'Une erreur est survenue lors du retrait du timeout.',
                ephemeral: true,
            });
        }
    },
};
