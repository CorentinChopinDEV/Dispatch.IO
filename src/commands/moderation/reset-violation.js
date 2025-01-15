const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const loadGuildData = (guildPath) => {
    try {
        if (fs.existsSync(guildPath)) {
            return JSON.parse(fs.readFileSync(guildPath, 'utf8'));
        }
    } catch (error) {
        console.error(`Erreur lors du chargement des données : ${error.message}`);
        return null;
    }
};

const saveGuildData = (guildPath, newData) => {
    try {
        const currentData = loadGuildData(guildPath) || {};
        const mergedData = { ...currentData, ...newData };
        fs.writeFileSync(guildPath, JSON.stringify(mergedData, null, 2));
    } catch (error) {
        console.error(`Erreur lors de la sauvegarde des données : ${error.message}`);
    }
};

module.exports = {
    data: {
        name: 'reset-violation-pseudo',
        description: 'Affiche la liste des utilisateurs ayant violé les règles.',
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildPath = path.join(__dirname, `../../../guilds-data/${guildId}.json`);

        // Charger les données de la guilde
        const guildData = loadGuildData(guildPath);
        if (!guildData) {
            return interaction.editReply({
                content: 'Données de guilde non trouvées.',
                ephemeral: true,
            });
        }

        const violationPseudo = '1327822325323927552'; // ID du rôle
        if (interaction.guild.id !== '1212777500565045258') {
            return interaction.editReply({
                content: '## Cette commande n\'est pas disponible sur ce serveur. ❌',
                ephemeral: true,
            });
        }

        const isOwner = guildData.ownerId === interaction.user.id;
        const hasAdminRole = interaction.member.roles.cache.has(guildData.admin_role);

        if (!isOwner && !hasAdminRole) {
            return interaction.editReply({
                content: 'Vous n\'avez pas la permission de consulter ceci. 🔴',
                ephemeral: true,
            });
        }

        const membersWithRole = interaction.guild.members.cache.filter(member =>
            member.roles.cache.has(violationPseudo)
        );

        if (membersWithRole.size === 0) {
            return interaction.editReply({
                content: 'Aucun membre avec le rôle spécifié n\'a été trouvé.',
                ephemeral: true,
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('Liste des utilisateurs ayant une violation du pseudo !')
            .setDescription(
                membersWithRole.map(member => `• <@${member.user.id}> \`\`${member.id}\`\``).join('\n')
            )
            .setColor('#ff0000')
            .setThumbnail(interaction.guild.iconURL())
            .setFooter({ text: 'Action d\'administration', iconURL: interaction.guild.iconURL() })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('kick_members')
                    .setLabel('Confirmer et kicker')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_kick')
                    .setLabel('Annuler')
                    .setStyle(ButtonStyle.Secondary)
            );

        const countdownEmbed = new EmbedBuilder()
            .setTitle('⚠️ Une action immédiate est requise !')
            .setDescription('@everyone | Le compte à rebours de 5 minutes commence maintenant !')
            .setColor('#ff0000')
            .setTimestamp();

        let timeRemaining = 300; // 5 minutes en secondes

        await interaction.editReply({ content: '', embeds: [embed, countdownEmbed], components: [row] });
        await interaction.channel.send('@everyone | Action urgente requise ! ⚠️');

        const interval = setInterval(async () => {
            timeRemaining -= 10;  // Décrémenter par 10 secondes à chaque intervalle
        
            if (timeRemaining <= 0) {
                clearInterval(interval);
                countdownEmbed.setDescription('⚠️ Le procéssus d\'exclusion va commencer !');
                await interaction.editReply({ embeds: [embed, countdownEmbed], components: [row] });
                return;
            }
        
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            countdownEmbed.setDescription(`Temps restant : ${minutes} minute(s) et ${seconds} seconde(s) ⚠️`);
        
            await interaction.editReply({ embeds: [embed, countdownEmbed], components: [row] });
        }, 10000);  // L'intervalle de mise à jour est de 10 secondes
        

        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => ['kick_members', 'cancel_kick'].includes(i.customId) && i.user.id === interaction.user.id,
            time: 600000, // 5 minutes
        });

        collector.on('collect', async i => {
            await i.deferUpdate();
            clearInterval(interval);

            if (i.customId === 'kick_members') {
                const embedKickNotification = (guildName, user, interaction) => {
                    return new EmbedBuilder()
                        .setTitle('🚫 Vous avez été expulsé')
                        .setDescription(`Vous avez été expulsé du serveur **${guildName}**.`)
                        .addFields(
                            { name: '❌ Raison', value: 'Non changement du pseudo après une violation du règlement.', inline: false },
                            { name: '🔨 Expulsé par', value: `<@${interaction.user.id}>`, inline: true },
                            { name: '📅 Date', value: new Date().toLocaleString(), inline: true }
                        )
                        .setColor('#FFA500') // Orange
                        .setTimestamp()
                        .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });
                };
                const kickPromises = membersWithRole.map(async member => {
                    try {
                        const embed = embedKickNotification(interaction.guild.name, member.user, interaction);
                        await member.send({ embeds: [embed] }).catch(() => null);
                        await member.kick('Violation de la règlementation concernant le pseudo.');
                    } catch (error) {
                        console.error(`Erreur lors du kick de ${member.user.tag} : ${error.message}`);
                    }
                });

                await Promise.all(kickPromises);

                if (guildData.logs_member_channel) {
                    const logChannel = interaction.guild.channels.cache.get(guildData.logs_member_channel);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle(`🚫 ${membersWithRole.size} utilisateurs expulsé`)
                            .setDescription(`### Les ${membersWithRole.size} utilisateurs ont été expulsés du serveur après avoir commis une violation du règlement.`)
                            .addFields(
                                { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                                { name: '🔨 Expulsé par', value: `<@${interaction.user.id}>`, inline: true },
                                { name: '❌ Raison', value: 'Suite au non-respect de la règle des pseudos.', inline: false },
                            )
                            .setColor('#FFA500') // Orange
                            .setTimestamp()
                            .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

                await interaction.editReply({
                    content: `${membersWithRole.size} membre(s) ont été exclu(s) avec succès.`,
                    embeds: [],
                    components: [],
                });

                collector.stop();
            } else if (i.customId === 'cancel_kick') {
                await interaction.editReply({
                    content: 'Action annulée, aucun membre n\'a été exclu.',
                    embeds: [],
                    components: [],
                });
                collector.stop();
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                clearInterval(interval);
                interaction.editReply({
                    content: 'Aucune action prise dans le temps imparti.',
                    embeds: [],
                    components: [],
                });
            }
        });
    },
};
