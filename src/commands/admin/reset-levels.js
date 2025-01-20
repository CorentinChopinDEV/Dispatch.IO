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
        .setName('reset-levels')
        .setDescription('Réinitialise tous les niveaux')
        .setDefaultMemberPermissions(0x0000000000000008),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);

        // Vérification des permissions
        if (guildData.admin_role && guildData.ownerId) {
            const isAdmin = interaction.member.roles.cache.has(guildData.admin_role);
            const isOwner = guildData.ownerId === interaction.user.id;
            if (!isOwner) {
                return interaction.editReply({ content: 'Vous n\'avez pas la permission de consulter ceci.', ephemeral: true });
            }
        } else {
            return interaction.editReply({ content: '**Rôle administrateur non configuré ->** `/config-general`', ephemeral: true });
        }
        const client = this.client;
        const levelSystem = new LevelingSystem(client);
        await levelSystem.resetLevels(interaction);
    }
};