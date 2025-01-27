const { EmbedBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { env } = require('process');

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
        name: 'owner-restart',
        description: 'Permet de redémarrer le BOT. (Réservé au propriétaire du BOT)',
    },
    async execute(interaction) {
        const IDOwner = env.IDOWNER;
        if (interaction.user.id !== IDOwner) {
            return interaction.reply({ content: 'Vous n\'avez pas la permission de consulter ceci.', ephemeral: true });
        }

        // Create confirmation embed
        const confirmEmbed = new EmbedBuilder()
            .setColor('#f40076')
            .setTitle('<:discordearlysupporter:1327777649803788370> Redémarrage du Serveur')
            .setDescription('Le serveur va redémarrer dans quelques instants...')
            .setTimestamp();

        // Send the confirmation embed
        await interaction.reply({ embeds: [confirmEmbed] });

        // Wait for 3 seconds before restarting
        setTimeout(() => {
            process.exit(1); // This will restart the server if you're using a process manager
        }, 3000);
    },
};