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

// Fonction pour charger les données de la guilde
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

// Fonction pour sauvegarder les données de la guilde
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

        // Vérification des données existantes
        const rulesChannel = guildData.rules_channel || null;
        const reactRole = guildData.rules?.reactRole || null;
        const rulesExist = guildData.rules && guildData.rules.title;

        // Création de l'embed de configuration
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
            .setFooter({ text: "Modifiez la configuration via le menu ci-dessous." })
            .setTimestamp();

        // Ajout d'un champ d'erreur si pas de salon configuré
        if (!rulesChannel) {
            embedConfigurationRules.addFields({
                name: "⚠️ Erreur",
                value: "Veuillez configurer un salon pour le règlement avant de continuer. -> ``/config``"
            });
        }

        // Création du menu de sélection
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
                    label: "Règlement par défaut",
                    value: "default-rules",
                    description: "Générer un règlement par défaut",
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

        // Envoi du message initial
        await interaction.reply({
            embeds: [embedConfigurationRules],
            components: rulesChannel ? [actionRow] : []
        });

        // Gestionnaire pour le modal des règles
        const handleRulesModal = async (modalInteraction) => {
            if (!modalInteraction.isModalSubmit()) return;
            if (modalInteraction.customId !== 'edit-rules-modal') return;

            const title = modalInteraction.fields.getTextInputValue('rules-title');
            const description = modalInteraction.fields.getTextInputValue('rules-description');
            const modalGuildId = modalInteraction.guild.id;
            const modalGuildPath = path.resolve(`./guilds-data/${modalGuildId}.json`);
            
            const modalGuildData = loadGuildData(modalGuildPath);
            if (!modalGuildData.rules) modalGuildData.rules = {};
            
            modalGuildData.rules.title = title;
            modalGuildData.rules.description = description;
            
            saveGuildData(modalGuildPath, modalGuildData);

            // Mise à jour du salon des règles
            const rulesChannel = modalInteraction.guild.channels.cache.get(modalGuildData.rules_channel);
            if (rulesChannel) {
                // Suppression des anciens messages
                const messages = await rulesChannel.messages.fetch({ limit: 100 });
                for (const message of messages.values()) {
                    if (message.embeds.length > 0 || message.components.length > 0) {
                        await message.delete().catch(console.error);
                    }
                }

                // Envoi du nouvel embed
                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(description)
                    .setColor(modalGuildData.botColor || '#f40076');

                await rulesChannel.send({ embeds: [embed] });
            }

            await modalInteraction.reply({
                content: "**✅ Les règles ont été mises à jour avec succès !**",
                ephemeral: true
            });
        };

        // Ajout du gestionnaire d'événements pour le modal
        client.on('interactionCreate', handleRulesModal);

        // Gestionnaire des interactions du menu
        const collector = interaction.channel.createMessageComponentCollector({ 
            filter: i => i.user.id === interaction.user.id,
            time: 1800000 
        });

        collector.on('collect', async (menuInteraction) => {
            if (menuInteraction.customId !== 'rules-menu') return;
            
            const value = menuInteraction.values[0];
            
            switch (value) {
                case "edit-rules":
                    const modal = new ModalBuilder()
                        .setCustomId('edit-rules-modal')
                        .setTitle("Configurer les règles");

                    const titleInput = new TextInputBuilder()
                        .setCustomId('rules-title')
                        .setLabel("Titre des règles")
                        .setStyle(TextInputStyle.Short)
                        .setValue(guildData.rules?.title || "");

                    const descriptionInput = new TextInputBuilder()
                        .setCustomId('rules-description')
                        .setLabel("Description des règles")
                        .setStyle(TextInputStyle.Paragraph)
                        .setValue(guildData.rules?.description || "");

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(titleInput),
                        new ActionRowBuilder().addComponents(descriptionInput)
                    );

                    await menuInteraction.showModal(modal);
                    break;

                case "toggle-react-role":
                    const currentGuildData = loadGuildData(guildPath);
                    
                    if (!currentGuildData.rules_channel) {
                        await menuInteraction.reply({
                            content: "⚠️ Aucun salon de règlement n'est configuré. Veuillez en configurer un avant de continuer.",
                            ephemeral: true
                        });
                        return;
                    }

                    const currentRulesChannel = interaction.guild.channels.cache.get(currentGuildData.rules_channel);
                    if (!currentRulesChannel) {
                        await menuInteraction.reply({
                            content: "⚠️ Le salon configuré pour le règlement est introuvable. Veuillez vérifier la configuration.",
                            ephemeral: true
                        });
                        return;
                    }

                    if (currentGuildData.rules?.reactRole) {
                        // Désactivation du rôle de réaction
                        delete currentGuildData.rules.reactRole;
                        saveGuildData(guildPath, currentGuildData);

                        // Suppression du bouton
                        const messages = await currentRulesChannel.messages.fetch({ limit: 100 });
                        const buttonMessage = messages.find(msg => msg.components.length > 0);
                        if (buttonMessage) await buttonMessage.delete().catch(() => {});

                        await menuInteraction.reply({
                            content: "✅ Le rôle de validation a été désactivé et le bouton a été supprimé.",
                            ephemeral: true
                        });
                    } else {
                        // Activation du rôle de réaction
                        const roles = Array.from(
                            interaction.guild.roles.cache
                                .filter(role => role.name !== "@everyone")
                                .values()
                        );

                        const rolesPerPage = 15;
                        const roleOptions = roles.slice(0, rolesPerPage).map(role => ({
                            label: role.name,
                            value: role.id
                        }));

                        const roleSelectMenu = new StringSelectMenuBuilder()
                            .setCustomId('select-react-role')
                            .setPlaceholder('Choisissez un rôle...')
                            .addOptions(roleOptions);

                        const navigationButtons = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('previous-page')
                                .setLabel('Précédent')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('next-page')
                                .setLabel('Suivant')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(roles.length <= rolesPerPage)
                        );

                        await menuInteraction.reply({
                            content: "Veuillez sélectionner le rôle à utiliser pour la validation du règlement.",
                            components: [
                                new ActionRowBuilder().addComponents(roleSelectMenu),
                                navigationButtons
                            ],
                            ephemeral: true
                        });

                        // Gestionnaire pour la sélection du rôle
                        const roleCollector = menuInteraction.channel.createMessageComponentCollector({
                            filter: i => i.user.id === interaction.user.id,
                            time: 60000
                        });

                        let currentPage = 0;

                        roleCollector.on('collect', async (i) => {
                            if (i.customId === 'select-react-role') {
                                const selectedRoleId = i.values[0];
                                currentGuildData.rules = currentGuildData.rules || {};
                                currentGuildData.rules.reactRole = selectedRoleId;
                                saveGuildData(guildPath, currentGuildData);

                                // Ajout du bouton de validation
                                const button = new ButtonBuilder()
                                    .setCustomId('accept-rules')
                                    .setLabel('Valider le règlement')
                                    .setStyle(ButtonStyle.Success);

                                await currentRulesChannel.send({
                                    components: [new ActionRowBuilder().addComponents(button)]
                                });

                                await i.update({
                                    content: `✅ Le rôle <@&${selectedRoleId}> a été configuré pour la validation.`,
                                    components: []
                                });

                                roleCollector.stop();
                            } else if (i.customId === 'previous-page' || i.customId === 'next-page') {
                                currentPage = i.customId === 'previous-page' 
                                    ? Math.max(0, currentPage - 1)
                                    : Math.min(Math.floor(roles.length / rolesPerPage), currentPage + 1);

                                const newOptions = roles
                                    .slice(currentPage * rolesPerPage, (currentPage + 1) * rolesPerPage)
                                    .map(role => ({
                                        label: role.name,
                                        value: role.id
                                    }));

                                roleSelectMenu.setOptions(newOptions);
                                navigationButtons.components[0].setDisabled(currentPage === 0);
                                navigationButtons.components[1].setDisabled(
                                    (currentPage + 1) * rolesPerPage >= roles.length
                                );

                                await i.update({
                                    components: [
                                        new ActionRowBuilder().addComponents(roleSelectMenu),
                                        navigationButtons
                                    ]
                                });
                            }
                        });

                        roleCollector.on('end', (_, reason) => {
                            if (reason === 'time') {
                                menuInteraction.editReply({
                                    content: "⏱️ Temps écoulé pour la sélection du rôle.",
                                    components: []
                                });
                            }
                        });
                    }
                    break;

                case "suppr-rules":
                    const guildDataForDelete = loadGuildData(guildPath);
                    
                    if (!guildDataForDelete.rules_channel || !guildDataForDelete.rules) {
                        await menuInteraction.reply({
                            content: "❌ Il n'y a pas de règles à supprimer.",
                            ephemeral: true
                        });
                        return;
                    }

                    try {
                        const channelToDelete = interaction.guild.channels.cache.get(guildDataForDelete.rules_channel);
                        if (channelToDelete) {
                            const messages = await channelToDelete.messages.fetch({ limit: 100 });
                            for (const msg of messages.values()) {
                                if (msg.embeds.length > 0 || msg.components.length > 0) {
                                    await msg.delete().catch(console.error);
                                }
                            }
                        }

                        guildDataForDelete.rules = null;
                        saveGuildData(guildPath, guildDataForDelete);

                        await menuInteraction.reply({
                            content: "✅ Les règles ont été supprimées avec succès.",
                            ephemeral: true
                        });
                        collector.stop();
                    } catch (error) {
                        console.error(error);
                        await menuInteraction.reply({
                            content: `❌ Une erreur est survenue lors de la suppression des règles : ${error.message}`,
                            ephemeral: true
                        });
                    }
                    break;

                case "default-rules":
                    const defaultRules = {
                        title: "Règles du serveur Discord 👐",
                        description: `# Règlement du Serveur
                        *Bienvenue sur notre serveur Discord ! Pour garantir un environnement sûr et agréable pour tous les membres, nous vous demandons de bien vouloir respecter scrupuleusement les règles suivantes. Toute infraction pourra entraîner des sanctions allant de l'avertissement à l'exclusion définitive, en fonction de la gravité des faits.*
                        
                        ## 1. Respect et courtoisie ❤️
                        > **Le respect est obligatoire.** *Traitez tous les membres avec courtoisie et bienveillance. Les insultes, attaques personnelles, discriminations, harcèlement ou comportements haineux ne seront pas tolérés.*
                        > *Aucun commentaire raciste, sexiste, homophobe, transphobe, ou discriminatoire ne sera accepté.*
                        
                        ## 2. Comportement toxique ☣️
                        > **Le comportement toxique** *(provocations, mise en cause de membres, trolling, etc.) est interdit. Cela inclut également le* **spamming** *(envoi répétitif de messages) et l'utilisation de* **langage excessivement vulgaire.**
                        > **Les conflits doivent être résolus en privé**, *ne créez pas de drama dans les canaux publics.*
                        
                        ## 3. Contenu inapproprié 📂
                        > *Ne partagez aucun contenu* **illégal, choquant, explicitement sexuel ou violent.** *Les images et vidéos à caractère explicite ou inapproprié seront immédiatement supprimées.*
                        > *Le* **NSFW** *(Not Safe For Work) est* **strictement interdit** *sauf dans les zones spécifiquement dédiées, et sous certaines conditions clairement établies.*
                        
                        ## 4. Publicité et spam 💬
                        > **La publicité non autorisée est interdite.** *Cela inclut l'envoi de liens vers des sites externes, des serveurs Discord ou des produits sans autorisation préalable.*
                        > **Le spam de messages** *(y compris les emojis ou caractères répétés) est interdit.*
                        
                        ## 5. Respect des canaux 💻
                        > *Utilisez les* **canaux appropriés** *pour chaque sujet. Ne mélangez pas les discussions (exemple : ne parlez pas de musique dans un canal dédié aux jeux vidéo).*
                        > **Ne postez pas de contenu hors sujet** *dans des canaux spécifiques (exemple : pas de discussions de politique dans un canal général).*
                        
                        ## 6. Respect de la vie privée 👀
                        > **Ne partagez pas d'informations personnelles** *(vos propres informations ou celles des autres) sans consentement explicite. Cela inclut les adresses, numéros de téléphone, ou toute autre donnée privée.*
                        > **Les photos d'autres membres**, *sans leur consentement, sont interdites. Si vous postez des photos, elles doivent être appropriées et respecter les autres membres.*
                        
                        ## 7. Comportement vis-à-vis des modérateurs 📏
                        > *Les* **modérateurs** *sont là pour assurer le bon fonctionnement du serveur. Respectez leurs décisions, ils sont habilités à appliquer les règles. En cas de désaccord, contactez un modérateur ou admin en privé.*
                        > *Les* **abusions** *envers les modérateurs ou administrateurs (insultes, menaces, harcèlement, ping, MP abusif) entraîneront des sanctions sévères.*
                        
                        ## 8. Interdiction des bots ou des programmes tiers 💾
                        > *L'utilisation de* **bots non autorisés** *ou de tout programme qui enfreint les règles du serveur (cheat, hack, bots automatisés) est formellement interdite.*
                        
                        ## 9. Sanctions ⛔
                        > *Toute violation des règles entraînera une sanction qui peut varier selon la gravité de l'infraction. Les sanctions peuvent aller de* **l'avertissement, à un mute temporaire, à un ban temporaire ou à un ban permanent.**`
                    };

                    const guildDataForDefault = loadGuildData(guildPath);
                    guildDataForDefault.rules = defaultRules;
                    saveGuildData(guildPath, guildDataForDefault);

                    const defaultEmbed = new EmbedBuilder()
                        .setTitle(defaultRules.title)
                        .setDescription(defaultRules.description)
                        .setColor(guildDataForDefault.botColor || '#f40076');

                    if (guildDataForDefault.rules_channel) {
                        const channelForDefault = interaction.guild.channels.cache.get(guildDataForDefault.rules_channel);
                        if (channelForDefault) {
                            await channelForDefault.send({ embeds: [defaultEmbed] });
                            await menuInteraction.reply({
                                content: "✅ Le règlement par défaut a été généré et envoyé dans le salon configuré.",
                                ephemeral: true
                            });
                        }
                    } else {
                        await menuInteraction.reply({
                            content: "⚠️ Aucun salon n'est configuré pour le règlement. Le règlement par défaut a été sauvegardé mais n'a pas pu être affiché.",
                            ephemeral: true
                        });
                    }
                    collector.stop();
                    break;

                case "end-config":
                    collector.stop();
                    break;
            }
        });

        collector.on('end', async () => {
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.deleteReply().catch(err => {
                        console.error("Erreur lors de la suppression du message d'interaction : ", err);
                    });
                }
            } catch (error) {
                console.error("Erreur dans le collecteur 'end' : ", error);
            }
        });

        // Nettoyage du gestionnaire d'événements lors de la fin du collector
        collector.on('end', () => {
            client.removeListener('interactionCreate', handleRulesModal);
        });
    }
};