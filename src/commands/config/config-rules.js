const { 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    EmbedBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const loadGuildData = (guildPath) => {
    try {
        if (fs.existsSync(guildPath)) {
            return JSON.parse(fs.readFileSync(guildPath, 'utf8'));
        }
    } catch (error) {
        console.error(`Erreur lors du chargement des données : ${error.message}`);
    }
    return {};
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
        name: 'config-règlement',
        description: 'Configurer le règlement sur le serveur.',
    },
    async execute(interaction) {
        const client = this.client;
        const guildId = interaction.guild.id;
        const guildPath = path.resolve(`./guilds-data/${guildId}.json`);
        const guildData = loadGuildData(guildPath);

        // Vérification de l'existence de rules.channel
        const rulesChannel = guildData.rules_channel || null;
        const reactRole = guildData.rules?.reactRole || null;
        const rulesExist = guildData.rules && guildData.rules.title;

        // Embed initial
        const embedConfigurationRules = new EmbedBuilder()
            .setTitle("⚙️ Configuration du Règlement")
            .setColor(rulesChannel ? "#f40076" : "#FF0000")
            .setDescription(
                `**Configurez le règlement de votre serveur !**\n\n` +
                `*Modifier le règlement pour l'adapter à votre serveur. 📝*\n` +
                `*Bouton règlement facultatif qui permet de donner un rôle défini à l'utilisateur.*\n\n` +
                `\`\`Etape 1: ${rulesExist ? "Modifier votre règlement" : "Créer votre règlement"}\`\`\n` +
                `\`\`Etape 2: Ajouter votre bouton de validation (Facultatif)\`\``
            )  
            .addFields(
                { 
                    name: "Rôle de Réaction", 
                    value: reactRole ? `🟢 <@&${reactRole}>` : "🔴 Désactivé/Non configuré", 
                    inline: true 
                },
                { 
                    name: "Statut du salon règlement", 
                    value: rulesChannel ? "🟢 Salon Règlement trouvé !" : "🔴 Salon Règlement non trouvé !", 
                    inline: true 
                }
            )
            .setFooter({ text: "Modifiez la configuration via le menu ci-dessous." })
            .setTimestamp();

        if (!rulesChannel) {
            embedConfigurationRules.addFields({
                name: "Erreur",
                value: "Veuillez configurer un salon pour le règlement avant de continuer. -> ``/config``"
            });
        }
        // Menu déroulant
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('rules-menu')
            .setPlaceholder('Choisissez une action')
            .addOptions([
                {
                    label: rulesExist ? "Modifier le règlement" : "Etape 1: Créer le règlement",
                    value: "edit-rules",
                    description: "Configurer le contenu du règlement",
                    emoji: "✍️"
                },
                rulesExist ? {
                    label: "Supprimer le règlement",
                    value: "suppr-rules",
                    description: "Supprimer le règlement",
                    emoji: "🗑️"
                } : null,
                rulesExist ? null : {
                    label: "Règlement par défault",
                    value: "default-rules",
                    description: "Génèrer un règlement par défault",
                    emoji: "💾"
                },
                {
                    label: "Etape 2: Activer/Désactiver le rôle de validation",
                    value: "toggle-react-role",
                    description: "Gérer le rôle de validation du règlement",
                    emoji: "✅"
                },
                {
                    label: "Mettre fin à la configuration",
                    value: "end-config",
                    description: "Mettre fin à la configuration du règlement",
                    emoji: "0️⃣"
                },
            ].filter(option => option !== null));

        const actionRow = new ActionRowBuilder().addComponents(selectMenu);

        // Réponse initiale
        await interaction.reply({
            embeds: [embedConfigurationRules],
            components: rulesChannel ? [actionRow] : []
        });

        // Gestion des interactions
        const filter = (i) => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 1800000 });

        collector.on('collect', async (menuInteraction) => {
            const guildData = loadGuildData(guildPath);
            if (menuInteraction.customId === 'rules-menu') {
                const value = menuInteraction.values[0];

                if (value === "toggle-react-role") {
                    // Recharger les données du fichier JSON à chaque interaction
                    const guildPath = `./guilds-data/${interaction.guild.id}.json`;
                    const guildData = JSON.parse(fs.readFileSync(guildPath, 'utf-8'));
                
                    const rulesChannelId = guildData.rules_channel;
                
                    if (!rulesChannelId) {
                        return menuInteraction.reply({
                            content: "Aucun salon de règlement n'est configuré. Veuillez en configurer un avant de continuer.",
                            ephemeral: true
                        });
                    }
                
                    const rulesChannel = interaction.guild.channels.cache.get(rulesChannelId);
                
                    if (!rulesChannel) {
                        return menuInteraction.reply({
                            content: "Le salon configuré pour le règlement est introuvable. Veuillez vérifier la configuration.",
                            ephemeral: true
                        });
                    }
                    
                    if (guildData.rules && guildData.rules.reactRole) {
                        const guildData2 = loadGuildData(guildPath);
                        delete guildData2.rules.reactRole;
                        fs.writeFileSync(guildPath, JSON.stringify(guildData2, null, 4));
                
                        // Supprimer les messages contenant le bouton dans le salon des règles
                        const messages = await rulesChannel.messages.fetch({ limit: 100 });
                        const buttonMessage = messages.find(msg => msg.components.length > 0);
                        if (buttonMessage) {
                            await buttonMessage.delete().catch(() => {});
                        }
                        const guildData = JSON.parse(fs.readFileSync(guildPath, 'utf-8'));
                        const reactRole = guildData.rules && guildData.rules.reactRole ? guildData.rules.reactRole : null;
                        embedConfigurationRules.setFields(
                            { 
                                name: "📋 Rôle de Réaction", 
                                value: reactRole ? `🟢 <@&${reactRole}>` : "🔴 Désactivé/Non configuré", 
                                inline: true 
                            },
                            { 
                                name: "📌 Statut du salon règlement", 
                                value: rulesChannel ? "🟢 Salon Règlement trouvé !" : "🔴 Salon Règlement non trouvé !", 
                                inline: true 
                            }
                        )
                
                        await interaction.editReply({
                            embeds: [embedConfigurationRules],
                            components: [actionRow]
                        });
                
                        return menuInteraction.reply({
                            content: "Le rôle de validation a été désactivé, et le bouton a été supprimé.",
                            ephemeral: true
                        });
                    } else {
                        const allRoles = Array.from(
                            interaction.guild.roles.cache
                                .filter(role => role.name !== "@everyone")
                                .values()
                        );
                        
                        const rolesPerPage = 15;
                        let currentPage = 0;
                        
                        // Fonction pour obtenir les rôles pour une page spécifique
                        const getPaginatedRoles = (page) => {
                            const start = page * rolesPerPage;
                            const end = start + rolesPerPage;
                            return allRoles.slice(start, end).map(role => ({
                                label: role.name,
                                value: role.id,
                            }));
                        };
                        
                        // Création des options de menu pour la première page
                        const roleOptions = getPaginatedRoles(currentPage);
                        
                        const roleSelectMenu = new StringSelectMenuBuilder()
                            .setCustomId('select-react-role')
                            .setPlaceholder('Choisissez un rôle...')
                            .addOptions(roleOptions);
                        
                        const actionRowRoleReact = new ActionRowBuilder().addComponents(roleSelectMenu);
                        
                        // Création des boutons de pagination
                        const navigationButtons = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('previous-page')
                                .setLabel('Précédent')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(currentPage === 0),
                            new ButtonBuilder()
                                .setCustomId('next-page')
                                .setLabel('Suivant')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(allRoles.length <= rolesPerPage)
                        );
                        
                        // Envoi du message initial avec le menu et les boutons
                        await menuInteraction.reply({
                            content: "Veuillez sélectionner le rôle à utiliser pour la validation du règlement.",
                            components: [actionRowRoleReact, navigationButtons],
                            ephemeral: true,
                        });
                        
                        // Création d'un collecteur pour les interactions
                        const roleCollector = menuInteraction.channel.createMessageComponentCollector({
                            filter: i =>
                                ['select-react-role', 'previous-page', 'next-page'].includes(i.customId) &&
                                i.user.id === interaction.user.id,
                            time: 60000,
                        });
                        roleCollector.on('collect', async (i) => {
                            if (i.customId === 'select-react-role') {
                                const guildDataUpdated = JSON.parse(fs.readFileSync(guildPath, 'utf-8'));
                                const selectedRoleId = i.values[0];

                                // Assure-toi que l'objet `rules` existe
                                if (!guildDataUpdated.rules) {
                                    guildDataUpdated.rules = {};
                                }

                                // Configure le rôle de validation
                                guildDataUpdated.rules.reactRole = selectedRoleId;

                                // Sauvegarde des données dans le fichier JSON
                                fs.writeFileSync(guildPath, JSON.stringify(guildDataUpdated, null, 4));

                                await i.update({
                                    content: `✅ Le rôle <@&${selectedRoleId}> a été configuré pour la validation.`,
                                    components: []
                                });

                    
                                // Ajouter le bouton dans le salon des règles
                                const button = new ButtonBuilder()
                                    .setCustomId('accept-rules')
                                    .setLabel('Valider le règlement')
                                    .setStyle(ButtonStyle.Success);
                    
                                const actionRowRules = new ActionRowBuilder().addComponents(button);
                    
                                await rulesChannel.send({
                                    components: [actionRowRules]
                                });
                                const guildData = JSON.parse(fs.readFileSync(guildPath, 'utf-8'));
                                const reactRole = guildData.rules && guildData.rules.reactRole ? guildData.rules.reactRole : null;
                                embedConfigurationRules.setFields(
                                    { 
                                        name: "📋 Rôle de Réaction", 
                                        value: reactRole ? `🟢 <@&${reactRole}>` : "🔴 Désactivé/Non configuré", 
                                        inline: true 
                                    },
                                    { 
                                        name: "📌 Statut du salon règlement", 
                                        value: rulesChannel ? "🟢 Salon Règlement trouvé !" : "🔴 Salon Règlement non trouvé !", 
                                        inline: true 
                                    }
                                )
                    
                                await interaction.editReply({
                                    embeds: [embedConfigurationRules],
                                    components: [actionRow]
                                });
                    
                                menuInteraction.followUp({
                                    content: `Le bouton "Valider le règlement" a été ajouté dans <#${rulesChannelId}>.`,
                                    ephemeral: true
                                });
                                collector.stop(); // Arrête le collecteur après la sélection
                            } else if (i.customId === 'previous-page') {
                                // Page précédente
                                currentPage = Math.max(0, currentPage - 1);
                            } else if (i.customId === 'next-page') {
                                // Page suivante
                                currentPage = Math.min(
                                    Math.ceil(allRoles.length / rolesPerPage) - 1,
                                    currentPage + 1
                                );
                            }
                        
                            // Mise à jour des options du menu déroulant
                            const updatedOptions = getPaginatedRoles(currentPage);
                            roleSelectMenu.setOptions(updatedOptions);
                        
                            // Mise à jour des boutons
                            navigationButtons.components[0].setDisabled(currentPage === 0);
                            navigationButtons.components[1].setDisabled(currentPage === Math.ceil(allRoles.length / rolesPerPage) - 1);
                        
                            // Met à jour le message avec les nouvelles options
                            await i.update({
                                components: [new ActionRowBuilder().addComponents(roleSelectMenu), navigationButtons],
                            });
                        });
                
                        roleCollector.on('end', (_, reason) => {
                            if (reason === 'time') {
                                menuInteraction.editReply({
                                    content: "Temps écoulé pour sélectionner un rôle.",
                                    components: []
                                });
                            }
                        });
                    }
                } else if (value === "edit-rules") {
                    const guildId = interaction.guild.id;
                    const guildDataPath = `./guilds-data/${guildId}.json`;
                    const guildData = loadGuildData(guildDataPath);
                    if(!guildData.rules) {
                        guildData.rules = {
                            title: "Titre par défaut",
                            description: "Une description par défaut."
                        };
                    }
                
                    const modal = new ModalBuilder()
                        .setCustomId('edit-rules-modal')
                        .setTitle("Configurer les règles");
                
                    const titleInput = new TextInputBuilder()
                        .setCustomId('rules-title')
                        .setLabel("Titre des règles")
                        .setStyle(TextInputStyle.Short)
                        .setValue(guildData.rules.title);
                
                    const descriptionInput = new TextInputBuilder()
                        .setCustomId('rules-description')
                        .setLabel("Description des règles")
                        .setStyle(TextInputStyle.Paragraph)
                        .setValue(guildData.rules.description);
                
                    const row1 = new ActionRowBuilder().addComponents(titleInput);
                    const row2 = new ActionRowBuilder().addComponents(descriptionInput);
                
                    modal.addComponents(row1, row2);
                
                    await menuInteraction.showModal(modal);
                } else if (value === "suppr-rules") {
                    const guildData = loadGuildData(guildPath);
                
                    if (!guildData.rules_channel || !guildData.rules) {
                        if (!interaction.replied && !interaction.deferred) {
                            return interaction.reply("Il n'y a pas de règles à supprimer.");
                        }
                        return;
                    }
                    try {
                        const rulesChannel = interaction.guild.channels.cache.get(guildData.rules_channel);
                        if (rulesChannel) {
                            const messages = await rulesChannel.messages.fetch({ limit: 100 });
                        
                            for (const msg of messages.values()) {
                                if (msg.embeds.length > 0 && msg.embeds[0].title === guildData.rules.title) {
                                    await msg.delete();
                                    console.log("Embed des règles supprimé.");
                                }
                                if (msg.components.length > 0) {
                                    await msg.delete();
                                }
                            }
                        
                            // Vérifier si les règles existent avant de les supprimer
                            if (guildData.rules) {
                                guildData.rules = null; // Remplacer par null au lieu de supprimer
                                saveGuildData(guildPath, guildData);
                                console.log("Les règles ont été supprimées du fichier guildData.");
                            } else {
                                console.log("Aucune règle à supprimer dans guildData.");
                            }
                        
                            // Sauvegarder les données mises à jour dans le fichier JSON
                        
                            // Répondre à l'utilisateur pour confirmer la suppression
                            if (!interaction.replied && !interaction.deferred) {
                                interaction.reply("Les règles ont bien été supprimées.");
                            }
                            collector.stop();
                        } else {
                            console.log("Le salon des règles est introuvable.");
                        }                        
                    } catch (err) {
                        console.error(err);
                
                        if (!interaction.replied && !interaction.deferred) {
                            interaction.reply(`Impossible de supprimer les règles : ${err.message}`);
                        }
                    }
                } else if (value === "default-rules") {
                    const guildId = interaction.guild.id;
                    let descriptionDefault = ` # Règlement du Serveur
                *Bienvenue sur notre serveur Discord ! Pour garantir un environnement sûr et agréable pour tous les membres, nous vous demandons de bien vouloir respecter scrupuleusement les règles suivantes. Toute infraction pourra entraîner des sanctions allant de l'avertissement à l'exclusion définitive, en fonction de la gravité des faits.*
                
                ## 1. Respect et courtoisie ❤️
                > **Le respect est obligatoire.** *Traitez tous les membres avec courtoisie et bienveillance. Les insultes, attaques personnelles, discriminations, harcèlement ou comportements haineux ne seront pas tolérés.*
                > *Aucun commentaire raciste, sexiste, homophobe, transphobe, ou discriminatoire ne sera accepté.*
                
                ## 2. Comportement toxique ☣️
                > **Le comportement toxique** *(provocations, mise en cause de membres, trolling, etc.) est interdit. Cela inclut également le* **spamming** *(envoi répétitif de messages) et l’utilisation de* **langage excessivement vulgaire.**
                > **Les conflits doivent être résolus en privé**, *ne créez pas de drama dans les canaux publics.*
                
                ## 3. Contenu inapproprié 📂
                > *Ne partagez aucun contenu* **illégal, choquant, explicitement sexuel ou violent.** *Les images et vidéos à caractère explicite ou inapproprié seront immédiatement supprimées.*
                > *Le* **NSFW** *(Not Safe For Work) est* **strictement interdit** *sauf dans les zones spécifiquement dédiées, et sous certaines conditions clairement établies.*
                
                ## 4. Publicité et spam 💬
                > **La publicité non autorisée est interdite.** *Cela inclut l’envoi de liens vers des sites externes, des serveurs Discord ou des produits sans autorisation préalable.*
                > **Le spam de messages** *(y compris les emojis ou caractères répétés) est interdit.*
                
                ## 5. Respect des canaux 💻
                > *Utilisez les* **canaux appropriés** *pour chaque sujet. Ne mélangez pas les discussions (exemple : ne parlez pas de musique dans un canal dédié aux jeux vidéo).*
                > **Ne postez pas de contenu hors sujet** *dans des canaux spécifiques (exemple : pas de discussions de politique dans un canal général).*
                
                ## 6. Respect de la vie privée 👀
                > **Ne partagez pas d'informations personnelles** *(vos propres informations ou celles des autres) sans consentement explicite. Cela inclut les adresses, numéros de téléphone, ou toute autre donnée privée.*
                > **Les photos d’autres membres**, *sans leur consentement, sont interdites. Si vous postez des photos, elles doivent être appropriées et respecter les autres membres.*
                
                ## 7. Comportement vis-à-vis des modérateurs 📏
                > *Les* **modérateurs** *sont là pour assurer le bon fonctionnement du serveur. Respectez leurs décisions, ils sont habilités à appliquer les règles. En cas de désaccord, contactez un modérateur ou admin en privé.*
                > *Les* **abusions** *envers les modérateurs ou administrateurs (insultes, menaces, harcèlement, ping, MP abusif) entraîneront des sanctions sévères.*
                
                ## 8. Interdiction des bots ou des programmes tiers 💾
                > *L’utilisation de* **bots non autorisés** *ou de tout programme qui enfreint les règles du serveur (cheat, hack, bots automatisés) est formellement interdite.*
                
                ## 9. Sanctions ⛔
                > *Toute violation des règles entraînera une sanction qui peut varier selon la gravité de l'infraction. Les sanctions peuvent aller de* **l’avertissement, à un mute temporaire, à un ban temporaire ou à un ban permanent.**`;
                    const guildDataPath = `./guilds-data/${guildId}.json`;
                    const guildData = loadGuildData(guildDataPath);
                    const rulesEmbed = new EmbedBuilder()
                        .setTitle("Règles du serveur Discord 👐")
                        .setDescription(descriptionDefault)
                        .setColor(guildData.botColor || '#f40076');
                    if (!guildData.rules) {
                        guildData.rules = {
                            title: '',
                            description: ''
                        };
                    }
                    guildData.rules = {
                        title: "Règles du serveur Discord 👐",
                        description: descriptionDefault,
                    };
                
                    // Sauvegarder les données dans le fichier JSON
                    saveGuildData(guildDataPath, guildData);
                    // Répondre avec l'embed dans le salon
                    if (guildData.rules_channel) {
                        const rulesChannelId = guildData.rules_channel;
                        const rulesChannel = interaction.guild.channels.cache.get(rulesChannelId);
                    
                        if (rulesChannel) {
                            rulesChannel.send({ embeds: [rulesEmbed] });
                        } else {
                            interaction.channel.send("Le salon des règles n'a pas été trouvé. L'embed sera envoyé ici.");
                            interaction.channel.send({ embeds: [rulesEmbed] });
                        }
                    } else {
                        interaction.channel.send({ embeds: [rulesEmbed] });
                    }                    
                    collector.stop();
                } else if (value === "end-config") {
                    collector.stop()
                }              
                client.on('interactionCreate', async interaction => {
                    if (interaction.customId === 'edit-rules-modal') {
                        const title = interaction.fields.getTextInputValue('rules-title');
                        const description = interaction.fields.getTextInputValue('rules-description');
                        const guildId = interaction.guild.id;
                        const guildDataPath = `./guilds-data/${guildId}.json`;
                        
                        // Chargement des données existantes de la guild
                        const guildData = loadGuildData(guildDataPath);
                
                        // Initialisation des règles si elles n'existent pas
                        if (!guildData.rules) {
                            guildData.rules = {
                                title: '',
                                description: ''
                            };
                        }
                
                        // Mise à jour des champs existants ou ajout des nouveaux champs
                        if (title) guildData.rules.title = title;
                        if (description) guildData.rules.description = description;
                        // Sauvegarde des données mises à jour
                        saveGuildData(guildDataPath, guildData);
                
                        // Envoi des règles dans le salon configuré
                        const channel = interaction.guild.channels.cache.get(guildData.rules_channel);
                
                        if (channel) {
                            const messages = await channel.messages.fetch({ limit: 100 });
                            for (const message of messages.values()) {
                                if (message.embeds.length > 0 || message.components.length > 0) {
                                    await message.delete();
                                }
                                if (msg.components.length > 0) {
                                    await msg.delete();
                                }
                            }
                            const embed = new EmbedBuilder()
                                .setTitle(guildData.rules.title)
                                .setDescription(guildData.rules.description)
                                .setColor(guildData.botColor || '#f40076')
                            await channel.send({ embeds: [embed] });
                        }
                
                        // Réponse à l'interaction
                        await interaction.reply({
                            content: "**Les règles ont été mises à jour avec succès !**",
                            ephemeral: true
                        });
                        collector.stop();
                    }
                });      
            }
        });

        collector.on('end', async () => {
            try {
                // Suppression sécurisée du message d'interaction si possible
                if (interaction.replied || interaction.deferred) {
                    try {
                        await interaction.deleteReply();
                    } catch (err) {
                        console.error("Erreur lors de la suppression du message d'interaction : ", err);
                    }
                }
            } catch (e) {
                console.error("Erreur dans le collecteur 'end' : ", e);
            }
        });        
    }
};
