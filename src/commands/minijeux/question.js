const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const CATEGORIES = {
        GAMING: 'Gaming',
        LITERATURE: 'Littérature et Histoire',
        SCIENCE: 'Science et Nature',
        GEOGRAPHY: 'Géographie',
        ENTERTAINMENT: 'Musique et cinéma'
    };

    const DIFFICULTIES = {
        EASY: 'Inculte (Facile)',
        MEDIUM: 'Culte (Moyen)',
        HARD: 'Dieux (Difficile)'
    };

    async function generateQuestion(category, difficulty) {
        const prompt = `Génère une question de quiz éducative et appropriée sur le thème "${category}" de difficulté "${difficulty}".
    La question doit être factuelle et adaptée à tous publics.
    Réponds uniquement avec un objet JSON valide sans backticks ni formatage markdown, avec cette structure exacte :
    {
        "question": "Question factuelle et appropriée",
        "options": [
            "Option 1 (correcte)",
            "Option 2",
            "Option 3",
            "Option 4"
        ],
        "correctIndex": 0,
        "explanation": "Explication factuelle et éducative"
    }`;

        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
            
            try {
                return JSON.parse(cleanJson);
            } catch (parseError) {
                console.error('Erreur de parsing JSON:', parseError);
                throw new Error('Format de réponse invalide');
            }
        } catch (error) {
            console.error('Erreur lors de la génération de la question:', error);
            const fallbackQuestions = {
                'Gaming': {
                    question: "Quel est le jeu vidéo le plus vendu de tous les temps ?",
                    options: ["Minecraft", "Tetris", "GTA V", "Super Mario Bros"],
                    correctIndex: 0,
                    explanation: "Minecraft est le jeu le plus vendu avec plus de 238 millions d'exemplaires vendus."
                },
                'Littérature et Histoire': {
                    question: "Qui a écrit 'Les Misérables' ?",
                    options: ["Victor Hugo", "Émile Zola", "Gustave Flaubert", "Honoré de Balzac"],
                    correctIndex: 0,
                    explanation: "Victor Hugo a écrit 'Les Misérables', publié en 1862."
                },
                'Science et Nature': {
                    question: "Quelle est la planète la plus proche du Soleil ?",
                    options: ["Mercure", "Vénus", "Mars", "Jupiter"],
                    correctIndex: 0,
                    explanation: "Mercure est la planète la plus proche du Soleil dans notre système solaire."
                },
                'Géographie': {
                    question: "Quelle est la capitale de la France ?",
                    options: ["Paris", "Londres", "Berlin", "Madrid"],
                    correctIndex: 0,
                    explanation: "Paris est la capitale de la France depuis 508."
                },
                'Musique et cinéma': {
                    question: "Quel film a remporté le plus d'Oscars ?",
                    options: ["Titanic", "Ben-Hur", "Le Seigneur des Anneaux", "West Side Story"],
                    correctIndex: 0,
                    explanation: "Titanic a remporté 11 Oscars en 1998, à égalité avec Ben-Hur et Le Retour du Roi."
                }
            };
            
            return fallbackQuestions[category] || fallbackQuestions['Gaming'];
        }
    }

    module.exports = {
        data: new SlashCommandBuilder()
            .setName('quiz')
            .setDescription('Démarre une partie de quiz !'),

        async execute(interaction) {
            const guildId = interaction.guild.id;
            const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
            const guildData = loadGuildData(filePath);
            let score = 0;
            let currentQuestion = 0;
            let selectedCategory = '';
            let selectedDifficulty = '';
            let currentQuestionData = null; // Stocke la question actuelle
            
            const startEmbed = new EmbedBuilder()
                .setTitle('🎮 Quiz Game')
                .setDescription('### Appuyez sur Start pour commencer une nouvelle partie !\n\n### ©Dispatch.IO - 2025')
                .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 512 }))
                .setImage('https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWs0dno1cWtyNmVkbG95NnIwdGc5cGhhZHJwbm1oM24yaTRyaXVuNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RJnkr3vKutCblyepMW/giphy.gif')
                .setColor(guildData.botColor || '#f40076');

            const startButton = new ButtonBuilder()
                .setCustomId('start_game')
                .setLabel('Start')
                .setStyle(ButtonStyle.Success);
            const stopButton = new ButtonBuilder()
                .setCustomId('stop_game')
                .setLabel('Annuler')
                .setStyle(ButtonStyle.Danger);

            const startRow = new ActionRowBuilder().addComponents(startButton, stopButton);

            const startMessage = await interaction.reply({
                embeds: [startEmbed],
                components: [startRow],
                fetchReply: true
            });

            const collector = startMessage.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 1800000
            });

            collector.on('collect', async (i) => {
                try {
                    if (i.user.id !== interaction.user.id) {
                        return i.reply({ content: 'Ce n\'est pas votre partie !', ephemeral: true });
                    }

                    await i.deferUpdate();

                    if (i.customId === 'start_game') {
                        const difficultyEmbed = new EmbedBuilder()
                            .setTitle('🎮 Sélectionnez la difficulté')
                            .setDescription('### Choisissez votre niveau de difficulté\n\n### ©Dispatch.IO - 2025')
                            .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 512 }))
                            .setImage('https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWs0dno1cWtyNmVkbG95NnIwdGc5cGhhZHJwbm1oM24yaTRyaXVuNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RJnkr3vKutCblyepMW/giphy.gif')
                            .setColor(guildData.botColor || '#f40076');

                        const difficultyButtons = Object.values(DIFFICULTIES).map(diff => 
                            new ButtonBuilder()
                                .setCustomId(`diff_${diff}`)
                                .setLabel(diff)
                                .setStyle(ButtonStyle.Primary)
                        );

                        const difficultyRow = new ActionRowBuilder().addComponents(difficultyButtons);

                        await i.editReply({
                            embeds: [difficultyEmbed],
                            components: [difficultyRow]
                        });
                    }
                    else if (i.customId === 'stop_game'){
                        collector.stop();
                    }
                    else if (i.customId.startsWith('diff_')) {
                        selectedDifficulty = i.customId.replace('diff_', '');
                        
                        const categoryEmbed = new EmbedBuilder()
                            .setTitle('🎮 Sélectionnez la catégorie')
                            .setDescription('### Choisissez votre catégorie, une fois choisis patienter !\n\n### ©Dispatch.IO - 2025')
                            .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 512 }))
                            .setImage('https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWs0dno1cWtyNmVkbG95NnIwdGc5cGhhZHJwbm1oM24yaTRyaXVuNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RJnkr3vKutCblyepMW/giphy.gif')
                            .setColor(guildData.botColor || '#f40076');

                        const categoryButtons = Object.values(CATEGORIES).map(cat => 
                            new ButtonBuilder()
                                .setCustomId(`cat_${cat}`)
                                .setLabel(cat)
                                .setStyle(ButtonStyle.Primary)
                        );

                        const categoryRows = [];
                        for (let j = 0; j < categoryButtons.length; j += 3) {
                            categoryRows.push(
                                new ActionRowBuilder().addComponents(categoryButtons.slice(j, j + 3))
                            );
                        }

                        await i.editReply({
                            embeds: [categoryEmbed],
                            components: categoryRows
                        });
                    }

                    else if (i.customId.startsWith('cat_')) {
                        selectedCategory = i.customId.replace('cat_', '');
                        currentQuestion = 0;
                        score = 0;
                        await showQuestion(i);
                    }

                    else if (i.customId.startsWith('answer_')) {
                        const answerIndex = parseInt(i.customId.split('_')[1]);
                    
                        if (answerIndex === currentQuestionData.correctIndex) {
                            score++;
                        }
                    
                        const resultEmbed = new EmbedBuilder()
                            .setTitle(answerIndex === currentQuestionData.correctIndex ? '✅ Correct!' : '❌ Incorrect!')
                            .setDescription(`### ${currentQuestionData.explanation}\n\n### ©Dispatch.IO - 2025`)
                            .setColor(answerIndex === currentQuestionData.correctIndex ? '#00ff00' : '#ff0000')
                            .setFooter({ text: `Score actuel: ${score}/${currentQuestion}` })
                            .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 512 }))
                            .setImage('https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWs0dno1cWtyNmVkbG95NnIwdGc5cGhhZHJwbm1oM24yaTRyaXVuNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RJnkr3vKutCblyepMW/giphy.gif');

                        // Création des boutons
                        const nextButton = new ButtonBuilder()
                            .setCustomId('next_question')
                            .setLabel('Passez à la question suivante')
                            .setStyle(ButtonStyle.Success);

                        const stopButton = new ButtonBuilder()
                            .setCustomId('stop_game')
                            .setLabel('Terminer la partie')
                            .setStyle(ButtonStyle.Danger);

                        // Répondre à l'interaction avec l'embed et les boutons
                        await i.editReply({
                            embeds: [resultEmbed],
                            components: [new ActionRowBuilder().addComponents(nextButton, stopButton)] // Ajout des deux boutons
                        });

                        // Collecteur d'interactions
                        const filter = (buttonInteraction) =>
                            (buttonInteraction.customId === 'next_question' || buttonInteraction.customId === 'stop_game') &&
                            buttonInteraction.user.id === interaction.user.id;

                        const collector = i.channel.createMessageComponentCollector({ filter, time: 15000 }); // 15 secondes pour répondre

                        collector.on('collect', async (buttonInteraction) => {
                            // Si l'utilisateur clique sur "Terminer la partie"
                            if (buttonInteraction.customId === 'stop_game') {
                                // Arrêter le collector et afficher un message de fin
                                collector.stop();
                                
                                const finalEmbed = new EmbedBuilder()
                                    .setTitle('🏆 Partie terminée!')
                                    .setDescription(`### Score final: ${score}/${currentQuestion}\n<@${interaction.member.id}\n\n\`### ©Dispatch.IO - 2025\``)
                                    .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 512 }))
                                    .setImage('https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWs0dno1cWtyNmVkbG95NnIwdGc5cGhhZHJwbm1oM24yaTRyaXVuNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RJnkr3vKutCblyepMW/giphy.gif')
                                    .setColor(guildData.botColor || '#f40076');

                                await buttonInteraction.editReply({
                                    embeds: [finalEmbed],
                                    components: [] // Retirer les boutons après la fin de la partie
                                });
                            } else if (buttonInteraction.customId === 'next_question') {
                                // Si l'utilisateur clique sur "Passez à la question suivante"
                                collector.stop();

                                // Passer à la question suivante
                                if (currentQuestion < 20) {
                                    await showQuestion(buttonInteraction);
                                } else {
                                    const finalEmbed = new EmbedBuilder()
                                        .setTitle('🏆 Partie terminée!')
                                        .setDescription(`### Score final: ${score}/20\n<@${interaction.member.id}>\n\n### ©Dispatch.IO - 2025`)
                                        .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 512 }))
                                        .setImage('https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWs0dno1cWtyNmVkbG95NnIwdGc5cGhhZHJwbm1oM24yaTRyaXVuNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RJnkr3vKutCblyepMW/giphy.gif')
                                        .setColor(guildData.botColor || '#f40076');

                                    await interaction.editReply({
                                        embeds: [finalEmbed],
                                        components: [] // Retirer les boutons après la fin de la partie
                                    });
                                }
                            }
                        });
                        collector.on('end', async (collected, reason) => {
                            if (reason === 'time') {
                                await i.editReply({
                                    content: 'Oh non, le temps est écoulé ! 🕹️',
                                    components: []
                                });
                                await interaction.deleteReply();
                            }
                        });
                    }
                } catch (error) {
                    console.error('Erreur lors du traitement de l\'interaction:', error);
                    try {
                        await i.editReply({
                            content: 'Une erreur est survenue. Veuillez réessayer.',
                            components: []
                        });
                    } catch (e) {
                        console.error('Erreur lors de la notification d\'erreur:', e);
                    }
                }
            });

            collector.on('end', () => {
                if (currentQuestion < 20) {
                    interaction.editReply({
                        content: '### La partie est fini ! 🕹️',
                        embeds: [],
                        components: []
                    }).catch(console.error);
                }
            });

            async function showQuestion(i) {
                currentQuestion++;
                try {
                    currentQuestionData = await generateQuestion(selectedCategory, selectedDifficulty);

                    if (currentQuestionData.question.length > 80) {
                        currentQuestionData.question = currentQuestionData.question.slice(0, 80) + '...';
                    }

                    const questionEmbed = new EmbedBuilder()
                        .setTitle(`Question ${currentQuestion}/20`)
                        .setDescription(`### ${currentQuestionData.question}\n\n### ©Dispatch.IO - 2025`)
                        .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 512 }))
                        .setImage('https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWs0dno1cWtyNmVkbG95NnIwdGc5cGhhZHJwbm1oM24yaTRyaXVuNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RJnkr3vKutCblyepMW/giphy.gif')
                        .setColor(guildData.botColor || '#f40076')
                        .setFooter({ text: `Score actuel: ${score}/${currentQuestion - 1}` });

                    const answerButtons = currentQuestionData.options.map((option, index) => 
                        new ButtonBuilder()
                            .setCustomId(`answer_${index}`)
                            .setLabel(option)
                            .setStyle(ButtonStyle.Primary)
                    );

                    const answerRows = [];
                    // Mélanger les boutons de manière aléatoire
                    answerButtons.sort(() => Math.random() - 0.5);

                    for (let j = 0; j < answerButtons.length; j += 2) {
                        answerRows.push(
                            new ActionRowBuilder().addComponents(answerButtons.slice(j, j + 2))
                        );
                    }


                    await i.editReply({
                        embeds: [questionEmbed],
                        components: answerRows
                    });
                } catch (error) {
                    console.error('Error showing question:', error);
                    await i.editReply({
                        content: 'Une erreur est survenue lors de la génération de la question. Veuillez réessayer.',
                        components: []
                    });
                    collector.stop();
                }
            }
        },
    };