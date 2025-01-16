const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const path = require('path');
const fs = require('fs');

// Constants for images and game settings
const GAME_IMAGES = {
    BANNER: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExamdtYzhhdThwMzdvc2FiZ3phNDduNjNzOTZmamk0dzVqMWprdTE5biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/TejmLnMKgnmPInMQjV/giphy.gif',
    VICTORY: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnN0cnQ5MXliYm5yYWJoYjk2aW1kNmh6dnhzcXc5czhzdTZuMnBpdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/t3sZxY5zS5B0z5zMIz/giphy.gif',
    DEFEAT: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExejhtcWRwaHJldzVwNnh2N3p4ZzIydXZ3ZTc2emFhYmdvZ25hdnM3ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/EeaufRr3ntxW8/giphy.gif'
};

const ROUNDS_TO_WIN = 5;

// Utility function to load guild data
function loadGuildData(guildId) {
    const guildPath = path.join(__dirname, '..', 'guilds-data', `${guildId}.json`);
    try {
        if (fs.existsSync(guildPath)) {
            const data = fs.readFileSync(guildPath, 'utf-8');
            return JSON.parse(data);
        }
        return { pfc: { players: {} }, botColor: '#f40076' };
    } catch (err) {
        console.error('Error loading guild data:', err);
        return { pfc: { players: {} }, botColor: '#f40076' };
    }
}

// Utility function to create footer
function createFooter(guild) {
    return {
        text: '© Dispatch.IO',
        iconURL: guild.iconURL() || null
    };
}

