    const { EmbedBuilder } = require('discord.js');
    const fs = require('fs');
    const path = require('path');

    // Fonction pour convertir la durée en millisecondes
    const parseDuration = (duration) => {
        const regex = /^(\d+)(s|m|h|d)$/i;
        const match = duration.match(regex);
        
        if (!match) {
            return null; // Retourner null si le format n'est pas valide
        }
        
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        
        switch (unit) {
            case 's': // Secondes
                return { ms: value * 1000, formatted: `${value} seconde${value > 1 ? 's' : ''}` };
            case 'm': // Minutes
                return { ms: value * 60 * 1000, formatted: `${value} minute${value > 1 ? 's' : ''}` };
            case 'h': // Heures
                return { ms: value * 60 * 60 * 1000, formatted: `${value} heure${value > 1 ? 's' : ''}` };
            case 'd': // Jours
                return { ms: value * 24 * 60 * 60 * 1000, formatted: `${value} jour${value > 1 ? 's' : ''}` };
            default:
                return null;
        }
    };

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
            name: 'timeout',
            description: 'Mettre un utilisateur en timeout (temporairement)',
            options: [
                {
                    name: 'utilisateur',
                    type: 6, // USER
                    description: 'L\'utilisateur à mettre en timeout',
                    required: true,
                },
                {
                    name: 'duree',
                    type: 3, // STRING
                    description: 'Durée du timeout (ex : 3s, 5m, 1d)',
                    required: true,
                },
                {
                    name: 'raison',
                    type: 3, // STRING
                    description: 'Raison du timeout',
                    required: false,
                },
            ],
        },
        async execute(interaction) {
            const utilisateur = interaction.options.getUser('utilisateur');
            const duree = interaction.options.getString('duree');
            const raison = interaction.options.getString('raison') || 'Aucune raison spécifiée.';
            
            // Vérification du format de la durée
            const timeoutDuration = parseDuration(duree);
            if (!timeoutDuration) {
                return interaction.editReply({
                    content: 'La durée spécifiée est invalide. Utilisez un format comme 3s, 5m, 1d.',
                    ephemeral: true,
                });
            }

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
                    return interaction.editReply({
                        content: 'Vous n\'avez pas la permission de donner un timeout.',
                        ephemeral: true,
                    });
                }
            } else {
                return interaction.editReply({
                    content: '**Rôle administrateur non configuré ->** `/config-general`',
                    ephemeral: true,
                });
            }

            // Enregistrer l'infraction dans le JSON
            const infractions = guildData.infractions || [];
            infractions.push({
                id: utilisateur.id,
                tag: utilisateur.tag,
                raison,
                warnedBy: interaction.user.id,
                type: 'Timeout',
                date: new Date().toISOString(),
                duration: duree,
            });
            
            saveGuildData(guildPath, { infractions });

            // Mettre l'utilisateur en timeout
            try {
                const member = await interaction.guild.members.fetch(utilisateur.id);
                if (!member) {
                    return interaction.editReply({
                        content: 'Impossible de trouver cet utilisateur sur le serveur.',
                        ephemeral: true,
                    });
                }

                // Appliquer le timeout
                await member.timeout(timeoutDuration.ms, raison);

                // DM à l'utilisateur
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🚫 Vous avez été mis en timeout')
                    .setDescription(`Vous avez été mis en timeout dans le serveur **${interaction.guild.name}**.`)
                    .addFields(
                        { name: '❌ Raison', value: raison, inline: false },
                        { name: '⏳ Durée', value: timeoutDuration.formatted, inline: true },
                        { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                    )
                    .setColor('#FFA500')
                    .setTimestamp()
                    .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

                await utilisateur.send({ embeds: [dmEmbed] }).catch(err => {
                    console.warn(`Impossible d'envoyer un message privé à ${utilisateur.tag}.`);
                });

                // Réponse dans le salon
                const successEmbed = new EmbedBuilder()
                    .setTitle('⏳ Timeout appliqué')
                    .setDescription(`L'utilisateur <@${utilisateur.id}> a été mis en timeout pour **${timeoutDuration.formatted}**.`)
                    .addFields(
                        { name: '❌ Raison', value: raison, inline: false },
                        { name: '⏳ Durée', value: timeoutDuration.formatted, inline: true },
                    )
                    .setColor('#FFA500')
                    .setTimestamp()
                    .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

                await interaction.editReply({ content: '', embeds: [successEmbed] });

                // Vérifier si le salon des logs existe
                const logsChannelId = guildData.logs_member_channel;
                if (logsChannelId) {
                    const logsChannel = interaction.guild.channels.cache.get(logsChannelId);
                    const logEmbed = new EmbedBuilder()
                        .setTitle('⏳ Timeout appliqué à un membre')
                        .setDescription(`L'utilisateur <@${utilisateur.id}> a été mis en timeout pour **${timeoutDuration.formatted}**.`)
                        .addFields(
                            { name: '❌ Raison', value: raison, inline: false },
                            { name: '⏳ Durée', value: timeoutDuration.formatted, inline: true },
                            { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                        )
                        .setColor('#FFA500')
                        .setTimestamp()
                        .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });
                    await logsChannel.send({ embeds: [logEmbed] });
                        
                }

            } catch (error) {
                console.error('Erreur lors de l\'application du timeout :', error);
                await interaction.editReply({
                    content: 'Une erreur est survenue lors de l\'application du timeout.',
                    ephemeral: true,
                });
            }
        },
    };
