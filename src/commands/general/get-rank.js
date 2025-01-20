const { SlashCommandBuilder } = require('discord.js');
const LevelingSystem = require('../../../build/level-system.js');
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
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Affiche votre niveau actuel'),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        const client = this.client;
        const levelSystem = new LevelingSystem(client);
        await levelSystem.getRank(interaction, guildData);
    }
};