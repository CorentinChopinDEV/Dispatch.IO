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
        .setName('add-xp')
        .setDescription('Ajoute de l\'XP à un utilisateur')
        .setDefaultMemberPermissions(0x0000000000000008)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('L\'utilisateur à qui ajouter de l\'XP')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('La quantité d\'XP à ajouter')
                .setRequired(true)),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);

        // Vérification des permissions
        if (guildData.admin_role && guildData.ownerId) {
            const isAdmin = interaction.member.roles.cache.has(guildData.admin_role);
            const isOwner = guildData.ownerId === interaction.user.id;
            if (!isOwner && !isAdmin) {
                return interaction.reply({ content: 'Vous n\'avez pas la permission de consulter ceci.', ephemeral: true });
            }
        } else {
            return interaction.reply({ content: '**Rôle administrateur non configuré ->** `/config-general`', ephemeral: true });
        }
        const client = this.client;
        const levelSystem = new LevelingSystem(client);
        const user = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        await levelSystem.modifyXP(interaction, user, amount, 'add');
    }
};