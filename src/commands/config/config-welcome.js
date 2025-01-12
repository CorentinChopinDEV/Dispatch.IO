const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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

function saveGuildData(guildPath, data) {
    try {
        fs.writeFileSync(guildPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('Erreur lors de la sauvegarde des données de la guilde:', err);
    }
}

module.exports = {
    data: {
        name: 'config-bienvenue',
        description: 'Configurer le salon Bienvenue du BOT.',
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildPath = path.join(__dirname, `../../../guilds-data/${guildId}.json`);

        // Charger les données de la guilde
        let guildData = loadGuildData(guildPath);
        if (guildData.ownerId) {
            const isOwner = guildData.ownerId === interaction.user.id;
            const devRoleId = guildData.dev_role; // ID du rôle Dev, si configuré
            const hasDevRole = devRoleId && interaction.member.roles.cache.has(devRoleId); // Vérifie si l'utilisateur possède le rôle Dev
        
            // Autoriser seulement si l'utilisateur est soit ownerId, soit possède le rôle Dev
            if (!isOwner && !hasDevRole) {
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
        guildData.welcomeRoles = guildData.welcomeRoles || [];
        const createWelcomeEmbed = () => {
            return new EmbedBuilder()
                .setTitle('✨ Configuration de Bienvenue')
                .setDescription('Configurez les rôles attribués automatiquement aux nouveaux membres.')
                .addFields([
                    {
                        name: '**Rôles de Bienvenue**',
                        value: Array.isArray(guildData.welcomeRoles) && guildData.welcomeRoles.length > 0
                            ? guildData.welcomeRoles.map(id => `<@&${id}>`).join(', ')
                            : '🔴 Aucun rôle configuré.'
                    },
                    {
                        name: '**Statut du salon Bienvenue**',
                        value: guildData.welcome_channel
                            ? `🟢 Configuré : <#${guildData.welcome_channel}>`
                            : '🔴 Aucun salon sélectionné.'
                    },
                    {
                        name: '**Statut de l\'image de carte de bienvenue**',
                        value: guildData.welcomeIMG
                            ? '🟢 Une carte de bienvenue a été importée !'
                            : '❔ Aucune carte importée, celle par défaut sera utilisée.'
                    }
                ])
                .setColor(guildData.botColor || '#f40076')
                .setTimestamp()
                .setFooter({ text: 'Configurez vos rôles et salons de bienvenue facilement' })
                .setImage(guildData.welcomeIMG || 'https://default.image.url');
        };

        const embed = createWelcomeEmbed();

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('manage_roles')
                .setPlaceholder('Sélectionnez une action')
                .addOptions([
                    { label: '💺 Terminer la Configuration', value: 'finish' },
                    { label: '🅰️ Ajouter un Rôle', value: 'add' },
                    { label: '🆑 Retirer un Rôle', value: 'remove' },
                    { label: '🖼️ Ajouter une Image de Carte', value: 'upload_image' }
                ])
        );

        await interaction.reply({ embeds: [embed], components: [row] });

        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 5 * 60 * 1000 }); // Timeout après 5 minutes

        collector.on('collect', async i => {
            try {
                guildData = loadGuildData(guildPath); // Recharger les données à chaque interaction

                if (i.customId === 'manage_roles') {
                    switch (i.values[0]) {
                        case 'add':
                            const roleOptions = interaction.guild.roles.cache.map(role => ({
                                label: role.name,
                                value: role.id
                            }));

                            const addRow = new ActionRowBuilder().addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId('role_add')
                                    .setPlaceholder('Choisissez un rôle à ajouter')
                                    .addOptions(roleOptions)
                            );

                            await i.reply({ components: [addRow], ephemeral: true });
                            break;

                        case 'remove':
                            const removeOptions = guildData.welcomeRoles.map(id => {
                                const role = interaction.guild.roles.cache.get(id);
                                return role ? { label: role.name, value: role.id } : null;
                            }).filter(option => option !== null);

                            const removeRow = new ActionRowBuilder().addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId('role_remove')
                                    .setPlaceholder('Choisissez un rôle à retirer')
                                    .addOptions(removeOptions)
                            );

                            await i.reply({ components: [removeRow], ephemeral: true });
                            break;

                        case 'upload_image':
                            const uploadEmbed = new EmbedBuilder()
                                .setTitle('Upload d\'Image 📤')
                                .setDescription('Envoyez une image à uploader pour votre carte de bienvenue.')
                                .setColor('#2aa4ce')
                                .setTimestamp();
                        
                            await i.reply({ embeds: [uploadEmbed], ephemeral: true });
                        
                            const imageFilter = msg => msg.author.id === interaction.user.id && msg.attachments.size > 0;
                            const imageCollector = interaction.channel.createMessageCollector({ filter: imageFilter, time: 120000 });
                        
                            imageCollector.on('collect', async msg => {
                                try {
                                    const attachment = msg.attachments.first();
                                    const imageResponse = await axios.get(attachment.url, { responseType: 'arraybuffer' });
                        
                                    const formData = new URLSearchParams();
                                    formData.append('image', Buffer.from(imageResponse.data).toString('base64'));
                                    formData.append('key', '215e12764964d87efe03ad21242d8ba0');
                        
                                    const imgbbResponse = await axios.post('https://api.imgbb.com/1/upload', formData);
                                    const imgLink = imgbbResponse.data && imgbbResponse.data.data && imgbbResponse.data.data.url;
                                    if (!imgLink) {
                                        throw new Error('Image URL is undefined');
                                    }
                        
                                    guildData.welcomeIMG = imgLink;
                                    saveGuildData(guildPath, guildData);
                        
                                    // Recharger les données et mettre à jour l'embed principal
                                    guildData = loadGuildData(guildPath);
                                    const updatedEmbed = createWelcomeEmbed();
                        
                                    // Mettre à jour l'embed initial
                                    await interaction.editReply({
                                        embeds: [updatedEmbed],
                                        components: [row]
                                    });
                        
                                    // Supprimer le message d'upload
                                    await msg.delete();
                        
                                    // Supprimer l'embed de l'upload
                                    await i.deleteReply();
                        
                                    imageCollector.stop();
                                } catch (error) {
                                    console.error('Erreur de téléchargement d\'image :', error.message);
                                    await msg.reply('🚨 Une erreur est survenue pendant l\'upload.');
                                }
                            });
                            break;
                        case 'finish':
                            await interaction.deleteReply();
                            collector.stop();
                            break;
                    }
                }

                if (i.customId === 'role_add') {
                    const roleId = i.values[0];
                    guildData.welcomeRoles = guildData.welcomeRoles || [];
                
                    if (!guildData.welcomeRoles.includes(roleId)) {
                        guildData.welcomeRoles.push(roleId);
                        saveGuildData(guildPath, guildData);
                    }
                
                    const confirmationEmbed = new EmbedBuilder()
                        .setTitle('🅰️ Rôle Ajouté')
                        .setColor('#2ECC71')
                        .setDescription(`Le rôle <@&${roleId}> a été ajouté.`);
                
                    // Répondre et supprimer le menu déroulant
                    await i.update({ embeds: [confirmationEmbed], components: [] });
                
                    // Mettre à jour l'embed principal
                    const updatedEmbed = createWelcomeEmbed();
                    await interaction.editReply({ embeds: [updatedEmbed], components: [row] });
                }                             
                if (i.customId === 'role_remove') {
                    const roleId = i.values[0];
                    guildData.welcomeRoles = guildData.welcomeRoles || [];
                
                    if (guildData.welcomeRoles.includes(roleId)) {
                        guildData.welcomeRoles = guildData.welcomeRoles.filter(role => role !== roleId);
                        saveGuildData(guildPath, guildData);
                    }
                
                    const confirmationEmbed = new EmbedBuilder()
                        .setTitle('❌ Rôle Retiré')
                        .setColor('#E74C3C')
                        .setDescription(`Le rôle <@&${roleId}> a été retiré.`);
                
                    // Répondre et supprimer le menu déroulant
                    await i.update({ embeds: [confirmationEmbed], components: [] });
                
                    // Mettre à jour l'embed principal
                    const updatedEmbed = createWelcomeEmbed();
                    await interaction.editReply({ embeds: [updatedEmbed], components: [row] });
                }                           
            } catch (error) {
                console.error('Erreur dans la collecte des interactions :', error.message);
            }
        });

        collector.on('end', (_, reason) => {
            if (reason !== 'user') console.log('Collector terminé :', reason);
        });
    }
};
