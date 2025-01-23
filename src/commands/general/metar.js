const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
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


function getFlightRules(ceiling, visibility) {
    if (ceiling >= 3000 && visibility >= 5) return 'VFR';
    if (ceiling >= 1000 && visibility >= 3) return 'MVFR';
    if (ceiling >= 500 && visibility >= 1) return 'IFR';
    return 'LIFR';
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}${minutes}Z`;
}

function celsiusToFahrenheit(celsius) {
    return Math.round((celsius * 9/5) + 32);
}

function metersToMiles(meters) {
    return (meters / 1609.34).toFixed(1);
}

function hpaToInHg(hpa) {
    return (hpa * 0.02953).toFixed(2);
}

module.exports = {
    data: {
        name: 'metar',
        description: 'Récupère le METAR d\'un aéroport',
        options: [{
            name: 'oaci',
            description: 'Code OACI de l\'aéroport (ex: LFPG)',
            type: 3,
            required: true
        }]
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        
        const oaci = interaction.options.getString('oaci').toUpperCase();
        
        try {
            const response = await fetch(`https://avwx.rest/api/metar/${oaci}`, {
                headers: {
                    'Authorization': env.AVWX_API_KEY
                }
            });

            if (!response.ok) {
                throw new Error('Station non trouvée ou erreur API');
            }

            const data = await response.json();
            
            // Calcul des règles de vol
            const ceiling = data.clouds.length > 0 ? data.clouds[0].height : 99999;
            const visibility = data.visibility.value;
            const flightRules = getFlightRules(ceiling, visibility);
            
            // Formatage de l'heure d'observation
            const timeSince = Math.floor((Date.now() - new Date(data.time.dt).getTime()) / (1000 * 60 * 60));
            const observationTime = `${formatTimestamp(data.time.dt)} (il y a ${timeSince} heure${timeSince > 1 ? 's' : ''})`;
            const embed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle(`🛫 METAR - ${data.station}`)
                .addFields(
                    { 
                        name: 'Retour METAR',
                        value: `\`\`\`${data.raw}\`\`\``,
                    },
                    {
                        name: 'Signalement lisible',
                        value: [
                            ``,
                            `🛫 **Station**: \n${oaci} (${data.station || 'Unknown'})`,
                            ``,
                            `🕰️ **Observée à**:\n ${observationTime}`,
                            ``,
                            `🍃 **Vent**: \n${data.wind_direction.repr}-${data.wind_direction.value} at ${data.wind_speed.value}${data.units.wind_speed}`,
                            ``,
                            `👀 **Visibilité**:\n ${data.visibility.value}${data.units.visibility} (${metersToMiles(data.visibility.value)}sm)`,
                            ``,
                            `🌡️ **Température**:\n ${data.temperature.value}°C (${celsiusToFahrenheit(data.temperature.value)}°F)`,
                            ``,
                            `💧 **Point de rosé**:\n ${data.dewpoint.value}°C (${celsiusToFahrenheit(data.dewpoint.value)}°F)`,
                            ``,
                            `🌍 **Altimétre**:\n ${data.altimeter.value} ${data.units.altimeter} (${hpaToInHg(data.altimeter.value)} inHg)`,
                            ``,
                            `🌧️ **Nuages**:\n ${data.clouds.map(cloud => 
                                `${cloud.repr}ft`
                            ).join(', ')} - Signalement AGL`,
                            ``,
                            `🧑‍✈️ **Règle de vol**:\n ${flightRules}`
                        ].join('\n')
                    }
                )
                .setFooter({
                    text: `• Source: AVWX•${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}`,
                    iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
                });
            await interaction.editReply({ content: '', embeds: [embed] });
            
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle('❌ Erreur')
                .setDescription(`Impossible de récupérer le METAR. Vérifiez que le code OACI est correct.\n${error}`)
                .setFooter({
                    text: `Demandé par ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });

            await interaction.editReply({ content: '', embeds: [errorEmbed] });
        }
    },
};