const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    PermissionsBitField,
    ComponentType,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
let lockImage = 'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExb25scjlpMWcxODRtOG8yb21hdWN1eWFrc2ppZ2w1eHltcXRzbGlkZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/jZuKY2yJ2dj1OJfgoN/giphy.gif';
let unlockImage = 'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXI4YzhjdGRxNTgxYzgyOTA0MzgzeWxlZTNrd29lY2E1b3p2bHlqOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/mFMksHvN6zpGVdt4QZ/giphy.gif';

// Fonction pour charger les données de la guilde
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

// Fonction pour vérifier les permissions
function hasManageChannelPermission(member) {
    return member.permissions.has(PermissionsBitField.Flags.ManageChannels);
}

// Fonction pour créer un embed principal
// Fonction pour créer un embed principal
function createMainEmbed(channel, lockedRoles, user, botColor) {
    const isLocked = lockedRoles.length > 0;
    return new EmbedBuilder()
        .setColor(botColor || '#f40076')
        .setTitle('Gestion du salon')
        .setImage(isLocked ? unlockImage : lockImage)
        .setDescription(
            `Le salon **${channel.name}** est actuellement **${isLocked ? 'verrouillé 🔒' : 'déverrouillé 🔓'}**.`
        )
        .setFooter({ text: `Demandé par ${user.tag}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
}

// Fonction pour vérifier si un rôle a les permissions
function hasRolePermission(channel, roleId, permission) {
    const role = channel.guild.roles.cache.get(roleId);
    return role ? channel.permissionsFor(role).has(permission) : false;
}

// Fonction pour créer un menu déroulant
function createSelectMenu(isLocked) {
    return new StringSelectMenuBuilder()
        .setCustomId('lock-menu')
        .setPlaceholder('Choisissez une action...')
        .addOptions([ 
            ...(isLocked
                ? [{ label: 'Déverrouiller le salon', description: 'Réautorise les messages dans ce salon.', value: 'unlock' }]
                : [{ label: 'Verrouiller le salon', description: 'Empêche les messages dans ce salon.', value: 'lock' }]
            ),
            { label: 'Supprimer des messages', description: 'Supprime un nombre de messages.', value: 'bulk' },
        ]);
}

// Fonction pour verrouiller ou déverrouiller le salon, incluant `member_role`
async function toggleChannelLock(channel, action, lockedRoles) {
    const permissions = action === 'lock' ? { SendMessages: false } : { SendMessages: true };

    // Modifie les permissions pour chaque rôle verrouillé
    for (const roleId of lockedRoles) {
        await channel.permissionOverwrites.edit(roleId, permissions);
    }
}

// Fonction pour mettre à jour l'embed
async function updateEmbed(interaction, embed, channel, action, lockedRoles) {
    const isLocked = action === 'lock';
    embed.setDescription(
        `Le salon **${channel.name}** est désormais **${isLocked ? 'verrouillé 🔒' : 'déverrouillé 🔓'}**.`
    );
    embed.setImage(isLocked ? lockImage : unlockImage);
    await interaction.editReply({ embeds: [embed], components: [] });
}

module.exports = {
    data: {
        name: 'salon',
        description: 'Gérez les actions sur un salon via un menu interactif.',
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        if (guildData.admin_role && guildData.ownerId) {
            const isAdmin = interaction.member.roles.cache.has(guildData.admin_role);
            const isOwner = guildData.ownerId === interaction.user.id;
            if (!isAdmin && !isOwner) {
                return interaction.reply({ content: 'Vous n\'avez pas la permission de consulter ceci.', ephemeral: true });
            }
        } else {
            return interaction.reply({ content: '**Rôle administrateur non configurée ->** ``/config-general``', ephemeral: true });
        }

        const channel = interaction.channel;
        if (!hasManageChannelPermission(interaction.member)) {
            return interaction.reply({
                content: 'Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.',
                ephemeral: true,
            });
        }

        // Récupérer les rôles qui ont les permissions d'écriture
        const lockedRoles = [];
        if (!hasRolePermission(channel, guildData.admin_role, PermissionsBitField.Flags.SendMessages)) {
            lockedRoles.push(guildData.admin_role);
        }
        if (guildData.member_role && !hasRolePermission(channel, guildData.member_role, PermissionsBitField.Flags.SendMessages)) {
            lockedRoles.push(guildData.member_role);
        }

        const embed = createMainEmbed(channel, lockedRoles, interaction.user, guildData.botColor);
        const menu = createSelectMenu(lockedRoles.length > 0);
        const row = new ActionRowBuilder().addComponents(menu);

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

        const collector = channel.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000,
        });

        collector.on('collect', async (menuInteraction) => {
            const action = menuInteraction.values[0];

            switch (action) {
                case 'lock':
                case 'unlock':
                    await toggleChannelLock(channel, action, lockedRoles); // Applique le verrouillage/déverrouillage sur les rôles
                    await updateEmbed(interaction, embed, channel, action, lockedRoles);
                    break;

                case 'bulk':
                    const messagesToDelete = await channel.bulkDelete(100, true);
                    embed.setDescription(`Le salon **${channel.name}** a supprimé **${messagesToDelete.size}** messages.`);
                    await interaction.editReply({ embeds: [embed], components: [] });
                    break;

                default:
                    await menuInteraction.reply({ content: 'Action inconnue.', ephemeral: true });
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    },
};
