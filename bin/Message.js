const { Client, Intents, MessageEmbed, MessageActionRow, MessageButton, ActionRowBuilder, SelectMenuBuilder } = require('discord.js');
const channels = {
    general: '919419935359377418',
}
let client;
let db;
const _tab = "               "
class Message {
    constructor(objClient, objDb) {
        client = objClient;
        db = objDb;
    }

    leave(type, object) {
        const title = `Matricule ${object.matricule} (${object.displayName}) ${type === "server" ? "a quitté le serveur" : "n'est plus E.M.S"}`;
        const embeds = new MessageEmbed().setColor('#E04C4C').setTitle(title).setDescription(`La détection automatique a détecté que <@${object.id}> n'est plus E.M.S `);
        client.channels.cache.get('1008874948544168067').send({embeds: [embeds]});
    }

    profil(interaction, count, today) {
        const embeds = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(':information_source:   Votre profile de la semaine')
            .setDescription("Voici vos informations")
            .addField("Aujourd\'hui",  `${today} réanimations`, true)
            .addField('Cette semaine', `${count} réanimations`, true)
            .setImage('https://i.goopics.net/6e9pt2.png')
        interaction.reply({embeds: [embeds], ephemeral: true});
    }

    help(message) {
        const embeds = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(':information_source:   Emergency Medical Service')
            .setDescription("Version autorisé pour `EMS-DynastyRP` sous l'autorité <@270604640536625153>")
            .addField("GitHub Creator",  `[@HugoCLI](https://github.com/HugoCLI/discord-ems-dispatcher)`, true)
            .addField('Discord Creator', `Hyugo#8834`, true)
        message.channel.send({content: `<@${message.author.id}>`, embeds: [embeds]});
    }

    recap(id, time_service, moy_rea, count) {
        let embeds = new MessageEmbed().setColor('#0099ff') .setTitle(":hospital:     A terminé son service avec " + count + " réanimations").setDescription("La durée totale du service est de " + time_service + ".\nMoyenne de réanimation :  1 réanimation en "+moy_rea);
        client.channels.cache.get("1003407882471096341").send({
            content: '<@' + id + '>',
            embeds: [embeds]
        });
    }

    refreshService(agents) {
        let _online = "";
        let _online_count = 0;
        let _service = "";
        let _service_count = 0;

        for (const [key, value] of Object.entries(agents)) {
            const matricule = value.agent.matricule < 10 ? "0" + value.agent.matricule : value.agent.matricule;
            const id = value.id ? value.id : "-";
            let radio = "-";
            if(value.agent.steam) radio = value.agent.steam;
            let space = "";
            for(let i = 0; i < 65 - radio.length * 2; i++) space+=" ";

            if(value.status.is_online && !value.status.is_service) {
                _online += `${_tab}**${matricule}** ${_tab} ID    **${id}** ${_tab}    RA  **${value.agent.steam}** ${space}<@${key}>\n`;
                _online_count +=1
            }
            if(value.status.is_online && value.status.is_service) {
                _service += `${_tab}**${matricule}** ${_tab} ID    **${id}** ${_tab}    RA  **${value.agent.steam}** ${space}<@${key}>\n`;
                _service_count +=1
            }
        }

        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setLabel('Démarrer mon service')
                    .setCustomId('service-start')
                    .setStyle('SUCCESS'),
                new MessageButton()
                    .setLabel('Arrêter mon service')
                    .setCustomId('service-stop')
                    .setStyle('DANGER'),
                new MessageButton()
                    .setLabel('Ajouter une réanimation')
                    .setCustomId('service-addOne')
                    .setStyle('SECONDARY'),
                new MessageButton()
                    .setLabel('Je me suis fait tuer')
                    .setCustomId('service-freekill')
                    .setStyle('PRIMARY'),
                new MessageButton()
                    .setLabel('Voir mon profil')
                    .setCustomId('service-profil')
                    .setStyle('SECONDARY')
            );

        const content = `**:hospital:      Emergency Medical Service**\n\nVous pouvez démarrer ou mettre fin à vos services en cliquant sur le bouton ci-dessous\n\n            RA : Nom sur la radio           ID : Identifiant en jeu\n\n\n**Agents en service (${_service_count})**\n\n${_service}\n\n**Agents hors service (${_online_count})**\n\n${_online}\n\nOver.`;
        client.guilds.cache.get('919412539492798514').channels.cache.get('1005531366391283772').messages.fetch('1005534841003065474').then(message => message.edit({content: content,  components: [row]}));
    }

    warn(agent, reason) {
        console.log(reason);
        const embeds = new MessageEmbed()
            .setColor('#FF8700')
            .setTitle(`:warning:   Vous avez reçu un avertissement`)
            .setDescription(reason)

        client.channels.cache.get("1008874948544168067").send({
            content: '<@' + agent.id + '>',
            embeds: [embeds]
        });
    }

    freekill(interaction, agent) {
        const embeds = new MessageEmbed()
            .setColor('#1A9166')
            .setTitle(`:skull:   Votre mort a été enregistrée`)
            .setDescription("Votre mort par un joueur a bien été enregistrée")
        interaction.reply({embeds: [embeds], ephemeral: true});
        db.query(`INSERT INTO freekill( agent_id ) VALUES ( '${interaction.member.user.id}' )`);
    }

    add(message, agent, count, total) {
        const embeds = new MessageEmbed()
            .setColor('#1A9166')
            .setTitle(':white_check_mark:   Réanimation enregistré')
            .setDescription("Vos réanimations ont bien été enregistrées")
            .addField('Ajouté   ', `**${count} réanimations**`, true)
            .addField('Total   ', `**${total} réanimations**`, true)
        message.channel.send({content: `<@${agent.id}>`, embeds: [embeds]});
    }

    salaire(message, string) {
        const embeds = new MessageEmbed()
            .setColor('#4C94E0')
            .setTitle(':moneybag: Voici la liste des salaires ')
            .setDescription("Voici les informations des salaires de la semaine\n\n" + string)
        message.channel.send({content: '<@' + message.author.id + '>', embeds: [embeds]});
    }

}




module.exports = Message;