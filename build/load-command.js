const fs = require('fs');
const path = require('path');

const loadCommands = (dir, client, commands) => {
    const commandFiles = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of commandFiles) {
        if (file.isDirectory()) {
            loadCommands(path.join(dir, file.name), client, commands);
        } else if (file.name.endsWith('.js')) {
            const command = require(path.join(dir, file.name));
            if (!command.data || !command.data.name) {
                console.error(`The command at ${file.name} is missing a required "data" or "name" property.`);
                continue;
            }
            command.client = client;
            client.commands.set(command.data.name, command);
            commands.push(command.data);
        }
    }
};
module.exports = loadCommands;