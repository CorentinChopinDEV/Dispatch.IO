const { EmbedBuilder } = require('discord.js');
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
        name: 'bonjour',
        description: 'Rappelle les bonnes manières si quelqu\'un oublie de dire bonjour.',
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        const embed = new EmbedBuilder()
            .setTitle('😏 Tu as oublié quelque chose ?')
            .setDescription("Oups, il semblerait que tu aies oublié de dire **Bonjour**...\n\n*Ce serait dommage que quelque chose arrive si tu continues à manquer de politesse...*")
            .setColor(guildData.botColor || '#f40076')
            .setImage('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHNzZWpqYWJuMHN6Z2E5MmswZmcxMTA0eTJ6dHVlaDRmN29mdTR0YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1H0pYNquN20i2GZ1cV/giphy.gif')
            .setFooter({ text: 'Rappelle-toi, un simple bonjour peut éviter bien des ennuis.' });

        // Envoyer l'embed
        await interaction.reply({ embeds: [embed], ephemeral: false });
    },
};
