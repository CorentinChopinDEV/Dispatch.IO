    const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
    const fs = require('fs');
    const path = require('path');

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
            name: 'config-general',
            description: 'Configure les paramètres généraux du serveur.',
        },
        async execute(interaction) {
            try {
                const guildId = interaction.guild.id;
                const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
                const guildData = loadGuildData(filePath);
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
                

                let configData = {};
                if (fs.existsSync(filePath)) {
                    try {
                        configData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    } catch (err) {
                        console.error('Erreur de lecture des données JSON :', err);
                    }
                }
                let bannerURL = 'https://i.ibb.co/HPrWVPP/Moderation-Anti-Raid.png';
                const createConfigEmbed = () => {
                    return new EmbedBuilder()
                        .setAuthor({ name: "DSC Dispatch PRO - Configuration" })
                        .setTitle(`Configuration du Serveur | ${interaction.guild.name}`)
                        .setTimestamp()
                        .setColor(guildData.botColor || '#f40076')
                        .setImage(bannerURL)
                        .setDescription(`**Nom du propriétaire:** <@${configData.ownerId}>\n**Le bot à rejoins le: ${new Date(configData.joinedAt).toLocaleString()}**\n\n**Configuration:**`)
                        .addFields([
                            { name: 'Rôle Administrateur', value: configData.admin_role ? `🟢 <@&${configData.admin_role}>` : '🔴 Non défini', inline: true },
                            { name: 'Rôle Développeur', value: configData.dev_role ? `🟢 <@&${configData.dev_role}>` : '🔴 Non défini', inline: true },
                            { name: 'Rôle Modérateur', value: configData.mod_role ? `🟢 <@&${configData.mod_role}>` : '🔴 Non défini', inline: true },
                            { name: 'Rôle Membre', value: configData.member_role ? `🟢 <@&${configData.member_role}>` : '🔴 Non défini', inline: true },
                            { name: 'Salon Bienvenue', value: configData.welcome_channel ? `🟢 <#${configData.welcome_channel}>` : '🔴 Non défini', inline: true },
                            { name: 'Salon Règlement', value: configData.rules_channel ? `🟢 <#${configData.rules_channel}>` : '🔴 Non défini', inline: true },
                            { name: 'Salon Radio', value: configData.radio_channel ? `🟢 <#${configData.radio_channel}>` : '🔴 Non défini', inline: true },
                            { name: 'Salon Radio Audio', value: configData.radio_channel_audio ? `🟢 <#${configData.radio_channel_audio}>` : '🔴 Non défini', inline: true },
                            { name: 'Salon Level', value: configData.level_channel ? `🟢 <#${configData.level_channel}>` : '🔴 Non défini', inline: true },
                            { name: 'Salon Ticket', value: configData.ticket_channel ? `🟢 <#${configData.ticket_channel}>` : '🔴 Non défini', inline: true },
                            { name: 'Salon Logs Raid', value: configData.logs_raid_channel ? `🟢 <#${configData.logs_raid_channel}>` : '🔴 Non défini', inline: true },
                            { name: 'Salon Logs Membre', value: configData.logs_member_channel ? `🟢 <#${configData.logs_member_channel}>` : '🔴 Non défini', inline: true },
                            { name: 'Salon Logs Serveur', value: configData.logs_server_channel ? `🟢 <#${configData.logs_server_channel}>` : '🔴 Non défini', inline: true }
                        ])
                        .setFooter({ text: 'Discord Dispatch PRO' });
                };

                let selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('config-menu')
                    .setPlaceholder('Choisissez un élément à configurer')
                    .addOptions([
                        { label: 'Rôle Administrateur', description: 'Définir le rôle administrateur', value: 'admin_role' },
                        { label: 'Rôle Développeur', description: 'Définir le rôle développeur', value: 'dev_role' },
                        { label: 'Rôle Modérateur', description: 'Définir le rôle modérateur', value: 'mod_role' },
                        { label: 'Rôle Membre', description: 'Définir le rôle membre', value: 'member_role' },
                        { label: 'Salon Bienvenue', description: 'Configurez le salon de bienvenue', value: 'welcome_channel' },
                        { label: 'Salon Règlement', description: 'Configurez le salon pour le règlement', value: 'rules_channel' },
                        { label: 'Salon Radio', description: 'Configurez le salon pour la radio', value: 'radio_channel' },
                        { label: 'Salon Radio Audio', description: 'Configurez le salon audio pour la radio', value: 'radio_channel_audio' },
                        { label: 'Salon Level', description: 'Configurez le salon pour les niveaux', value: 'level_channel' },
                        { label: 'Salon Ticket', description: 'Configurez le salon ticket pour ce serveur', value: 'ticket_channel' },
                        { label: 'Salon Logs Raid', description: 'Configurez le salon pour les logs raids', value: 'logs_raid_channel' },
                        { label: 'Salon Logs Membre', description: 'Configurez le salon pour les logs membres', value: 'logs_member_channel' },
                        { label: 'Salon Logs Serveur', description: 'Configurez le salon pour les logs serveur', value: 'logs_server_channel' },
                        { label: 'Mettre fin à la configuration', description: 'La configuration sera donc fermée.', value: 'stop_configuration' },
                    ]);

                const actionRow = new ActionRowBuilder().addComponents(selectMenu);
                const message3 = await interaction.reply({ embeds: [createConfigEmbed()], components: [actionRow], fetchReply: true });

                // Filtre pour s'assurer que seuls l'utilisateur qui invoque la commande peut interagir
                const filter = i => i.customId === 'config-menu' && i.user.id === interaction.user.id;
                const collector = interaction.channel.createMessageComponentCollector({ filter, time: 240000 });

                let roleCollector;
                let channelCollector;
                collector.on('collect', async (menuInteraction) => {
                    try {
                        const selectedValue = menuInteraction.values[0];

                        switch (selectedValue) {
                            case 'stop_configuration':
                                collector.stop();
                            break;
                            case 'admin_role':
                            case 'dev_role':
                            case 'mod_role':
                            case 'member_role':
                                const roleDescriptions = {
                                    'admin_role': 'Administrateur',
                                    'dev_role': 'Développeur',
                                    'mod_role': 'Modérateur',
                                    'member_role': 'Membre'
                                };

                                // Récupérer tous les rôles modifiables
                                const filteredRoles = await interaction.guild.roles.fetch();

                                const roles = filteredRoles
                                    .filter(role => role.name !== '@everyone') // Filtrer les rôles éditables
                                    .map(role => ({
                                        label: role.name,
                                        value: role.id
                                    }));
                            
                                if (roles.length === 0) {
                                    await menuInteraction.reply({
                                        content: "Aucun rôle disponible à sélectionner.",
                                        ephemeral: true
                                    });
                                    console.log(roles)
                                    return;
                                }

                                // Pagination : découper les rôles par lots de 25
                                const chunkSize = 25;
                                const totalPages = Math.ceil(roles.length / chunkSize);
                                let currentPage = 0;

                                // Fonction pour récupérer les rôles de la page actuelle
                                const getCurrentRoles = (page) => roles.slice(page * chunkSize, (page + 1) * chunkSize);

                                // Fonction pour générer les boutons de navigation
                                const getButtons = (page) => new ActionRowBuilder().addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('prev-page')
                                        .setLabel('⬅️ Précédent')
                                        .setStyle(ButtonStyle.Primary)
                                        .setDisabled(page === 0),
                                    new ButtonBuilder()
                                        .setCustomId('next-page')
                                        .setLabel('➡️ Suivant')
                                        .setStyle(ButtonStyle.Primary)
                                        .setDisabled(page === totalPages - 1)
                                );

                                // Fonction pour envoyer le menu paginé
                                const sendMenu = async (page) => {
                                    const currentRoles = getCurrentRoles(page);

                                    if (currentRoles.length === 0) {
                                        throw new Error(`Page ${page} n'a pas de rôles valides.`);
                                    }

                                    const roleMenu = new StringSelectMenuBuilder()
                                        .setCustomId('role-select')
                                        .setPlaceholder(`Page ${page + 1}/${totalPages}`)
                                        .addOptions(currentRoles);

                                    const roleActionRow = new ActionRowBuilder().addComponents(roleMenu);
                                    const buttons = getButtons(page);

                                    await menuInteraction.editReply({
                                        content: `Sélectionnez le rôle pour ${roleDescriptions[selectedValue]}.`,
                                        components: [roleActionRow, buttons]
                                    });
                                };

                                // Initialiser l'interaction
                                await menuInteraction.reply({
                                    content: `Sélectionnez le rôle pour ${roleDescriptions[selectedValue]}.`,
                                    ephemeral: true
                                });

                                await sendMenu(currentPage);

                                // Collecteur pour gérer les interactions
                                const filter = (i) => i.user.id === menuInteraction.user.id;
                                const collector1 = menuInteraction.channel.createMessageComponentCollector({ filter, time: 120000 });

                                collector1.on('collect', async (interaction) => {
                                    if (interaction.customId === 'prev-page') {
                                        currentPage--;
                                        await sendMenu(currentPage);
                                        await interaction.deferUpdate();
                                    } else if (interaction.customId === 'next-page') {
                                        currentPage++;
                                        await sendMenu(currentPage);
                                        await interaction.deferUpdate();
                                    } else if (interaction.customId === 'role-select') {
                                        const selectedRole = interaction.values[0];

                                        // Sauvegarder le rôle dans le JSON
                                        configData[selectedValue] = selectedRole;
                                        fs.writeFileSync(filePath, JSON.stringify(configData, null, 4));

                                        await interaction.reply({
                                            content: `Rôle défini : <@&${selectedRole}>`,
                                            ephemeral: true
                                        });

                                        // Mettre à jour l'embed
                                        let configEmbed = createConfigEmbed();
                                        await message3.edit({ embeds: [configEmbed] });

                                        collector1.stop();
                                    }
                                });

                                collector1.on('end', async () => {
                                    await menuInteraction.deleteReply();
                                });

                                break;
                                case 'welcome_channel':
                                case 'rules_channel':
                                case 'radio_channel':
                                case 'radio_channel_audio':
                                case 'level_channel':
                                case 'ticket_channel':
                                case 'logs_raid_channel':
                                case 'logs_member_channel':
                                case 'logs_server_channel':
                                    const channelDescriptions2 = {
                                        'welcome_channel': 'Salon de bienvenue',
                                        'rules_channel': 'Salon des règles',
                                        'radio_channel': 'Salon radio',
                                        'radio_channel_audio': 'Salon audio radio',
                                        'level_channel': 'Salon de niveau',
                                        'ticket_channel': 'Salon ticket',
                                        'logs_raid_channel': 'Salon des logs Raid',
                                        'logs_member_channel': 'Salon des logs membres',
                                        'logs_server_channel': 'Salon des logs serveur'
                                    };

                                    // Récupérer tous les salons (textuels et vocaux)
                                    const filteredChannels2 = await interaction.guild.channels.fetch(); // Récupérer tous les salons

                                    const channels2 = filteredChannels2
                                        .filter(channel => channel.type === 0 || channel.type === 2) // Filtrer les salons textuels (type 0) et vocaux (type 2)
                                        .map(channel => ({
                                            label: channel.name,
                                            value: channel.id
                                        }));

                                    if (channels2.length === 0) {
                                        await menuInteraction.reply({
                                            content: "Aucun salon disponible à sélectionner.",
                                            ephemeral: true
                                        });
                                        return;
                                    }

                                    // Pagination : découper les salons par lots de 25
                                    const chunkSize2 = 25;
                                    const totalPages2 = Math.ceil(channels2.length / chunkSize2);
                                    let currentPage2 = 0;

                                    // Fonction pour récupérer les salons de la page actuelle
                                    const getCurrentChannels2 = (page) => channels2.slice(page * chunkSize2, (page + 1) * chunkSize2);

                                    // Fonction pour générer les boutons de navigation
                                    const getButtons2 = (page) => new ActionRowBuilder().addComponents(
                                        new ButtonBuilder()
                                            .setCustomId('prev-page')
                                            .setLabel('⬅️ Précédent')
                                            .setStyle(ButtonStyle.Primary)
                                            .setDisabled(page === 0),
                                        new ButtonBuilder()
                                            .setCustomId('next-page')
                                            .setLabel('➡️ Suivant')
                                            .setStyle(ButtonStyle.Primary)
                                            .setDisabled(page === totalPages2 - 1)
                                    );

                                    // Fonction pour envoyer le menu paginé
                                    const sendMenu2 = async (page) => {
                                        const currentChannels2 = getCurrentChannels2(page);

                                        if (currentChannels2.length === 0) {
                                            throw new Error(`Page ${page} n'a pas de salons valides.`);
                                        }

                                        const channelMenu2 = new StringSelectMenuBuilder()
                                            .setCustomId('channel-select')
                                            .setPlaceholder(`Page ${page + 1}/${totalPages2}`)
                                            .addOptions(currentChannels2);

                                        const channelActionRow2 = new ActionRowBuilder().addComponents(channelMenu2);
                                        const buttons2 = getButtons2(page);

                                        const menuInteractionPrepare = await menuInteraction.editReply({
                                            content: `Sélectionnez le salon pour ${channelDescriptions2[selectedValue]}.`,
                                            components: [channelActionRow2, buttons2]
                                        });
                                    };

                                    // Initialiser l'interaction
                                    const menuInteractionPrepare = await menuInteraction.reply({
                                        content: `Sélectionnez le salon pour ${channelDescriptions2[selectedValue]}.`,
                                        ephemeral: true
                                    });

                                    await sendMenu2(currentPage2);

                                    // Collecteur pour gérer les interactions
                                    const filter2 = (i) => i.user.id === menuInteraction.user.id;
                                    const collector2 = menuInteraction.channel.createMessageComponentCollector({ filter: filter2, time: 120000 });

                                    collector2.on('collect', async (interaction) => {
                                        if (interaction.customId === 'prev-page') {
                                            currentPage2--;
                                            await sendMenu2(currentPage2);
                                            await interaction.deferUpdate();
                                        } else if (interaction.customId === 'next-page') {
                                            currentPage2++;
                                            await sendMenu2(currentPage2);
                                            await interaction.deferUpdate();
                                        } else if (interaction.customId === 'channel-select') {
                                            const selectedChannel2 = interaction.values[0];

                                            // Sauvegarder le salon dans le JSON
                                            configData[selectedValue] = selectedChannel2;
                                            fs.writeFileSync(filePath, JSON.stringify(configData, null, 4));

                                            await interaction.reply({
                                                content: `Salon défini : <#${selectedChannel2}>`,
                                                ephemeral: true
                                            });

                                            // Mettre à jour l'embed
                                            let configEmbed2 = createConfigEmbed();
                                            await message3.edit({ embeds: [configEmbed2] });
                                            const channelId = configData[selectedValue.replace('role', 'channel')];
                                            if (channelId) {
                                                const channel = interaction.guild.channels.cache.get(channelId);
                                                if (channel) {
                                                    if(selectedValue === 'radio_channel'){
                                                        const client = this.client;
                                                        const channel = await client.channels.fetch(channelId);
                                                        if (channel && channel.type === ChannelType.GuildText) {
                                                            const pinnedMessages = await channel.messages.fetchPinned();
                                                            const existingMessage = pinnedMessages.first();
                                                            if (!existingMessage || !existingMessage.embeds.length) {
                                                                const radioURLs = {
                                                                    'NRJ': 'https://scdn.nrjaudio.fm/adwz2/fr/30001/mp3_128.mp3',
                                                                    'Skyrock': 'http://www.skyrock.fm/stream.php/tunein16_64mp3.mp3',
                                                                    'Fun Radio': 'http://streamer-02.rtl.fr/fun-1-44-64?listen=webCwsBCggNCQgLDQUGBAcGBg',
                                                                    'Chérie FM': 'https://scdn.nrjaudio.fm/adwz2/fr/30201/mp3_128.mp3',
                                                                    'SCHMIT FM': 'https://dl.sndup.net/tpn5k/MISTER%20V%20%20SCHMIT%20FM%20%201080p.mp3'
                                                                };
                                                                const serverName = interaction.guild.name;
                                                                const serverIcon = interaction.guild.iconURL({ dynamic: true, size: 128 });
                                                                const embed = new EmbedBuilder()
                                                                    .setColor(guildData.botColor || '#f40076')
                                                                    .setTitle('Radio.IO')
                                                                    .setDescription('*Sélectionnez une radio parmi les options ci-dessous pour commencer l’écoute.*')
                                                                    .setFooter({ text: serverName, iconURL: serverIcon });
                                                    
                                                                const buttons = Object.keys(radioURLs).map((radio, index) => {
                                                                    let style;
                                                    
                                                                    if (index < 2) {
                                                                        style = ButtonStyle.Primary;
                                                                    } else if (index === 2) {
                                                                        style = ButtonStyle.Primary;
                                                                    } else {
                                                                        style = ButtonStyle.Primary;
                                                                    }
                                                    
                                                                    return new ButtonBuilder()
                                                                        .setCustomId(radio)
                                                                        .setLabel(radio)
                                                                        .setStyle(style);
                                                                });
                                                                const embedMessage = await channel.send({ embeds: [embed], components: [{ type: 1, components: buttons }] });
                                                                await embedMessage.pin();
                                                            }
                                                        }
                                                    }else if (selectedValue === 'ticket_channel') {
                                                        const client = this.client;
                                                        const ticketChannel = client.channels.cache.get(channelId);
                                                    
                                                        if (!ticketChannel) {
                                                            console.log('Le canal de ticket est introuvable.');
                                                            return;
                                                        }
                                                    
                                                        const guild = ticketChannel.guild;
                                                    
                                                        console.log(guild);  // Vérifier l'objet guild
                                                    
                                                        if (!guild) {
                                                            console.log('Guilde non trouvée.');
                                                            return;
                                                        }
                                                    
                                                        try {
                                                            // Forcer la récupération des canaux pour être sûr que le cache est à jour
                                                            await guild.channels.fetch();
                                                    
                                                            // Filtrer les catégories parmi tous les canaux
                                                            const categories = guild.channels.cache.filter(c => c.type === 4);
                                                            console.log(categories);  // Afficher les catégories
                                                            console.log(categories.map(c => `${c.name} - Type: ${c.type}`));
                                                    
                                                            if (categories.size === 0) {
                                                                console.log('Aucune catégorie disponible dans le serveur.');
                                                                return;
                                                            }
                                                    
                                                            // Vérifier et construire les options
                                                            const categoryOptions = categories.map(c => {
                                                                // Vérifier que les propriétés label et value existent
                                                                if (!c.name || !c.id) {
                                                                    console.log(`Catégorie invalide : ${c.id} - ${c.name}`);
                                                                    return null; // Ignore la catégorie invalide
                                                                }
                                                    
                                                                return {
                                                                    label: c.name,
                                                                    value: c.id
                                                                };
                                                            }).filter(option => option !== null);  // Supprimer les éléments null
                                                    
                                                            console.log(categoryOptions);  // Afficher les options avant de les ajouter
                                                    
                                                            if (categoryOptions.length === 0) {
                                                                console.log('Aucune catégorie valide à ajouter.');
                                                                return;
                                                            }
                                                    
                                                            const selectMenu = new StringSelectMenuBuilder()
                                                                .setCustomId('ticketCategorySelect')
                                                                .setPlaceholder('Choisissez une catégorie')
                                                                .addOptions(categoryOptions)
                                                                .setMinValues(1)
                                                                .setMaxValues(1);
                                                    
                                                            const row = new ActionRowBuilder().addComponents(selectMenu);
                                                    
                                                            // Envoyer le menu déroulant dans le salon de l'interaction initiale
                                                            const message = await interaction.editReply({
                                                                content: 'Veuillez choisir dans quelle catégorie vous souhaitez créer un ticket :',
                                                                components: [row],
                                                                ephemeral: true
                                                            });
                                                        
                                                            // Capture de la réponse de l'utilisateur
                                                            const filter = i => i.customId === 'ticketCategorySelect' && i.user.id === interaction.user.id;  // Utilisation de interaction.user.id
                                                        
                                                            const collector5 = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
                                                        
                                                            collector5.on('collect', async (interaction) => {
                                                                const selectedCategoryId = interaction.values[0];
                                                                console.log(`Catégorie sélectionnée : ${selectedCategoryId}`);
                                                            
                                                                // Sauvegarder cette configuration dans le JSON de la guilde
                                                                const guildData = await loadGuildData(path.join(__dirname, '../../../guilds-data', `${ticketChannel.guild.id}.json`));
                                                                guildData.ticket_category = selectedCategoryId;
                                                            
                                                                const ticketSendChannel = interaction.guild.channels.cache.get(guildData.ticket_channel);
                                                                const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
                                                                await saveGuildData(filePath, guildData);
                                                            
                                                                // Créer l'embed du ticket après la sélection
                                                                const embed = new EmbedBuilder()
                                                                    .setTitle('Vous allez ouvrir un ticket ! 🦺')
                                                                    .setDescription(`# Besoin d'assistance ? \n **Cliquez sur:** \`\`📨 Ouvrir un ticket\`\` \n\n **Tous abus sera sanctionné, évitez d'ouvrir un ticket sans raison valable.** ⛔ \n\n *Vous pouvez utilisez* \`\`/signalement\`\` *pour effectuer un signalement !Les signalements sont envoyés aux staffs !* 📨`)
                                                                    .setColor(guildData.botColor || '#f40076');
                                                            
                                                                const row = new ActionRowBuilder().addComponents(
                                                                    new ButtonBuilder()
                                                                        .setCustomId('openTicket')
                                                                        .setLabel('📨 Ouvrir un ticket')
                                                                        .setStyle(ButtonStyle.Success)
                                                                );
                                                                await ticketSendChannel.send({ embeds: [embed], components: [row] });
                                                            
                                                                // Supprimer le menu déroulant en mettant à jour le message
                                                                await interaction.update({
                                                                    content: 'Catégorie sélectionnée avec succès ! ✅',
                                                                    components: [] // Retire tous les composants
                                                                });
                                                            
                                                                collector5.stop();
                                                            });
                                                            
                                                            collector5.on('end', (collected, reason) => {
                                                                if (reason === 'time') {
                                                                    // Mettre à jour le message pour retirer les composants si le temps est écoulé
                                                                    interaction.editReply({
                                                                        content: 'Temps écoulé pour sélectionner une catégorie.',
                                                                        components: []
                                                                    });
                                                                }
                                                            });                                                            
                                                        } catch (error) {
                                                            console.error('Erreur lors du chargement des canaux:', error);
                                                        }
                                                        
                                                    }else{
                                                        const guildData = loadGuildData(filePath);
                                                        const embed = new EmbedBuilder()
                                                            .setColor(guildData.botColor || '#f40076')
                                                            .setTitle('Configuration mise à jour')
                                                            .setDescription(
                                                                `🛠️ **Salon configuré :** <#${channelId}>\n\n` +
                                                                `✅ Le salon **${selectedValue.replace('_', ' ')}** a été configuré avec succès.\n\n` +
                                                                `Pour toute modification, utilisez la commande \`/config\`.`
                                                            )
                                                            .setThumbnail(interaction.guild.iconURL({ dynamic: true })) // Ajout d'une miniature du serveur
                                                            .setTimestamp()
                                                            .setFooter({ text: 'Paramètres mis à jour', iconURL: interaction.client.user.displayAvatarURL() }); // Ajout d'une icône de bot au footer

                                                        const channel = interaction.guild.channels.cache.get(channelId);
                                                        if (channel) {
                                                            await channel.send({ embeds: [embed] });
                                                        }
                                                    }
                                                }
                                            }
                                            await menuInteractionPrepare.delete();
                                            collector2.stop();
                                        }
                                    });

                                    collector2.on('end', async () => {
                                        // await menuInteraction.deleteReply();
                                    });

                                    break;
                            default:
                                console.log('Option non reconnue.');
                        }
                    } catch (error) {
                        console.error('Erreur en réponse à l’interaction :', error);
                    }
                });

                collector.on('end', async (_, reason) => {
                    console.log(`Le collector s'est terminé pour la raison : ${reason}`);

                    try {
                        if (message3 && message3.delete) await message3.delete();
                        if (roleCollector && !roleCollector.ended) roleCollector.stop();
                        if (channelCollector && !channelCollector.ended) channelCollector.stop();
                    } catch (err) {
                        console.error('Erreur lors de la suppression du message ou du collector :', err);
                    }
                });
            } catch (err) {
                console.error('Erreur lors de la commande config général :', err);
            }
        }
    };
