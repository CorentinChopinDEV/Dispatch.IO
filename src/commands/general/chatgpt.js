const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { env } = require('process');

// Charger les données de la guilde
function loadGuildData(guildPath) {
    try {
        if (fs.existsSync(guildPath)) {
            const data = fs.readFileSync(guildPath, 'utf-8');
            return JSON.parse(data);
        } else {
            console.log(`Création d'un nouveau fichier pour la guilde ${guildPath}`);
            return {};
        }
    } catch (err) {
        console.error('Erreur lors du chargement des données de la guilde:', err);
        return {};
    }
}

// Sauvegarder les données de la guilde
function saveGuildData(guildPath, data) {
    try {
        fs.writeFileSync(guildPath, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`Données sauvegardées pour la guilde ${guildPath}`);
    } catch (err) {
        console.error('Erreur lors de la sauvegarde des données de la guilde:', err);
    }
}

// Gestion des erreurs API
async function handleApiError(error, interaction) {
    console.error('Erreur API ChatGPT:', error);

    if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error?.message || 'Erreur inconnue.';

        const errorMessages = {
            429: 'L\'API est actuellement limitée. Veuillez réessayer dans quelques minutes.',
            401: 'Erreur d\'authentification avec l\'API OpenAI. Veuillez vérifier la clé API.',
            403: 'Accès interdit. Veuillez vérifier les permissions de l\'API.',
            500: 'Les serveurs OpenAI rencontrent des problèmes. Veuillez réessayer plus tard.',
            503: 'Le service OpenAI est temporairement indisponible. Veuillez réessayer plus tard.'
        };

        const errorMessage = errorMessages[status] || `Erreur API OpenAI : ${message}`;
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription(errorMessage)
            .setTimestamp();

        await interaction.reply({ 
            embeds: [errorEmbed],
            ephemeral: true 
        });
        return;
    }

    // Erreurs réseau ou inconnues
    await interaction.reply({
        content: 'Une erreur inattendue est survenue lors de la requête à ChatGPT. Veuillez réessayer plus tard.',
        ephemeral: true
    });
}

module.exports = {
    data: {
        name: 'chatgpt',
        description: 'Pose une question à ChatGPT, mais attention aux limites d\'utilisation !',
        options: [
            {
                name: 'question',
                type: 3,
                description: 'La question que vous souhaitez poser à ChatGPT',
                required: true,
            }
        ],
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        let guildData = loadGuildData(filePath);

        // Initialisation du compteur d'utilisations si non défini
        if (!guildData.chatgptUsage) {
            guildData.chatgptUsage = 10;
        }

        // Vérification de la limite d'utilisations
        if (guildData.chatgptUsage <= 0 && interaction.user.id !== env.IDOWNER) {
            const limitEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Limite Atteinte')
                .setDescription('Désolé, ce serveur a atteint sa limite d\'utilisations de ChatGPT. Veuillez réessayer plus tard.')
                .setTimestamp();

            return interaction.reply({ 
                embeds: [limitEmbed],
                ephemeral: true 
            });
        }

        // Diminution du compteur d'utilisations
        if(interaction.user.id !== env.IDOWNER){
            guildData.chatgptUsage -= 1;
        }
        saveGuildData(filePath, guildData);

        const question = interaction.options.getString('question');
        if (!question) {
            return interaction.reply({
                content: 'Veuillez fournir une question pour ChatGPT.',
                ephemeral: true
            });
        }
        // Afficher l'indicateur de frappe
        await interaction.deferReply();

        try {
            const response = await axios.post('https://api.skyway-bot.fr/v1/gpt', {
                "content": question
            }, {
                headers: {
                    "Authorization": env.SKYWAY_KEY
                }
            });
            let content = response.data.content;
            let usageAI = null;
            if(interaction.user.id === env.IDOWNER){
                usageAI = 'Aucune limitation.';
            }else{
                usageAI = guildData.chatgptUsage;
            }
            content = content.replace('-# Utilisation de l\'API gratuite de [SkyWay](<https://www.skyway-bot.fr/>).', '');
            const responseEmbed = new EmbedBuilder()
                .setTitle(`❓| ${question}`)
                .setDescription(`## ${question} \n\n\`\`\`${content}\`\`\``)
                .setColor(guildData.botColor || '#f40076')
                .setFooter({ 
                    text: `Utilisations restantes : ${usageAI} | Propulsé par SkyWay`,
                    iconURL: interaction.guild.iconURL() 
                })
                .setImage('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXFxcW1lOTZiaWtjcnFib3k5dGVxd3hrcDB1azQ3ejY1cWFscDhoeiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/vSdMuEeAApptJgcDbO/giphy.gif')
                .setTimestamp();

            await interaction.editReply({ embeds: [responseEmbed] });
        } catch (error) {
            await handleApiError(error, interaction);
            
            // Remboursement de l'utilisation en cas d'erreur
            guildData.chatgptUsage += 1;
            saveGuildData(filePath, guildData);
        }
    },
};