const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
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

const loadCommandsFromDirectory = (dir) => {
    const sections = {};
    const commandFiles = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of commandFiles) {
        const filePath = path.resolve(dir, file.name); // Utilisation du chemin absolu

        if (file.isDirectory()) {
            const sectionCommands = loadCommandsFromDirectory(filePath);
            sections[file.name] = sectionCommands;
        } else if (file.name.endsWith('.js')) {
            try {
                const command = require(filePath); // Charger le fichier de commande

                // Vérification si la commande a les propriétés nécessaires
                if (command.data && command.data.name && command.data.description) {
                    const sectionName = path.basename(path.dirname(filePath)); // Nom de la section basé sur le dossier

                    // Vérification si la section existe, sinon la créer
                    if (!sections[sectionName]) {
                        sections[sectionName] = [];
                    }

                    // Ajout de la commande dans la section correspondante
                    sections[sectionName].push({
                        name: command.data.name,
                        description: command.data.description,
                    });
                } else {
                    console.error(`Commande invalide dans le fichier ${file.name} (${filePath})`);
                }
            } catch (error) {
                console.error(`Erreur de chargement pour le fichier ${file.name} (${filePath}):`, error.message);
            }
        }
    }
    return sections;
};

module.exports = {
    data: {
        name: 'help',
        description: 'Affiche la liste des commandes disponibles',
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        // Charger toutes les commandes dynamiquement depuis le répertoire
        const commandSections = loadCommandsFromDirectory(path.join('./src/commands'));
        let bannerURL = 'https://i.ibb.co/HPrWVPP/Moderation-Anti-Raid.png';
        // Créer l'embed avec un titre et une description générale
        const embed = new EmbedBuilder()
            .setTitle('📂 Liste des Commandes')
            .setDescription('Utilisez le menu déroulant ci-dessous pour sélectionner une catégorie et voir les commandes disponibles.')
            .setColor(guildData.botColor || '#f40076')
            .setImage(bannerURL)
            .setTimestamp()
            const categoryLabels = {
                config: 'Configuration',
                general: 'Générales',
                moderation: 'Modération',
                admin: 'Administrateur',
                owner: 'Propriétaire',
                // Ajoutez d'autres catégories ici
            };
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('command_select')
                .setPlaceholder('Choisissez une catégorie de commandes')
                .addOptions(
                    Object.keys(commandSections).map(section => ({
                        label: categoryLabels[section] || section, // Utilise le label personnalisé ou le nom brut
                        value: section,
                        description: `Voir les commandes pour ${categoryLabels[section] || section}`, // Ajoute une description personnalisée
                    }))
                );
            

        // Créer une ligne d'action avec le menu déroulant
        const row = new ActionRowBuilder().addComponents(selectMenu);

        // Réponse avec l'embed et le menu déroulant
        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });

        // Filtrer les commandes selon la sélection
        const filter = i => i.customId === 'command_select' && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 120000 });        
        collector.on('collect', async i => {
            const selectedSection = i.values[0]; // Récupère la section sélectionnée
            const sectionCommands = commandSections[selectedSection];
        
            // Vérifie si sectionCommands est un tableau directement
            if (Array.isArray(sectionCommands)) {
                const commands = sectionCommands;
        
                const sectionEmbed = new EmbedBuilder()
                    .setTitle(`${selectedSection} - Commandes`)
                    .setDescription(`Voici toutes les commandes disponibles pour la section ${selectedSection}:`)
                    .setColor(guildData.botColor || '#f40076')
                    .setImage(bannerURL)
                    .setTimestamp()
        
                // Ajout de chaque commande sous forme de champ dans l'embed
                commands.forEach(command => {
                    sectionEmbed.addFields({
                        name: `\`${command.name}\``,
                        value: command.description,
                        inline: true, // Utiliser 'inline' pour que les commandes soient alignées horizontalement
                    });
                });
        
                await i.update({
                    embeds: [sectionEmbed],
                    components: [row], // Garde le menu déroulant
                });
            } else if (sectionCommands && typeof sectionCommands === 'object') {
                // Vérifier la clé 'admin'
                if (Array.isArray(sectionCommands.admin)) {
                    const commands = sectionCommands.admin;
        
                    const sectionEmbed = new EmbedBuilder()
                        .setTitle(`Administrateur - Commandes 🧑‍⚖️`)
                        .setDescription(`*Voici toutes les commandes disponibles pour la section* **Administrateur**:`)
                        .setColor(guildData.botColor || '#f40076')
                        .setImage(bannerURL)
                        .setTimestamp()
        
                    commands.forEach(command => {
                        sectionEmbed.addFields({
                            name: `\`${command.name}\``,
                            value: command.description,
                            inline: false, // Aligner horizontalement les commandes
                        });
                    });
        
                    await i.update({
                        embeds: [sectionEmbed],
                        components: [row], // Garde le menu déroulant
                    });
                }
                // Vérifier la clé 'config'
                else if (Array.isArray(sectionCommands.config)) {
                    const commands = sectionCommands.config;
        
                    const sectionEmbed = new EmbedBuilder()
                        .setTitle(`Configuration - Commandes 🪅`)
                        .setDescription(`*Voici toutes les commandes disponibles pour la section* **Configuration**:`)
                        .setColor(guildData.botColor || '#f40076')
                        .setImage(bannerURL)
                        .setTimestamp()
        
                    commands.forEach(command => {
                        sectionEmbed.addFields({
                            name: `\`${command.name}\``,
                            value: command.description,
                            inline: false, // Aligner horizontalement les commandes
                        });
                    });
        
                    await i.update({
                        embeds: [sectionEmbed],
                        components: [row], // Garde le menu déroulant
                    });
                }
                else if (Array.isArray(sectionCommands.general)) {
                    const commands = sectionCommands.general;
        
                    const sectionEmbed = new EmbedBuilder()
                        .setTitle(`Public - Commandes 🚀`)
                        .setDescription(`*Voici toutes les commandes disponibles pour la section* **Public**:`)
                        .setColor(guildData.botColor || '#f40076')
                        .setImage(bannerURL)
                        .setTimestamp()
        
                    commands.forEach(command => {
                        sectionEmbed.addFields({
                            name: `\`${command.name}\``,
                            value: command.description,
                            inline: false, // Aligner horizontalement les commandes
                        });
                    });
        
                    await i.update({
                        embeds: [sectionEmbed],
                        components: [row], // Garde le menu déroulant
                    });
                }
                else if (Array.isArray(sectionCommands.moderation)) {
                    const commands = sectionCommands.moderation;
        
                    const sectionEmbed = new EmbedBuilder()
                        .setTitle(`Modération - Commandes 👮`)
                        .setDescription(`*Voici toutes les commandes disponibles pour la section* **Modération**:`)
                        .setColor(guildData.botColor || '#f40076')
                        .setImage(bannerURL)
                        .setTimestamp()
        
                    commands.forEach(command => {
                        sectionEmbed.addFields({
                            name: `\`${command.name}\``,
                            value: command.description,
                            inline: false, // Aligner horizontalement les commandes
                        });
                    });
        
                    await i.update({
                        embeds: [sectionEmbed],
                        components: [row], // Garde le menu déroulant
                    });
                }
                else if (Array.isArray(sectionCommands.owner)) {
                    const commands = sectionCommands.owner;
        
                    const sectionEmbed = new EmbedBuilder()
                        .setTitle(`Propriétaire - Commandes 👑`)
                        .setDescription(`*Voici toutes les commandes disponibles pour la section* **Propriétaire**:`)
                        .setColor(guildData.botColor || '#f40076')
                        .setImage(bannerURL)
                        .setTimestamp()
        
                    commands.forEach(command => {
                        sectionEmbed.addFields({
                            name: `\`${command.name}\``,
                            value: command.description,
                            inline: false, // Aligner horizontalement les commandes
                        });
                    });
        
                    await i.update({
                        embeds: [sectionEmbed],
                        components: [row], // Garde le menu déroulant
                    });
                }
                else {
                    await i.update({
                        content: `Aucune commande trouvée pour la section ${selectedSection}.`,
                        components: [], // Désactive le menu déroulant
                    });
                }
            } else {
                await i.update({
                    content: `Aucune commande trouvée pour la section ${selectedSection}.`,
                    components: [], // Désactive le menu déroulant
                });
            }
        });
        
        collector.on('end', async () => {
            // Si le collector expire, on désactive le menu
            await interaction.editReply({
                components: [],
            });
        });
    },
};
