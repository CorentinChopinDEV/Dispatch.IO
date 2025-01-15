import pkg from 'discord.js';
const { EmbedBuilder, AttachmentBuilder } = pkg;

async function premiumClose(thread, guildId, client) {
    try {
        if (guildId !== '1212777500565045258') return;

        const FORUM_CHANNEL_ID = '1325922867937939548';

        // Vérifiez si le thread appartient au bon forum
        if (!thread || !thread.guild || thread.parent?.id !== FORUM_CHANNEL_ID) {
            console.warn('Thread invalide ou parent incorrect.');
            return;
        }

        const threadTitle = thread.name || 'Titre inconnu';
        const threadDescription = thread.id || 'Aucun identifiant';
        const closedAt = new Date();
        let createdBy = 'Inconnu';

        // Tentez de récupérer le créateur du thread
        try {
            const owner = await thread.fetchOwner();
            createdBy = owner?.user?.id || 'Inconnu';
        } catch (fetchOwnerError) {
            console.warn('Impossible de récupérer le créateur du thread:', fetchOwnerError.message);
        }
        const auditLogs = await thread.guild.fetchAuditLogs({
            type: 111,
            limit: 1,
        });
        const logEntry = auditLogs.entries.find(entry =>
            entry.action === 111 &&
            entry.targetId === thread.id
        );
        let closedBy = 'Inconnu...';
        if (logEntry) {
            closedBy = logEntry.executorId || 'Inconnu';
        } else {
            console.warn('Aucune action correspondant à la fermeture du thread trouvée.');
        }

        // Récupération de l'historique des messages
        let history = 'Historique non disponible.';
        try {
            const messages = await thread.messages.fetch({ limit: 100 });
            if (messages.size > 0) {
                history = messages
                    .map(msg => `[${msg.createdAt.toISOString()}] ${msg.author.tag}: ${msg.content || 'Fichier ou Embed'}`)
                    .reverse()  // Inverser l'ordre des messages
                    .join('\n');
            }
        } catch (historyError) {
            console.warn('Impossible de récupérer l’historique des messages:', historyError.message);
        }

        // Création du fichier texte avec l'historique
        const historyFile = new AttachmentBuilder(Buffer.from(history, 'utf-8'), { name: `${threadTitle}_history.txt` });

        // Création de l'embed
        const embed = new EmbedBuilder()
            .setTitle('BDA Premium fermé')
            .setDescription(`### Un Besoin d'aide Premium a été fermé.\n*Identifiant de la demande: ${threadDescription}*`)
            .addFields(
                { name: 'Titre du thread', value: threadTitle, inline: false },
                { name: 'Ouvert par', value: `<@${createdBy}> \`${createdBy}\``, inline: true },
                { name: 'Fermé par', value: `<@${closedBy}> \`${closedBy}\``, inline: true },
                { name: 'Date de fermeture', value: closedAt.toLocaleString(), inline: false }
            )
            .setColor('#c86fc9')
            .setThumbnail(thread.guild.iconURL()) // Icône du serveur
            .setFooter({
                text: 'Historique des messages au format text ci-dessous.',
                iconURL: client.user.displayAvatarURL()
            });

        // Envoi du message privé
        const targetUser = thread.guild.members.cache.get('802196198856458281'); // Remplacez par l'ID de la personne cible
        if (targetUser) {
            await targetUser.send({
                embeds: [embed]
            });
            await targetUser.send({
                files: [historyFile]
            });
            console.log('Message privé envoyé avec succès.');
        } else {
            console.warn('Utilisateur cible introuvable.');
        }
    } catch (error) {
        console.error('Erreur dans premiumClose :', error);
    }
}

export default premiumClose;
