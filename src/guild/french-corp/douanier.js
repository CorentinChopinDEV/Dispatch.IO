async function protectionBOTCheck(client) {
    client.guilds.cache.forEach(async guild => {
        if(guild.id === '1212777500565045258'){
            
            const members = await guild.members.fetch();
            const protectionBotRoleId = '1225026301870473288'; // Rôle Protection BOT
            const membresRoleId = '1213149429859618926';
            members.forEach(member => {
                if (member.roles.cache.has(protectionBotRoleId) && member.roles.cache.has(membresRoleId)) {
                    // Retirer le rôle Protection BOT si l'utilisateur a aussi le rôle Membres
                    member.roles.remove(protectionBotRoleId)
                        .then(() => {
                            console.log(`Rôle "Protection BOT" retiré de ${member.user.tag} (ID: ${member.id})`);
                        })
                        .catch(err => {
                            console.error(`Erreur en retirant le rôle "Protection BOT" de ${member.user.tag}: ${err}`);
                        });
                }
            });
        }
    });
}
export default protectionBOTCheck;