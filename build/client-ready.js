import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import dotenv from 'dotenv';

dotenv.config();

async function refreshCommands(client, commands) {
    const rest = new REST({ version: '10' }).setToken(client.token);

    try {
        console.log('Started refreshing application (/) commands for all guilds.');

        for (const guild of client.guilds.cache.values()) {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guild.id),
                { body: commands },
            );
            console.log(`Commands successfully registered for guild: ${guild.name} (${guild.id})`);
        }

        console.log('Successfully reloaded application (/) commands for all guilds.');
    } catch (error) {
        console.error('An error occurred while refreshing commands:', error);
    }
}

export default refreshCommands;
