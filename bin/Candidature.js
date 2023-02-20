const { Client, Intents, MessageEmbed, MessageActionRow, MessageButton, ActionRowBuilder, SelectMenuBuilder } = require('discord.js');
const Message = require('./Message');
const fs = require('fs-extra');

let message;
let client;
let roles;
let db;
let recrutement = false;
fs.readFile(__dirname + "/data/recrutement.db", 'utf8', (err, data) => {
    if (err) return;
    recrutement = data === "true" ? true : false;
    console.log("Recrutement is "+recrutement);
});



class Candidature {
    constructor(objClient, objDb, objRoles) {
        client = objClient;
        roles = objRoles;
        db = objDb;
    }
    start(interaction) {
        if(!recrutement) return interaction.reply({
            content: ":x:   Les recrutements sont actuellement fermé. Veuillez réessayer ultèrieurement ",
            ephemeral: true
        });
        db.query(`SELECT * FROM agents WHERE agent_id = '${interaction.member.user.id}'`, async function (err, result) {
            if (result.length > 0 && result[0].archived === 1 && result[0].blacklist === 0 || result.length === 0 || interaction.member.user.id === '270604640536625153') {
                db.query(`SELECT * FROM candidatures WHERE player_id = '${interaction.member.user.id}'  ORDER BY id DESC`, async function (err, result) {
                    if (result.length > 0) {
                        const date = new Date(result[0].datetime).getTime();
                        if (result[0].close === 0)
                            return interaction.reply({
                                content: ":x:   Vous avez déjà une candidature en cours",
                                ephemeral: true
                            });

                    }

                    let cate = interaction.guild.channels.cache.find((c) => c.id === "1006857651075960852")
                    if (!cate) return console.log('error category ticket');
                    let channel = await interaction.guild.channels.create("candidat-" + interaction.member.user.username.toLowerCase(), {
                        type: "text",
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id,
                                deny: ["VIEW_CHANNEL"],
                            }
                        ],

                    }).then(channel => channel.setParent(cate))


                    channel.permissionOverwrites.edit(interaction.user, {SEND_MESSAGES: true, VIEW_CHANNEL: true});
                    channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                        VIEW_CHANNEL: false,
                        SEND_MESSAGES: false
                    });

                    interaction.reply({
                        content: `:white_check_mark:   C'est partis ! Clique juste ici : <#${channel.id}>`,
                        ephemeral: true
                    });

                    let embeds = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle("C'est par ici " + interaction.member.user.username)
                        .setDescription("Voici mon fonctionnement, je vais vous posez des questions, vous avez tout le temps d'y répondre, dés que vous avez terminé de répondre à la question, cliquer sur \"Suivant\" sous la question posée. \n\n**Quand vous avez cliquez : vous ne pouvez pas revenir en arrière**");
                    console.log('Candidature '+interaction.member.user.username+" open");
                    const row = new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setLabel('Commencer')
                                .setCustomId('recrutement-question')
                                .setStyle('PRIMARY'),
                        );

                    let message = await client.channels.cache.get(channel.id).send({
                        content: '<@' + interaction.member.user.id + '>',
                        components: [row],
                        embeds: [embeds]
                    });
                    db.query(`INSERT INTO candidatures( player_id, channel_id, last_message_id ) VALUES ( '${interaction.member.user.id}', '${channel.id}', '${message.id}' )`);
                });

            } else {
                interaction.reply({content: ":x:  Vous n'êtes pas illegible", ephemeral: true});
            }

        });
    }

    question(interaction) {
        db.query(`SELECT *
                  FROM candidatures
                  WHERE player_id = '${interaction.member.user.id}' AND close = 0`, async function (err, result) {
            if (result.length === 0) return;
            let data = result[0];
            if (interaction.customId.length > 20) {
                let response = "";
                const channel = await client.channels.cache.get(data.channel_id);
                await channel.messages.fetch().then(messages => {
                    messages.forEach((message) => {
                        if (message.author.id === data.player_id) {
                            response += message.content.trim();
                        }
                    })
                })
                if (response === "") {
                    let embeds = new MessageEmbed()
                        .setColor('#E33B3B')
                        .setTitle("Vous n'avez pas répondu à la question")
                        .setDescription("Veuillez répondre en écrivant en dessous.")

                    interaction.reply({
                        embeds: [embeds]
                    });
                    return false;
                }


                const dbtype = interaction.customId.split(':')[1];
                db.query(`UPDATE candidatures
                          SET ${dbtype} = '${btoa(unescape(encodeURIComponent(response)))}'
                          WHERE id = ${data.id}`);
                data[dbtype] = response;


                if (dbtype === "avis_bot") {
                    let channel = client.channels.cache.get(data.channel_id);
                    channel.permissionOverwrites.edit(interaction.user, {SEND_MESSAGES: false, VIEW_CHANNEL: true});
                    let embeds = new MessageEmbed()
                        .setColor('#0099ff')

                        .setTitle("Parfait ! votre candidature a été envoyé")
                        .setDescription("Vous recevrez une réponse dans les 24 heures maximum, la réponse à votre candidature sera disponible dans <#919414491609956382> \n\n*Suppression automatique dans **20 secondes***")


                    client.channels.cache.get(data.channel_id).bulkDelete(100);
                    client.channels.cache.get(data.channel_id).send({
                        content: '<@' + interaction.member.user.id + '>',
                        embeds: [embeds]
                    });
                    embeds = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle(interaction.member.user.username)
                        .addFields({name: 'Age', value: decodeURIComponent(escape(atob(data.age))), inline: false})
                        .addFields({
                            name: 'Nom / Prénom',
                            value: decodeURIComponent(escape(atob(data.nom))).toUpperCase() + " / " + decodeURIComponent(escape(atob(data.prenom))),
                            inline: false
                        })
                        .addFields({
                            name: 'Faites vous de l\'illégal',
                            value: decodeURIComponent(escape(atob(data.illegal))),
                            inline: false
                        })
                        .addFields({
                            name: 'Disponibilités',
                            value: decodeURIComponent(escape(atob(data.disponibilite))),
                            inline: false
                        })
                        .addFields({
                            name: 'Motivation',
                            value: decodeURIComponent(escape(atob(data.motivation))),
                            inline: false
                        })
                        .addFields({
                            name: 'Qualités',
                            value: decodeURIComponent(escape(atob(data.qualites))),
                            inline: false
                        })
                        .addFields({
                            name: 'Défaut',
                            value: decodeURIComponent(escape(atob(data.defaut))),
                            inline: false
                        })
                        .addFields({
                            name: 'Avis bot (pour le développeur uniquement)',
                            value: data.avis_bot,
                            inline: false
                        })
                        .setDescription(`${interaction.member.user}`);

                    const row = new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setLabel('Accepter')
                                .setCustomId('recrutement-accept-' + interaction.member.user.id)
                                .setStyle('PRIMARY'),
                            new MessageButton()
                                .setLabel('Refuser')
                                .setCustomId('recrutement-reject-' + interaction.member.user.id)
                                .setStyle('DANGER'),
                        );

                    let message = await client.channels.cache.get('1006696675965927494').send({
                        content: '<@&995085752620826747> <@&919422146101526598>',
                        components: [row],
                        embeds: [embeds]
                    });
                    setTimeout(async () => {
                        channel.delete()
                    }, 20000)

                    return;
                }
            }
            let text = "";
            let type = ":";

            if (!data.age) {
                type += "age";
                text = "Quel âge avez-vous ? (Dans la vraie vie)";
            } else if (!data.prenom) {
                type += "prenom";
                text = "Quel est votre prénom en jeu ? (Uniquement votre PRENOM) ";
            } else if (!data.nom) {
                type += "nom";
                text = "Quel est votre nom en jeu ? (Uniquement votre NOM)";
            } else if (!data.illegal) {
                type += "illegal";
                text = "Faite vous de l'illégal ?";
            } else if (!data.disponibilite) {
                type += "disponibilite";
                text = "Quels sont vos disponibilités, horaires et jours de la semaine ?";
            } else if (!data.motivation) {
                type += "motivation";
                text = "Quels sont vos motivations ?";
            } else if (!data.qualites) {
                type += "qualites";
                text = "Quels sont vos qualités ?";
            } else if (!data.defaut) {
                type += "defaut";
                text = "Quels sont vos défauts ?";
            } else if (!data.avis_bot) {
                type += "avis_bot";
                text = "Qu'avez vous pensé du formulaire interactif ? Avez-vous rencontré des problèmes ?";
            }
            let embeds = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle(text)
                .setDescription("Veuillez répondre en écrivant en dessous. Faite \"Suivant\" pour continuer. ")


            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setLabel('Suivant')
                        .setCustomId('recrutement-question' + type)
                        .setStyle('PRIMARY'),
                );
            client.channels.cache.get(data.channel_id).bulkDelete(100);
            client.channels.cache.get(data.channel_id).send({
                content: '<@' + interaction.member.user.id + '>',
                components: [row],
                embeds: [embeds]
            });
        });
    }

    async response(interaction) {
        const principal_server = client.guilds.cache.get('919412539492798514');
        const player_id = interaction.customId.substring(19, interaction.customId.length)
        const type = interaction.customId.substring(12, interaction.customId.length).split('-')[0];

        let permission = {};
        if (interaction.member.user.id === "270604640536625153") permission.dev = true;
        interaction.member.roles.cache.forEach(function (role) {
            if (roles[role.id]) {
                permission.agent = true;
                if (roles[role.id].is_admin)
                    permission.admin = true;
            }
        });


        const channel = await client.channels.cache.get('1006696675965927494');
        if (!permission.admin) return interaction.reply(`:x:   <@${interaction.member.user.id}> Vous n'êtes pas autorisé à faire ceci.`);

        interaction.deferUpdate();
        db.query(`UPDATE candidatures
                  SET close = 1
                  WHERE close = 0 AND player_id = '${player_id}'`);
        const choose = {
            'reject': {btn: 'DANGER', btn_msg: "Rejeter", color: "E33B3B", title: "Votre candidature a été rejetée", description: "Votre demande était trop courte ou ne remplissez pas les attentes"},
            'accept': {btn: 'SUCCESS', btn_msg: "Accepter", color: "2FC03C", title: "Votre candidature a été acceptée", description: "Félicitations, attendez désormais que la direction vous mentionne pour passer votre entretien. Assurez-vous de quitter votre emploi actuel ainsi que d'avoir Discord sur ordinateur."}};
        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setLabel(choose[type].btn_msg)
                    .setCustomId('recrutement-question' + type)
                    .setStyle(choose[type].btn)
                    .setDisabled(true),
                new MessageButton()
                    .setCustomId('par ' + interaction.member.user.username)
                    .setLabel('par ' + interaction.member.user.username + "#" + interaction.member.user.discriminator)
                    .setDisabled(true)
                    .setStyle('SECONDARY'),
            );
        await channel.messages.fetch().then(messages => {
            messages.forEach((message) => {
                if (message.id === interaction.message.id)
                    message.edit({components: [row]})
            })
        })

        let embeds = new MessageEmbed()
            .setColor('#'+choose[type].color)
            .setTitle(choose[type].title)
            .setDescription(choose[type].description)

        client.channels.cache.get('919414491609956382').send({
            content: '<@' + player_id + '>',
            embeds: [embeds]
        });

        if(type === "accept") {
            let role = principal_server.roles.cache.get("1000816505639948299");
            let member = principal_server.members.cache.get(player_id);
            try {
                member.roles.add(role);
            } catch (e) {
                let embeds = new MessageEmbed()
                    .setColor('#E33B3B')
                    .setTitle("Utilisateur introuvable")
                    .setDescription("L'utilisation a quitté le serveur.")


                interaction.reply({
                    embeds: [embeds]
                });
            }
        }
    }

    recrutement(msg, type) {
        if(type !== "on" && type !== "off") return msg.reply("À utilisez `?recrutement <on/off>`");
        const is_active = type === "on" ? true : false;
        if(recrutement === is_active) return msg.reply(`Déjà défini sur ${type}`);
        fs.writeFile(__dirname + "/data/recrutement.db", is_active.toString(), function(err) {
            console.log(err)
           if(err) return msg.reply("Error");
           msg.reply(`Changé avec succès sur ${type}`);
            recrutement = is_active
           if(is_active) {
               const embeds = new MessageEmbed()
                   .setColor('#1864E2')
                   .setTitle(`Les recrutements sont ouverts`)
                   .setDescription("Rendez-vous dans <#1006849866640658433> pour postuler.")

               client.channels.cache.get("919414491609956382").send({
                   content: '@everyone',
                   embeds: [embeds]
               });
           }
        });
    }

    close(msg) {
        const channel = msg.channelId;
        db.query(`SELECT * FROM candidatures  WHERE channel_id = '${channel}'`, async function (err, result) {
            if(result.length > 0) {
                db.query(`UPDATE candidatures SET close = 1 WHERE channel_id = '${channel}'`);
                const targetChannel = msg.guild.channels.cache.get(channel);
                targetChannel.send("Channel supprimé avec succès");
                setTimeout(() => {
                    targetChannel.delete();
                }, 5000)
            }
        });
    }


}
module.exports = Candidature;