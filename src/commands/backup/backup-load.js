const { EmbedBuilder, PermissionsBitField, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

function loadBackupData(token) {
    try {
        const backupFilePath = path.join(__dirname, `../../../backup/${token}-backup.json`);
        if (fs.existsSync(backupFilePath)) {
            const data = fs.readFileSync(backupFilePath, 'utf-8');
            return JSON.parse(data);
        }
        return null;
    } catch (err) {
        console.error('Erreur lors du chargement de la sauvegarde:', err);
        return null;
    }
}

function loadGuildData(guildPath) {
    try {
        if (fs.existsSync(guildPath)) {
            const data = fs.readFileSync(guildPath, 'utf-8');
            return JSON.parse(data);
        } else {
            console.log(`Le fichier pour la guilde ${guildPath} n'existe pas.`);
            return {};
        }
    } catch (err) {
        console.error('Erreur lors du chargement des données de la guilde:', err);
        return {};
    }
}

module.exports = {
    data: {
        name: 'backup-load',
        description: 'Restaurer une sauvegarde de serveur Discord',
        options: [{
            name: 'id',
            description: 'ID de la sauvegarde à restaurer',
            type: 3,
            required: true,
        }],
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        if (guildData.ownerId) {
            const isOwner = guildData.ownerId === interaction.user.id;
            if (!isOwner) {
                return interaction.reply({ content: 'Vous n\'avez pas la permission de consulter ceci.', ephemeral: true });
            }
        } else {
            return interaction.reply({ content: '**Rôle administrateur non configurée ->** ``/config-general``', ephemeral: true });
        }
        // Vérifications initiales
        if (!interaction.guild) {
            return interaction.reply({ 
                content: 'Cette commande ne peut être utilisée que dans un serveur.', 
                ephemeral: true 
            });
        }

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ 
                content: 'Vous avez besoin des permissions Administrateur pour utiliser cette commande.', 
                ephemeral: true 
            });
        }

        const token = interaction.options.getString('id');
        const backupData = loadBackupData(token);

        if (!backupData) {
            return interaction.reply({ 
                content: 'Aucune sauvegarde trouvée avec cet ID.', 
                ephemeral: true 
            });
        }

        // Création des boutons de confirmation
        const confirmButton = new ButtonBuilder()
            .setCustomId('confirm_restore')
            .setLabel('Confirmer')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId('cancel_restore')
            .setLabel('Annuler')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder()
            .addComponents(confirmButton, cancelButton);

        // Création de l'embed de confirmation
        const confirmationEmbed = new EmbedBuilder()
            .setColor(guildData?.antiRaid === 'Actif' ? '#FF0000' : '#FFA500')
            .setTitle('⚠️ Confirmation de restauration')
            .setDescription(`# ATTENTION:
**Cette action est irréversible !**
**Cela supprimera tous les salons et rôles existants pour les remplacer par ceux de la sauvegarde.**

## Anti-Raid: ${guildData?.antiRaid === 'Actif' ? '⛔' : '🆗'}
${guildData?.antiRaid === 'Actif' ? '**L\'Anti-Raid doit être désactiver pour lancer la procédure.** \`\`/antiraid\`\`' : 'L\'Anti Raid est bien desactivé. Nous sommes prêt !'}

### Êtes-vous sûr de vouloir restaurer cette sauvegarde ?
**Nom du serveur:** ${backupData.guildName}
**ID du serveur:** ${backupData.guildId}

**Commandes d'execution** 💻
\`\`\`/backup-load id:${token}\`\`\`
            `)
            .setTimestamp();

        let response = null;
        if(guildData.antiRaid === 'Actif'){
            response = await interaction.reply({
                embeds: [confirmationEmbed],
                ephemeral: true
            });
        }else{
            response = await interaction.reply({
                embeds: [confirmationEmbed],
                components: [row],
                ephemeral: true
            });
        }

        try {
            const confirmation = await response.awaitMessageComponent({ time: 240000 });

            if (confirmation.customId === 'cancel_restore') {
                await confirmation.update({ 
                    content: 'Restauration annulée.', 
                    embeds: [], 
                    components: [] 
                });
                return;
            }

            await confirmation.update({ 
                content: 'Début de la restauration...', 
                embeds: [], 
                components: [] 
            });

            // Création du message de progression
            const progressEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('<a:28213ttsloading:1328488543726866553> Restauration en cours')
                .setDescription('Initialisation de la restauration... 1️⃣')
                .setTimestamp();

            const statusMessage = await interaction.channel.send({
                embeds: [progressEmbed]
            });

            // Fonction de mise à jour de la progression
            const updateProgress = async (description) => {
                const newEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('<a:28213ttsloading:1328488543726866553> Restauration en cours')
                    .setDescription(description)
                    .setTimestamp();

                await statusMessage.edit({ embeds: [newEmbed] });
            };

            // Mise à jour des permissions @everyone
            await updateProgress('Mise à jour des permissions @everyone... 2️⃣');
            const everyoneRole = interaction.guild.roles.everyone;
            const everyoneData = backupData.roles.find(r => r.name === '@everyone');
            if (everyoneData) {
                try {
                    await everyoneRole.setPermissions(BigInt(everyoneData.permissions));
                } catch (err) {
                    console.error('Erreur lors de la mise à jour des permissions @everyone:', err);
                }
            }

            // Suppression des rôles existants
            await updateProgress('Suppression des rôles existants... 3️⃣');
            const rolesToDelete = interaction.guild.roles.cache
                .filter(role => 
                    role.name !== '@everyone' && 
                    role.position < interaction.guild.members.me.roles.highest.position
                );
            
            for (const role of rolesToDelete.values()) {
                try {
                    await role.delete();
                } catch (err) {
                    console.error(`Erreur lors de la suppression du rôle ${role.name}:`, err);
                }
            }

            await updateProgress('Suppression des salons existants... 4️⃣');
            for (const channel of interaction.guild.channels.cache.values()) {
                // Vérification pour ne pas supprimer le salon de l'interaction
                if (channel.id !== interaction.channel.id) {
                    try {
                        await channel.delete();
                    } catch (err) {
                        console.error(`Erreur lors de la suppression du salon ${channel.name}:`, err);
                    }
                } else {
                    console.log(`Le salon ${channel.name} a été exclu de la suppression.`);
                }
            }

            await updateProgress('Création des nouveaux rôles... 5️⃣');
            const roleMap = new Map();
            roleMap.set(everyoneData.id, everyoneRole.id);

            const sortedRoles = backupData.roles
                .filter(r => r.name !== '@everyone')
                .sort((a, b) => a.position - b.position);

            for (const roleData of sortedRoles) {
                try {
                    // Vérifier et afficher les données du rôle
                    console.log(`Tentative de création du rôle: ${roleData.name}`);

                    // Vérification que `roleData.permissions` est un BigInt valide
                    const permissions = BigInt(roleData.permissions);

                    // Ajouter un délai entre les créations de rôles
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    const role = await interaction.guild.roles.create({
                        name: roleData.name,
                        color: roleData.color,
                        hoist: roleData.hoist,
                        position: roleData.position,
                        permissions: permissions,
                        mentionable: roleData.mentionable
                    });
                    roleMap.set(roleData.id, role.id);
                } catch (err) {
                    console.error(`Erreur lors de la création du rôle ${roleData.name}:`, err.stack);
                }
            }

                

            // Création des catégories
            await updateProgress('Création des catégories... 5️⃣');
            const categories = new Map();
            const categoryChannels = backupData.channels
                .filter(c => c.type === ChannelType.GuildCategory)
                .sort((a, b) => a.position - b.position);

            for (const channelData of categoryChannels) {
                try {
                    const permissionOverwrites = channelData.permissionOverwrites.map(overwrite => ({
                        id: roleMap.get(overwrite.id) || overwrite.id,
                        type: overwrite.type,
                        allow: BigInt(overwrite.allow),
                        deny: BigInt(overwrite.deny)
                    }));

                    const category = await interaction.guild.channels.create({
                        name: channelData.name,
                        type: ChannelType.GuildCategory,
                        position: channelData.position,
                        permissionOverwrites
                    });
                    categories.set(channelData.id, category.id);
                } catch (err) {
                    console.error(`Erreur lors de la création de la catégorie ${channelData.name}:`, err);
                }
            }

            // Création des autres salons
            await updateProgress('Création des salons... 6️⃣');
            const nonCategoryChannels = backupData.channels
                .filter(c => c.type !== ChannelType.GuildCategory)
                .sort((a, b) => a.position - b.position);

            for (const channelData of nonCategoryChannels) {
                try {
                    const permissionOverwrites = channelData.permissionOverwrites.map(overwrite => ({
                        id: roleMap.get(overwrite.id) || overwrite.id,
                        type: overwrite.type,
                        allow: BigInt(overwrite.allow),
                        deny: BigInt(overwrite.deny)
                    }));

                    await interaction.guild.channels.create({
                        name: channelData.name,
                        type: channelData.type,
                        parent: categories.get(channelData.parent),
                        position: channelData.position,
                        topic: channelData.topic,
                        nsfw: channelData.nsfw,
                        bitrate: channelData.bitrate,
                        userLimit: channelData.userLimit,
                        rateLimitPerUser: channelData.rateLimitPerUser,
                        permissionOverwrites
                    });
                } catch (err) {
                    console.error(`Erreur lors de la création du salon ${channelData.name}:`, err);
                }
            }

            // Message de succès
            const successEmbed = new EmbedBuilder()
            .setColor('#f40076')
            .setTitle('✅ **Restauration Terminée avec Succès**')
            .setDescription('Le serveur a été restauré avec succès à partir de la sauvegarde. 🎉\n\nTous les salons et rôles ont été restaurés conformément à la sauvegarde fournie.')
            .addFields(
                { name: '🔧 Détails', value: 'Les configurations du serveur ont été mises à jour, y compris les salons, les rôles et les permissions.' },
                { name: '💡 Astuce', value: 'Assurez-vous de vérifier les rôles et permissions pour une meilleure gestion.' }
            )
            .setTimestamp()
            .setFooter({ text: 'Dispatch.IO - Restauration automatique', iconURL: interaction.client.user.avatarURL() })
            await statusMessage.edit({ embeds: [successEmbed] });

            const ownerId = interaction.guild.ownerId;
            const defaultData = {
                guildId: interaction.guild.id,
                ownerId: ownerId,
                joinedAt: Date.now(),
                serveurCount: interaction.client.guilds.cache.size,
                whitelist: `"${ownerId}"`,
                antiRaid: 'Actif',
                welcomeIMG: 'https://i.ibb.co/gJk80Sq/image-base.png'
            };

            const savePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
            fs.writeFile(savePath, JSON.stringify(defaultData, null, 4), (err) => {
                if (err) {
                    console.error('Erreur lors de la sauvegarde des données:', err);
                    return;
                }
                console.log('Données de la guilde sauvegardées avec succès !');
            });

            let logoURL = 'https://i.ibb.co/TcdznPc/IO-2.png';
            let bannerURL = 'https://i.ibb.co/HPrWVPP/Moderation-Anti-Raid.png';

            const embed = new EmbedBuilder()
                .setColor('#f40076')
                .setTitle('✅ **Restauration Terminée avec Succès**')
                .addFields(
                    {
                        name: '👤 Propriétaire du serveur',
                        value: `<@${ownerId}>`,
                        inline: false
                    },
                    {
                        name: '🆕 Commencez dès maintenant',
                        value:
                            `• Configurez le bot avec \`/config\`.\n`
                            + `• Essayez \`/help\` pour une liste des commandes.\n`
                            + `• Invitez vos amis avec \`/invitation\`.`,
                        inline: false
                    }
                )
                .setThumbnail(logoURL)
                .setImage(bannerURL)
                .setFooter({ text: 'Votre bot, vos règles. Configurez-le pour qu\'il vous ressemble !' });
                await statusMessage.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Erreur de restauration:', error);
            if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
                await interaction.editReply({
                    content: 'La demande de restauration a expiré.',
                    embeds: [],
                    components: []
                }).catch(console.error);
            } else {
                await interaction.followUp({
                    content: 'Une erreur est survenue pendant la restauration.',
                    ephemeral: true
                }).catch(console.error);
            }
        }
    },
};