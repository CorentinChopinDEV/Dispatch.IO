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
        name: 'no-name',
        description: 'Renommer un utilisateur, retirer ses rôles et lui attribuer un rôle spécifique.',
        options: [
            {
                name: 'utilisateur',
                type: 6, // USER
                description: 'L\'utilisateur à modifier',
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
        const roleId = '1327822325323927552';  // Le rôle prédéfini à attribuer (à configurer dans le fichier JSON)
        const logChannelId = guildData.logs_member_channel;  // Salon de logs pour envoyer les actions

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
            // Renommer l'utilisateur
            await member.setNickname('Nom à changer').catch((err) => {
                console.error(`Impossible de renommer l'utilisateur : ${err.message}`);
            });

            // Retirer tous les rôles
            await member.roles.set([]).catch((err) => {
                console.error(`Impossible de retirer les rôles : ${err.message}`);
            });

            // Ajouter le rôle prédéfini
            const role = interaction.guild.roles.cache.get(roleId);
            if (role) {
                await member.roles.add(role).catch((err) => {
                    console.error(`Impossible d'ajouter le rôle : ${err.message}`);
                });
            }

            // Envoyer un message privé à l'utilisateur
            const dmEmbed = new EmbedBuilder()
                .setTitle('Modification de votre compte Discord')
                .setDescription('## Votre pseudo a été changé et vos rôles ont été modifiés par un administrateur, car il ne respectait pas les règles du serveur.')
                .addFields(
                    { name: '🔧 Action effectuée', value: 'Votre pseudo a été réinitialisé à un nom par défaut, et le rôle "No-Name" a été attribué à votre compte.', inline: false },
                    { name: '🔧 Action requise', value: 'Utilisez la commande sur le serveur``/me-renommer`` pour être rétabli.', inline: false },
                    { name: '📜 Règle violée', value: 'Le pseudo ne correspondait pas aux exigences du serveur.', inline: true }
                )
                .setColor('#FF0000')
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() });

            try {
                await utilisateur.send({ embeds: [dmEmbed] });
            } catch (e) {
                console.warn(`Impossible d'envoyer un message privé à ${utilisateur.tag}.`, e.message);
            }

            // Log dans le salon de logs
            const logEmbed = new EmbedBuilder()
                .setTitle('🔰 Action effectuée sur un utilisateur')
                .setDescription(`### L'utilisateur <@${utilisateur.id}> a été renommé et ses rôles ont été modifiés. Cette action a été réalisée suite à une non-conformité de son pseudo.`)
                .addFields(
                    { name: '🔨 Action effectuée par', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📅 Date de l\'action', value: new Date().toLocaleString(), inline: true },
                    { name: '📝 Détails de l\'action', value: 'Renommage du pseudo et réattribution des rôles.', inline: false },
                    { name: '🔰 Raison', value: 'Violation des règles de pseudo.', inline: false }
                )
                .setColor(guildData.botColor || '#f40076')
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.user.displayAvatarURL() })



            if (logChannelId) {
                const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    console.log('Envoi des logs dans le canal de modération.');
                    await logChannel.send({ embeds: [logEmbed] });
                    await interaction.reply({
                        content: `Action sur l'utilisateur <@${utilisateur.id}> effectuée avec succès.`,
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
            console.error('Erreur lors du processus de modification :', error);
            await interaction.reply({
                content: 'Une erreur est survenue lors de l\'exécution de la commande.',
                ephemeral: true,
            });
        }
    },
};
