const { ActionRowBuilder, SelectMenuBuilder, EmbedBuilder, ButtonStyle } = require('discord.js');
const path = require('path');
const fs = require('fs');

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
        name: 'config',
        description: 'Configure ce bot au mieux pour ton serveur.',
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildPath = path.join(__dirname, `../../../guilds-data/${guildId}.json`);

        // Charger les données de la guilde
        const guildData = loadGuildData(guildPath);
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
        // Embed expliquant les commandes disponibles
        const embed = new EmbedBuilder()
            .setTitle('✨ Menu de Configuration du Serveur ✨')
            .setDescription(`
            *Bienvenue dans le menu de configuration de votre serveur Discord.*
            *Veuillez sélectionner l'une des options ci-dessous pour configurer votre serveur selon vos besoins.*

            **Voici les commandes disponibles :**
            `)
            .addFields(
                { name: '🔧 Configuration générale', value: 'Configurez les paramètres de base de votre serveur.', inline: false },
                { name: '👥 Gestion des membres', value: 'Modifiez les rôles et les permissions des membres.', inline: false },
                { name: '📝 Règles du serveur', value: 'Affichez et modifiez les règles du serveur.', inline: false },
                { name: '🔒 Sécurité et permissions', value: 'Gérez la sécurité et les permissions avancées.', inline: false }
            )
            .setColor(guildData.botColor || '#f40076')
            .setImage('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ2Jrd3d3bm4yN2h3OWtqbHYybmdya2o1MnN4dGZvaGVoZGVldHR3NCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1iNIkQBAwEkUuTpikf/giphy.gif')
            .setFooter({ 
                text: 'Sélectionnez une option dans le menu ci-dessous.', 
                iconURL: interaction.guild.iconURL({ dynamic: true, size: 64 })  // Icône du serveur pour le footer
            });

        // Créer le menu déroulant avec les commandes
        const menu = new ActionRowBuilder().addComponents(
            new SelectMenuBuilder()
                .setCustomId('configSelect')
                .setPlaceholder('Choisissez une commande à executer.')
                .addOptions(
                    {
                        label: '/config-general',
                        value: 'config-general',
                        description: 'Configurer les paramètres généraux du serveur.',
                    },
                    {
                        label: '/config-color',
                        value: 'config-color',
                        description: 'Configurer la couleur du bot.',
                    },
                    {
                        label: '/config-welcome',
                        value: 'config-welcome',
                        description: 'Configurer le message de bienvenue pour les nouveaux membres.',
                    },
                    {
                        label: '/config-règlement',
                        value: 'config-règlement',
                        description: 'Configurer les règles du serveur.',
                    },
                    {
                        label: '/config-whitelist',
                        value: 'config-whitelist',
                        description: 'Configurer la liste blanche des utilisateurs autorisés.',
                    },
                    {
                        label: '/antiraid',
                        value: 'antiraid',
                        description: 'Configurer le système Anti-Raid (Activé ou Désactivé).',
                    },
                    
                    {
                        label: '/config-raidmode',
                        value: 'config-raidmode',
                        description: 'Configurer le mode Raid pour protéger le serveur. (Activé ou Désactivé).',
                    },
                    
                    // {
                    //     label: '/config-language 🟣',
                    //     value: 'config-language',
                    //     description: 'Configurer la langue du serveur. (Disponible dans une version ultérieure)',
                    // },
                    // {
                    //     label: '/config-music 🟣',
                    //     value: 'config-music',
                    //     description: 'Configurer les paramètres musicaux. (Disponible dans une version ultérieure)',
                    // },
                    // {
                    //     label: '/config-level ❌',
                    //     value: 'config-level',
                    //     description: 'Configurer les niveaux des utilisateurs (pas encore disponible).',
                    // }
                )
        );

        // Envoyer l'embed avec le menu déroulant
        await interaction.reply({ embeds: [embed], components: [menu], ephemeral: true });

        // Gérer la sélection du menu déroulant
        const filter = (interaction) => interaction.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (menuInteraction) => {
            if (menuInteraction.customId === 'configSelect') {
                const selectedValue = menuInteraction.values[0];
                switch (selectedValue) {
                    case 'antiraid':
                        await interaction.client.commands.get('config-antiraid').execute(menuInteraction);
                        break;
                    case 'config':
                        await interaction.client.commands.get('config').execute(menuInteraction);
                        break;
                    case 'config-general':
                        await interaction.client.commands.get('config-general').execute(menuInteraction);
                        break;
                    case 'config-raidmode':
                        await interaction.client.commands.get('config-raidmode').execute(menuInteraction);
                        break;
                    case 'config-color':
                        await interaction.client.commands.get('config-color').execute(menuInteraction);
                        break;
                    case 'config-welcome':
                        await interaction.client.commands.get('config-welcome').execute(menuInteraction);
                        break;
                    case 'config-language':
                        // Commande pas encore disponible
                        await menuInteraction.reply({ content: 'Cette commande n\'est pas encore disponible.', ephemeral: true });
                        break;
                    case 'config-règlement':
                        await interaction.client.commands.get('config-règlement').execute(menuInteraction);
                        break;
                    case 'config-whitelist':
                        await interaction.client.commands.get('config-whitelist').execute(menuInteraction);
                        break;
                    case 'config-music':
                        // Commande pas encore disponible
                        await menuInteraction.reply({ content: 'Cette commande n\'est pas encore disponible.', ephemeral: true });
                        break;
                    case 'config-level':
                        // Commande pas encore disponible
                        await menuInteraction.reply({ content: 'Cette commande n\'est pas encore disponible.', ephemeral: true });
                        break;
                    default:
                        await menuInteraction.reply({ content: 'Commande inconnue.', ephemeral: true });
                }
            }
        });
    }
};
