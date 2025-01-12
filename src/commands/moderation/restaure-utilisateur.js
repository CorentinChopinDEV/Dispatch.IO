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
        name: 'restore-utilisateur',
        description: 'Restaurer un utilisateur en retirant le rôle spécifique et en lui attribuant le rôle membre.',
        options: [
            {
                name: 'utilisateur',
                type: 6, // USER
                description: 'L\'utilisateur à restaurer',
                required: true,
            },
        ],
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildPath = path.join(__dirname, `../../../guilds-data/${guildId}.json`);

        // Charger les données de la guilde
        const guildData = loadGuildData(guildPath);
        if (!guildData) {
            return interaction.reply({
                content: 'Données de guilde non trouvées.',
                ephemeral: true,
            });
        }

        if(interaction.guild.id !== '1212777500565045258'){
            return interaction.reply({
                content: '## Cette commande n\'est pas disponible sur ce serveur. ❌',
                ephemeral: true,
            });
        }

        if (guildData.ownerId) {
            const isOwner = guildData.ownerId === interaction.user.id;
            const modRoleId = guildData.mod_role;
            const hasmodRole = interaction.member.roles.cache.has(modRoleId);
            const adminRoleId = guildData.admin_role;
            const hasadminRole = interaction.member.roles.cache.has(adminRoleId);
        
            // Autoriser seulement si l'utilisateur est soit ownerId, soit possède le rôle Admin ou Mod
            if (!isOwner && !hasadminRole && !hasmodRole) {
                return interaction.reply({
                    content: 'Vous n\'avez pas la permission de restaurer cet utilisateur. 🔴',
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
        const logChannelId = guildData.logs_member_channel;

        if (!utilisateur) {
            return interaction.reply({
                content: 'Veuillez spécifier un utilisateur.',
                ephemeral: true,
            });
        }

        const member = await interaction.guild.members.fetch(utilisateur.id);

        if (!member) {
            return interaction.reply({
                content: 'Utilisateur non trouvé dans le serveur.',
                ephemeral: true,
            });
        }

        try {
            // Retirer le rôle spécifique "no-name"
            const roleId = '1327822325323927552'; // Le rôle prédéfini à retirer
            const role = interaction.guild.roles.cache.get(roleId);
            if (role) {
                await member.roles.remove(role).catch((err) => {
                    console.error(`Impossible de retirer le rôle : ${err.message}`);
                });
            }

            // Ajouter le rôle "membre"
            const memberRoleId = '1213149429859618926'
            const memberRole = interaction.guild.roles.cache.get(memberRoleId);
            if (memberRole) {
                await member.roles.add(memberRole).catch((err) => {
                    console.error(`Impossible d'ajouter le rôle membre : ${err.message}`);
                });
            }
            const memberRoleId2 = '1325901504518815784'
            const memberRole2 = interaction.guild.roles.cache.get(memberRoleId2);
            if (memberRole2) {
                await member.roles.add(memberRole2).catch((err) => {
                    console.error(`Impossible d'ajouter le rôle membre : ${err.message}`);
                });
            }
            const memberRoleId3 = '1325902463076929718'
            const memberRole3 = interaction.guild.roles.cache.get(memberRoleId3);
            if (memberRole3) {
                await member.roles.add(memberRole3).catch((err) => {
                    console.error(`Impossible d'ajouter le rôle membre : ${err.message}`);
                });
            }
            const memberRoleId4 = '1325902784570331228'
            const memberRole4 = interaction.guild.roles.cache.get(memberRoleId4);
            if (memberRole4) {
                await member.roles.add(memberRole4).catch((err) => {
                    console.error(`Impossible d'ajouter le rôle membre : ${err.message}`);
                });
            }
            // Envoyer un message privé à l'utilisateur
            const dmEmbed = new EmbedBuilder()
                .setTitle('🔰 Action effectuée')
                .setDescription('### Vous avez étais rétablie.')
                .setColor(guildData.botColor || '#f40076')
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });
            try {
                await member.send({ embeds: [dmEmbed] });
            } catch (e) {
                console.warn(`Impossible d'envoyer un message privé à ${utilisateur.tag}.`, e.message);
            }
            // Log dans le salon de logs
            const logEmbed = new EmbedBuilder()
                .setTitle('🔰 Action effectuée sur un utilisateur')
                .setDescription(`### L'utilisateur <@${utilisateur.id}> a été restauré avec succès.`)
                .addFields(
                    { name: '🔨 Action effectuée par', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                )
                .setColor(guildData.botColor || '#f40076')
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

            if (logChannelId) {
                const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    console.log('Envoi des logs dans le canal de modération.');
                    await logChannel.send({ embeds: [logEmbed] });
                    await interaction.reply({
                        content: `Utilisateur <@${utilisateur.id}> restauré avec succès.`,
                        ephemeral: true,
                    });
                } else {
                    console.warn(`Le salon logs_member_channel (${logChannelId}) n'a pas pu être trouvé.`);
                    await interaction.reply({
                        content: 'L\'action a été effectuée, mais le salon de logs est introuvable.',
                        ephemeral: true,
                    });
                }
            } else {
                console.warn('Aucun salon de logs configuré.');
                await interaction.reply({
                    content: 'L\'action a été effectuée, mais aucun salon de logs n\'est configuré.',
                    ephemeral: true,
                });
            }
        } catch (error) {
            console.error('Erreur lors du processus de restauration :', error);
            await interaction.reply({
                content: 'Une erreur est survenue lors de l\'exécution de la commande.',
                ephemeral: true,
            });
        }
    },
};
