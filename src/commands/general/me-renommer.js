const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
    data: new SlashCommandBuilder()
        .setName('me-renommer')
        .setDescription('Permet de changer votre pseudo sur le serveur')
        .addStringOption(option =>
            option.setName('pseudo')
                .setDescription('Nouveau pseudo que vous voulez définir')
                .setRequired(true)),

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
        const newName = interaction.options.getString('pseudo'); // Nouveau pseudo
        try {
            const guildId = interaction.guild.id;
            // Modifie le pseudo de l'utilisateur
            if(guildId === '1212777500565045258'){
                if(interaction.channel.id === '1327824803129851914'){
                    const allowedCharacters = /^[a-zA-Z0-9]+$/;
                    if (!allowedCharacters.test(newName)){
                        await interaction.reply({content: 'Votre pseudo contient un charactères spécial, merci de le modifié.', ephemeral: true})
                    }else if (newName === 'MonPseudo') {
                        await interaction.reply({content: 'Votre pseudo ne peut pas être MonPseudo, merci de le modifié.', ephemeral: true})
                    }else{
                        await interaction.member.setNickname(newName);
                        await interaction.reply({
                            content: `Votre pseudo a été modifié en **${newName}** !`,
                            ephemeral: true, // Message visible uniquement pour l'utilisateur
                        });
                        const infractions = guildData.infractions || [];
                        infractions.push({
                            id: interaction.user.id,
                            tag: interaction.user.tag,
                            raison: 'Utilisateur rétabli suite à une violation du Pseudo.',
                            warnedBy: 'Dispatch.IO',
                            type: 'Utilisateur Rétabli',
                            date: new Date().toISOString(),
                        });
                        saveGuildData(guildPath, { infractions });
                        try {
                            const roleId = '1327822325323927552';
                            const role = interaction.guild.roles.cache.get(roleId);
                            if (role) {
                                await interaction.member.roles.remove(role).catch((err) => {
                                    console.error(`Impossible de retirer le rôle : ${err.message}`);
                                });
                            }
                
                            // Ajouter le rôle "membre"
                            const memberRoleId = '1213149429859618926';
                            const restrictedRoleId = '1225026301870473288';
                
                            const memberRole = interaction.guild.roles.cache.get(memberRoleId);
                            const restrictedRole = interaction.guild.roles.cache.get(restrictedRoleId);
                            if (interaction.member.roles.cache.has(restrictedRoleId)) {
                                console.log(`L'utilisateur possède déjà le rôle ${restrictedRole.name}, rôle ${memberRole.name} non attribué.`);
                            } else {
                                await interaction.member.roles.add(memberRole).catch((err) => {
                                    console.error(`Impossible d'ajouter le rôle membre : ${err.message}`);
                                });
                                console.log('Role membre ajouter.')
                            }
                            const memberRoleId2 = '1325901504518815784'
                            const memberRole2 = interaction.guild.roles.cache.get(memberRoleId2);
                            if (memberRole2) {
                                await interaction.member.roles.add(memberRole2).catch((err) => {
                                    console.error(`Impossible d'ajouter le rôle membre : ${err.message}`);
                                });
                            }
                            const memberRoleId3 = '1325902463076929718'
                            const memberRole3 = interaction.guild.roles.cache.get(memberRoleId3);
                            if (memberRole3) {
                                await interaction.member.roles.add(memberRole3).catch((err) => {
                                    console.error(`Impossible d'ajouter le rôle membre : ${err.message}`);
                                });
                            }
                            const memberRoleId4 = '1325902784570331228'
                            const memberRole4 = interaction.guild.roles.cache.get(memberRoleId4);
                            if (memberRole4) {
                                await interaction.member.roles.add(memberRole4).catch((err) => {
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
                                await interaction.member.send({ embeds: [dmEmbed] });
                            } catch (e) {
                                console.warn(`Impossible d'envoyer un message privé à ${utilisateur.tag}.`, e.message);
                            }
                            // Log dans le salon de logs
                            const logEmbed = new EmbedBuilder()
                                .setTitle('🔰 Action effectuée sur un utilisateur')
                                .setDescription(`### L'utilisateur <@${interaction.member.id}> a été restauré avec succès.`)
                                .addFields(
                                    { name: '🔨 Action effectuée par', value: `Dispatch.IO`, inline: true },
                                    { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                                )
                                .setColor(guildData.botColor || '#f40076')
                                .setTimestamp()
                                .setFooter({ text: 'Action effectuée par le système', iconURL: interaction.member.displayAvatarURL() });
                            const logChannelId = '1328516336476880917';
                            if (logChannelId) {
                                const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
                                if (logChannel) {
                                    console.log('Envoi des logs dans le canal de modération.');
                                    await logChannel.send({ embeds: [logEmbed] });
                                } else {
                                    console.warn(`Le salon logs_member_channel (${logChannelId}) n'a pas pu être trouvé.`);
                                    await interaction.editReply({
                                        content: 'L\'action a été effectuée, mais le salon de logs est introuvable.',
                                        ephemeral: true,
                                    });
                                }
                            } else {
                                console.warn('Aucun salon de logs configuré.');
                                await interaction.editReply({
                                    content: 'L\'action a été effectuée, mais aucun salon de logs n\'est configuré.',
                                    ephemeral: true,
                                });
                            }
                        } catch (error) {
                            console.error('Erreur lors du processus de restauration :', error);
                            await interaction.editReply({
                                content: 'Une erreur est survenue lors de l\'exécution de la commande.',
                                ephemeral: true,
                            });
                        }
                    }
                }else{
                    const allowedCharacters = /^[a-zA-Z0-9]+$/;
                    if (!allowedCharacters.test(newName)){
                        return interaction.reply({content: 'Votre pseudo contient un charactères spécial, merci de le modifié.', ephemeral: true})
                    }else{
                        await interaction.member.setNickname(newName);
                        await interaction.reply({
                            content: `Votre pseudo a été modifié en **${newName}** !`,
                            ephemeral: true, // Message visible uniquement pour l'utilisateur
                        });
                    }
                }
            }else{
                await interaction.reply({
                    content: `Votre pseudo a été modifié en **${newName}** !`,
                    ephemeral: true, // Message visible uniquement pour l'utilisateur
                });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'Une erreur est survenue lors de la tentative de changement de votre pseudo.',
                ephemeral: true,
            });
        }
    },
};