// Rest of the utility functions remain the same
function saveGuildData(guildId, data) {
    const guildDir = path.join(__dirname, '..', 'guilds-data');
    const guildPath = path.join(guildDir, `${guildId}.json`);
    
    try {
        if (!fs.existsSync(guildDir)) {
            fs.mkdirSync(guildDir, { recursive: true });
        }
        fs.writeFileSync(guildPath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error saving guild data:', err);
    }
}

function updatePlayerStats(guildId, playerId, result) {
    const data = loadGuildData(guildId);
    if (!data.pfc) data.pfc = { players: {} };
    if (!data.pfc.players[playerId]) {
        data.pfc.players[playerId] = { wins: 0, losses: 0, ties: 0 };
    }
    
    data.pfc.players[playerId][result]++;
    saveGuildData(guildId, data);
}

const choices = {
    ROCK: { emoji: '👊', name: 'Pierre', beats: ['SCISSORS'] },
    PAPER: { emoji: '✋', name: 'Feuille', beats: ['ROCK'] },
    SCISSORS: { emoji: '✌️', name: 'Ciseaux', beats: ['PAPER'] }
};

function determineWinner(choice1, choice2) {
    if (choice1 === choice2) return 'TIE';
    return choices[choice1].beats.includes(choice2) ? 'WIN' : 'LOSE';
}

function getRandomChoice() {
    const choicesArray = Object.keys(choices);
    const randomIndex = Math.floor(Math.random() * choicesArray.length);
    return choicesArray[randomIndex];
}

const messages = {
    WIN: [
        "Incroyable victoire ! 🎉",
        "Tu es un maître stratège ! 🧠",
        "Quelle performance ! 🌟"
    ],
    LOSE: [
        "Pas de chance cette fois ! 😅",
        "La prochaine sera la bonne ! 💪",
        "Ne baisse pas les bras ! 🔄"
    ],
    TIE: [
        "Match nul ! On remet ça ? 🤝",
        "Égalité parfaite ! 🎭",
        "Vos esprits sont synchronisés ! ⚖️"
    ]
};

function getRandomMessage(result) {
    const messageArray = messages[result];
    return messageArray[Math.floor(Math.random() * messageArray.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pfc')
        .setDescription('Joue à Pierre-Feuille-Ciseaux')
        .addSubcommand(subcommand =>
            subcommand
                .setName('contre')
                .setDescription('Joue contre un autre joueur')
                .addUserOption(option =>
                    option
                        .setName('adversaire')
                        .setDescription('Choisissez votre adversaire')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('solo')
                .setDescription('Joue contre le bot')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Affiche tes statistiques')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('Affiche le classement global')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildData = loadGuildData(interaction.guildId);

        if (subcommand === 'stats') {
            const playerStats = guildData.pfc?.players[interaction.user.id] || { wins: 0, losses: 0, ties: 0 };

            const statsEmbed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle('📊 Statistiques Pierre-Feuille-Ciseaux')
                .setDescription(`Statistiques de ${interaction.user.username}`)
                .setImage(GAME_IMAGES.BANNER)
                .addFields(
                    { name: '🏆 Victoires', value: playerStats.wins.toString(), inline: true },
                    { name: '💔 Défaites', value: playerStats.losses.toString(), inline: true },
                    { name: '🤝 Égalités', value: playerStats.ties.toString(), inline: true }
                )
                .setFooter(createFooter(interaction.guild));

            return interaction.reply({ embeds: [statsEmbed] });
        }

        if (subcommand === 'leaderboard') {
            const players = guildData.pfc?.players || {};
            
            const sortedPlayers = Object.entries(players)
                .map(([id, stats]) => ({
                    id,
                    score: stats.wins * 3 + stats.ties
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);

            const leaderboardEmbed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle('🏆 Classement Pierre-Feuille-Ciseaux')
                .setImage(GAME_IMAGES.BANNER)
                .setDescription(
                    await Promise.all(sortedPlayers.map(async (player, index) => {
                        const user = await interaction.client.users.fetch(player.id);
                        return `${index + 1}. ${user.username} - ${player.score} points`;
                    }))
                    .then(lines => lines.join('\n'))
                )
                .setFooter(createFooter(interaction.guild));

            return interaction.reply({ embeds: [leaderboardEmbed] });
        }

        if (subcommand === 'solo') {
            let playerScore = 0;
            let botScore = 0;
            let currentRound = 1;
            let gameActive = true;

            const playRound = async () => {
                if (!gameActive) return;

                const buttons = new ActionRowBuilder()
                    .addComponents(
                        Object.entries(choices).map(([key, value]) =>
                            new ButtonBuilder()
                                .setCustomId(key)
                                .setLabel(value.name)
                                .setEmoji(value.emoji)
                                .setStyle(ButtonStyle.Primary)
                        )
                    );

                const gameEmbed = new EmbedBuilder()
                    .setColor(guildData.botColor || '#f40076')
                    .setTitle(`🎮 Pierre-Feuille-Ciseaux - Manche ${currentRound}/${ROUNDS_TO_WIN}`)
                    .setDescription(`Score: Vous ${playerScore} - ${botScore} Bot\nChoisissez votre coup !`)
                    .setImage(GAME_IMAGES.BANNER)
                    .setFooter(createFooter(interaction.guild));

                const message = await interaction.editReply({
                    embeds: [gameEmbed],
                    components: [buttons],
                    fetchReply: true
                });

                try {
                    const buttonInteraction = await message.awaitMessageComponent({
                        filter: i => i.user.id === interaction.user.id,
                        time: 30000,
                        componentType: ComponentType.Button
                    });

                    if (!gameActive) return;

                    const playerChoice = buttonInteraction.customId;
                    const botChoice = getRandomChoice();
                    const result = determineWinner(playerChoice, botChoice);

                    if (result === 'WIN') playerScore++;
                    else if (result === 'LOSE') botScore++;

                    const resultMessage = result === 'WIN' ? 'Vous gagnez la manche !' :
                                        result === 'LOSE' ? 'Le bot gagne la manche !' :
                                        'Égalité !';

                    const roundEmbed = new EmbedBuilder()
                        .setColor(guildData.botColor || '#f40076')
                        .setTitle(`🎮 Résultat - Manche ${currentRound}/${ROUNDS_TO_WIN}`)
                        .setDescription(resultMessage)
                        .addFields(
                            { name: 'Votre choix', value: `${choices[playerChoice].emoji} ${choices[playerChoice].name}`, inline: true },
                            { name: 'Choix du bot', value: `${choices[botChoice].emoji} ${choices[botChoice].name}`, inline: true },
                            { name: 'Score', value: `Vous ${playerScore} - ${botScore} Bot` }
                        )
                        .setImage(GAME_IMAGES.BANNER)
                        .setFooter(createFooter(interaction.guild));

                    await buttonInteraction.update({ embeds: [roundEmbed], components: [] });

                    currentRound++;
                    
                    if (currentRound <= ROUNDS_TO_WIN && gameActive) {
                        setTimeout(() => playRound(), 3000);
                    } else if (gameActive) {
                        gameActive = false;
                        const finalResult = playerScore > botScore ? 'wins' : playerScore < botScore ? 'losses' : 'ties';
                        updatePlayerStats(interaction.guildId, interaction.user.id, finalResult);

                        const finalEmbed = new EmbedBuilder()
                            .setColor(guildData.botColor || '#f40076')
                            .setTitle('🏆 Fin de la partie !')
                            .setDescription(`Score final: Vous ${playerScore} - ${botScore} Bot\n${getRandomMessage(playerScore > botScore ? 'WIN' : playerScore < botScore ? 'LOSE' : 'TIE')}`)
                            .setImage(playerScore > botScore ? GAME_IMAGES.VICTORY : GAME_IMAGES.DEFEAT)
                            .setFooter(createFooter(interaction.guild));

                        await interaction.editReply({ embeds: [finalEmbed], components: [] });
                    }

                } catch (error) {
                    if (!gameActive) return;
                    gameActive = false;

                    const timeoutEmbed = new EmbedBuilder()
                        .setColor(guildData.botColor || '#f40076')
                        .setTitle('⏰ Partie terminée !')
                        .setDescription(`La partie est terminée avec un score de ${playerScore} - ${botScore}`)
                        .setFooter(createFooter(interaction.guild));

                    await interaction.editReply({
                        embeds: [timeoutEmbed],
                        components: []
                    });

                    // Mettre à jour les statistiques même en cas d'abandon
                    const finalResult = playerScore > botScore ? 'wins' : playerScore < botScore ? 'losses' : 'ties';
                    updatePlayerStats(interaction.guildId, interaction.user.id, finalResult);
                }
            };

            await interaction.reply({ content: 'La partie commence...', fetchReply: true });
            playRound();
            return;
        }

        if (subcommand === 'contre') {
            const opponent = interaction.options.getUser('adversaire');
            
            if (opponent.id === interaction.user.id) {
                return interaction.reply({
                    content: "Vous ne pouvez pas jouer contre vous-même !",
                    ephemeral: true
                });
            }

            if (opponent.bot) {
                return interaction.reply({
                    content: "Vous ne pouvez pas jouer contre un bot ! Utilisez /pfc solo à la place.",
                    ephemeral: true
                });
            }

            let player1Score = 0;
            let player2Score = 0;
            let currentRound = 1;

            const playRound = async () => {
                const buttons = new ActionRowBuilder()
                    .addComponents(
                        Object.entries(choices).map(([key, value]) =>
                            new ButtonBuilder()
                                .setCustomId(key)
                                .setLabel(value.name)
                                .setEmoji(value.emoji)
                                .setStyle(ButtonStyle.Primary)
                        )
                    );

                const gameEmbed = new EmbedBuilder()
                    .setColor(guildData.botColor || '#f40076')
                    .setTitle(`🎮 Pierre-Feuille-Ciseaux - Manche ${currentRound}/${ROUNDS_TO_WIN}`)
                    .setDescription(`${interaction.user} VS ${opponent}\nScore: ${player1Score} - ${player2Score}\nVous avez 10 secondes pour choisir !`)
                    .setImage(GAME_IMAGES.BANNER)
                    .setFooter(createFooter(interaction.guild));

                const message = await interaction.editReply({
                    embeds: [gameEmbed],
                    components: [buttons],
                    fetchReply: true
                });

                const playerChoices = new Map();

                try {
                    const collector = message.createMessageComponentCollector({
                        componentType: ComponentType.Button,
                        time: 120000,
                        filter: i => [interaction.user.id, opponent.id].includes(i.user.id) && !playerChoices.has(i.user.id)
                    });

                    collector.on('collect', async (i) => {
                        playerChoices.set(i.user.id, i.customId);
                        await i.reply({
                            content: `Vous avez choisi ${choices[i.customId].emoji} ${choices[i.customId].name} !`,
                            ephemeral: true
                        });

                        if (playerChoices.size === 2) {
                            collector.stop();
                        }
                    });

                    collector.on('end', async () => {
                        if (playerChoices.size !== 2) {
                            const timeoutEmbed = new EmbedBuilder()
                                .setColor(guildData.botColor || '#f40076')
                                .setTitle('⏰ Temps écoulé !')
                                .setDescription('Un des joueurs n\'a pas répondu à temps !')
                                .setFooter(createFooter(interaction.guild));

                            await message.edit({
                                embeds: [timeoutEmbed],
                                components: []
                            });
                            return;
                        }

                        const player1Choice = playerChoices.get(interaction.user.id);
                        const player2Choice = playerChoices.get(opponent.id);
                        const result = determineWinner(player1Choice, player2Choice);

                        if (result === 'WIN') player1Score++;
                        else if (result === 'LOSE') player2Score++;

                        const roundEmbed = new EmbedBuilder()
                            .setColor(guildData.botColor || '#f40076')
                            .setTitle(`🎮 Résultat - Manche ${currentRound}/${ROUNDS_TO_WIN}`)
                            .addFields(
                                { name: interaction.user.username, value: `${choices[player1Choice].emoji} ${choices[player1Choice].name}`, inline: true },
                                { name: opponent.username, value: `${choices[player2Choice].emoji} ${choices[player2Choice].name}`, inline: true },
                                { name: 'Score', value: `${player1Score} - ${player2Score}` }
                            )
                            .setFooter(createFooter(interaction.guild));

                        await message.edit({
                            embeds: [roundEmbed],
                            components: []
                        });

                        currentRound++;
                        if (currentRound <= ROUNDS_TO_WIN) {
                            setTimeout(() => playRound(), 5000);
                        } else {
                            // Final results
                            if (player1Score > player2Score) {
                                updatePlayerStats(interaction.guildId, interaction.user.id, 'wins');
                                updatePlayerStats(interaction.guildId, opponent.id, 'losses');
                            } else if (player1Score < player2Score) {
                                updatePlayerStats(interaction.guildId, interaction.user.id, 'losses');
                                updatePlayerStats(interaction.guildId, opponent.id, 'wins');
                            } else {
                                updatePlayerStats(interaction.guildId, interaction.user.id, 'ties');
                                updatePlayerStats(interaction.guildId, opponent.id, 'ties');
                            }

                            const finalEmbed = new EmbedBuilder()
                                .setColor(guildData.botColor || '#f40076')
                                .setTitle('🏆 Fin de la partie !')
                                .setDescription(`Score final: ${player1Score} - ${player2Score}\n${getRandomMessage(player1Score > player2Score ? 'WIN' : player1Score < player2Score ? 'LOSE' : 'TIE')}`)
                                .setImage(player1Score > player2Score ? GAME_IMAGES.VICTORY : GAME_IMAGES.DEFEAT)
                                .setFooter(createFooter(interaction.guild));

                            await interaction.editReply({
                                embeds: [finalEmbed],
                                components: []
                            });
                        }
                    });

                } catch (error) {
                    console.error(error);
                    await interaction.followUp({
                        content: 'Une erreur est survenue pendant la partie !',
                        ephemeral: true
                    });
                }
            };

            await interaction.reply({ content: 'La partie commence...', fetchReply: true });
            playRound();
        }
    },
};