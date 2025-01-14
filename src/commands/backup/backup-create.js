const { EmbedBuilder } = require('discord.js');
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

module.exports = {
    data: {
        name: 'backup-create',
        description: 'Créer une backup de ton serveur Discord',
    },
    async execute(interaction) {
        const channel = interaction.channel;
        const numberOfMessages = interaction.options.getInteger('nombre');
        const client = interaction.client;
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
        const token = Math.random().toString(36).substring(2, 17).toUpperCase();

        // Extraire les rôles
        const roles = interaction.guild.roles.cache.map(role => ({
            id: role.id,
            name: role.name,
            color: role.hexColor,
            hoist: role.hoist,
            position: role.position,
            permissions: role.permissions.bitfield,
            mentionable: role.mentionable
        }));

        // Extraire les salons et catégories
        const channels = interaction.guild.channels.cache.map(channel => ({
            id: channel.id,
            name: channel.name,
            type: channel.type,
            parent: channel.parent ? channel.parent.id : null,
            position: channel.position,
            permissionOverwrites: Array.from(channel.permissionOverwrites.cache.values()).map(overwrite => ({
                id: overwrite.id,
                type: overwrite.type,
                allow: overwrite.allow.bitfield,
                deny: overwrite.deny.bitfield
            }))
        }));

        // Préparer les données de sauvegarde
        const backupData = {
            guildId: interaction.guild.id,
            guildName: interaction.guild.name,
            ownerId: interaction.guild.ownerId,
            createdAt: interaction.guild.createdAt.toISOString(), // Convertir en chaîne lisible
            roles,
            channels,
            token
        };

        // Convertir BigInt en chaîne de caractères pour JSON.stringify
        const replacer = (key, value) =>
            typeof value === 'bigint' ? value.toString() : value;

        // Déterminer le chemin du fichier de sauvegarde
        const backupFilePath = path.join(__dirname, `../../../backup/${token}-backup.json`);

        // Sauvegarder les données dans un fichier
        try {
            fs.writeFileSync(backupFilePath, JSON.stringify(backupData, replacer, 4), 'utf8');
            const embed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle('✅ Sauvegarde créée avec succès !')
                .setDescription(`
                ### La sauvegarde du serveur a été créée avec succès.
                Utilisez le token suivant pour la restaurer :

                **Cette commande est dangereuse elle supprime tous pour recréer votre serveur.**
                **Commandes d'execution** 💻
                \`\`\`/backup-load id:${token}\`\`\`
                `)
                .setTimestamp()
                .setFooter({ text: '© Dispatch.IO', iconURL: client.user.avatarURL() })
                .setThumbnail(client.user.avatarURL());

            return interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (err) {
            console.error('Erreur lors de la sauvegarde des données :', err);
            return interaction.reply({ content: 'Une erreur est survenue lors de la création de la sauvegarde.', ephemeral: true });
        }
    },
};
