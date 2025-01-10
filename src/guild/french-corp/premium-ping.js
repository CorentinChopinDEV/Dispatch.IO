async function premiumPing(thread, guildId){
    if(guildId === '1212777500565045258'){
        const MENTION_SUPPORT = '1213149235965595688';
        const FORUM_CHANNEL_ID = '1325922867937939548';
        try {
            if (thread.parent && thread.parent.id === FORUM_CHANNEL_ID) {
                const roleMention = `<@&${MENTION_SUPPORT}>`;
                await thread.send(`${roleMention}\n**Ce besoin d'aide premium vous attends !**`);
            }
        } catch (error) {
            console.error('Erreur lors de la mention du rôle:', error);
        }
    }
}
export default premiumPing;