import { EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const fieldsToCheck = [
    { field: 'admin_role', type: 'string', regex: /^\d+$/ }, 
    { field: 'mod_role', type: 'string', regex: /^\d+$/ },
    { field: 'member_role', type: 'string', regex: /^\d+$/ },
    { field: 'welcome_channel', type: 'string', regex: /^\d+$/ },
    { field: 'radio_channel', type: 'string', regex: /^\d+$/ },
    { field: 'logs_raid_channel', type: 'string', regex: /^\d+$/ },
    { field: 'logs_member_channel', type: 'string', regex: /^\d+$/ },
    { field: 'logs_server_channel', type: 'string', regex: /^\d+$/ },
    { field: 'rules_channel', type: 'string', regex: /^\d+$/ },
];

async function checkGuildConfig(guildId, interaction) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const filePath = path.join(__dirname, '../', 'guilds-data', `${guildId}.json`);
    
    try {
        if (!fs.existsSync(filePath)) {
            return interaction.reply({
                content: "Le fichier de configuration de cette guild n'existe pas.",
                ephemeral: true,
            });
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let updated = false;
        const deletedFields = []; // Liste des champs supprimés

        // Vérification et suppression des champs invalides
        fieldsToCheck.forEach(({ field, type, regex }) => {
            if (data[field]) {
                // Si une regex est fournie, vérifiez la validité du champ
                if (regex && !regex.test(data[field])) {
                    deletedFields.push({ field, value: data[field] });
                    delete data[field];
                    updated = true;
                } 
                // Si le type ne correspond pas à 'string', supprimez également le champ
                else if (typeof data[field] !== type) {
                    deletedFields.push({ field, value: data[field] });
                    delete data[field];
                    updated = true;
                }
            }
        });

        // Si des champs ont été supprimés, on met à jour le fichier et on envoie un embed
        if (updated) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4));

            const embed = new EmbedBuilder()
                .setColor(0xFF0000) // Rouge pour signaler une erreur
                .setTitle("Configuration mise à jour")
                .setDescription("Certains champs invalides ont été détectés et supprimés. Vous devez les reconfigurer avec la commande `/config`.")
                .addFields(
                    deletedFields.map(field => ({
                        name: field.field,
                        value: `\`${field.value}\``,
                        inline: true,
                    }))
                )
                .setFooter({ text: "Utilisez /config pour reconfigurer ces champs." })
                .setTimestamp();

            // Envoi dans le salon de logs si l'ID existe
            const logsChannel = await interaction.guild.channels.fetch(data.logs_server_channel);
            if (logsChannel) {
                return logsChannel.send({ embeds: [embed] });
            } else {
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }

    } catch (error) {
        console.error(error);
        return interaction.reply({
            content: "Une erreur s'est produite lors de la vérification de la configuration. [500] 🔴",
            ephemeral: true,
        });
    }
}

export default checkGuildConfig;
