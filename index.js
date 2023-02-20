const { Client, Intents, MessageEmbed, MessageActionRow, MessageButton, ActionRowBuilder, SelectMenuBuilder } = require('discord.js');
const intents = ["GUILDS", "GUILD_MEMBERS", "GUILD_MESSAGES", "GUILD_PRESENCES", "GUILD_INVITES", "GUILD_VOICE_STATES"];
const client = new Client({ intents: intents, ws: {intents: intents}, partials: ["MESSAGE", "USER", "CHANNEL", "REACTION"]});
const mysql = require('mysql');

const Auth = require('./bin/Auth');
const auth = new Auth();

const Agent = require('./bin/Agent')
const Api = require('./bin/Api')
const Message = require('./bin/Message')
const Candidature = require('./bin/Candidature')

const db = mysql.createConnection(auth.database())


let api;
let message;
let candidature;
let agents = {};
let roles = {};


let updateService = false;
let updateServiceTime = 0;
db.connect(function (err) {
    if (err) throw err;
    console.log("mysql:3306: emsdispatcher connected ");

});

const changeText = (title, detail, state) => {
        const activity = {
            name: 'Depression',
            type: 'STREAMING',
            details: 'discord.gg/inviteCode',
            state: state,
            timestamps: {
                start: Date.now(),
            },
        };
        client.user.setPresence({
            pid: process.pid,
            activity: activity,
            status: 'online',
        });
}

const changeActivity = async () => {
    let rea = 0;
    await db.query(`SELECT SUM(rea) as count FROM services WHERE archived = 0`, async function (err, result) {
        rea = result.length > 0 ? result[0].count : 0;

        let count = 0;
        for (const [key, value] of Object.entries(agents))  if(value.status.is_service) count+=1;

        const agent = "agent" + (count > 1 ? "s" : "");

        client.user.setActivity(String(rea).replace(/(.)(?=(\d{3})+$)/g, '$1  ') + ' réanimations', {type: 'WATCHING'});
        setTimeout(async () => {
            client.channels.cache.get('919412539492798515').setName("🚑 " + count + " " + agent + ' en service');
            if(!api.status()) client.user.setActivity(count + " " + agent + ' en service', {type: 'WATCHING'});
            else client.user.setActivity("attendre DynastyRP FA", {type: 'PLAYING'});
        }, 7500)
    });
}

client.on("ready", async () => {

    console.log(`\n\nLogged in as ${client.user.tag}!\n\n`);
    message = new Message(client, db);
    db.query(`SELECT * FROM roles`, async (err, result) => {
        for (let i = 0; i < result.length; i++)
            roles[result[i].role_id] = result[i];
    });
    candidature = new Candidature(client, db, roles);
    api = new Api(client, db, roles);


    db.query(`SELECT * FROM agents WHERE archived = 0`, async (err, result) => {
        for (let i = 0; i < result.length; i++) {
            agents[result[i].agent_id] = new Agent(db, client, roles, result[i]);
            if(result[i].serv_start && !result[i].serv_stop) {
                agents[result[i].agent_id].setServiceStatus(true);
                agents[result[i].agent_id].setOnline();
            }


        }
    });

    api.get(agents);
    setInterval(() => api.get(agents), 10000);
    setInterval(() => api.hierarchie(agents), 60000);
    setInterval(() => api.logs(agents), 30000);
    changeActivity();
    message.refreshService(agents);
    setInterval(() => changeActivity(), 15000);
    setInterval(() => message.refreshService(agents), 7500)
})


client.on("guildMemberUpdate", (oldMember, newMember) => {
    const user_id = newMember.user.id;
    if(agents[user_id]) agents[user_id].checkRole();
});
client.on('guildMemberRemove', (member) => {
})

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const type = interaction.customId;
    const user_id = interaction.member.user.id;
    console.log(interaction.member.user.username + " " + type)

    if(type === "recrutement-start") return candidature.start(interaction);
    if(type.substring(0, 20) === "recrutement-question") return candidature.question(interaction);

    if(!agents[user_id] || !agents[user_id].agent.matricule) return interaction.reply({content: ":x:   Vous n'avez pas de matricule",ephemeral: true});
    const agent = agents[user_id];
    if(type === "service-start") return agent.command.start(interaction);
    if(type === "service-stop") return agent.command.stop(interaction);
    if(type === "service-profil") return agent.command.profil(interaction);
    if(type === "service-addOne") return agent.command.addOne(interaction);
    if(type === "service-freekill") return agent.command.freekill(interaction);

    if(!agents[user_id].agent.is_admin) return  interaction.reply({content: ":x:   Vous n'avez pas la permission de faire ça",ephemeral: true});;
    if (interaction.customId.substring(0, 19) === "recrutement-accept-" || interaction.customId.substring(0, 19) === "recrutement-reject-") return  candidature.response(interaction);

});

client.on('presenceUpdate', async (oldMember, newMember) => {
    const user_id = newMember.userId;
    if(agents[user_id]) {
        let before = false;
        let after = false;
        let state = null;
        if(newMember && newMember.activities && newMember.activities.length > 0)
            for(let i = 0; i < newMember.activities.length; i++) {
                if (newMember.activities[0].name === "DynastyRP") {
                    after = true;
                    state = newMember.activities[0].state ? newMember.activities[0].state.split(' ')[0] : null;
                }
            }

        if(oldMember && oldMember.activities && oldMember.activities.length > 0)
            for(let i = 0; i < oldMember.activities.length; i++)
                if(oldMember.activities[0].name === "DynastyRP") {
                    before = true;
                    state = oldMember.activities[0].state ? oldMember.activities[0].state.split(' ')[0] : null;
                }

        if(!after && agents[user_id].status.last_refresh + 60000 < new Date().getTime()) {
            console.log(agents[user_id].agent.displayName + " disconnect")
            agents[user_id].set('id', state);
            return agents[user_id].setOffline();
        }

        if(after) {
            agents[user_id].set('id', state);
            console.log(agents[user_id].agent.displayName + " connected")
            return agents[user_id].setOnline();
        }
    }
    updateService = true
});



client.on('message', async msg => {
    if (msg.content[0] !== "?") return;
    const command = msg.content.split(' ')[0].substring(1, msg.content.split(' ')[0].length).toLowerCase();
    const user_id = msg.author.id;
    const mention = `<@${user_id}>`;
    const args = msg.content.split(" ").slice(1);
    if(command === "help" || command === "version") return message.help(msg);


    if(command === "setagent") {
        let number = args[0];
        db.query(`SELECT * FROM agents WHERE agent_id = '${msg.author.id}' AND archived = 0`, async function (err, result) {
            if (result.length > 0) return;
            if (!number || !Number.isInteger(parseInt(number))) return message.channel.send(`${mention}, veuillez saisir un nombre valide \`?set 13\` (par exemple)`);
            if (number < 0 || number > 100) return msg.channel.send(`${mention}, votre numéro d'agent est invalide`);
            db.query(`SELECT * FROM agents WHERE matricule = ${number} AND archived = 0`, async function (err, result) {
                if (result.length !== 0) return msg.channel.send(`${mention}, le matricule est déjà utilisé`);
                db.query(`INSERT INTO agents( agent_id, matricule ) VALUES ( '${msg.author.id}', ${number} )`);
                msg.channel.send({content: '<@' + msg.author.id + ">, votre numéro est désormais enregistré en tant que matricule `" + number + "`"});
                db.query(`SELECT * FROM agents WHERE matricule = ${number} AND archived = 0`, async function (err, result) {
                    if(result.length > 0) {
                        const embeds = new MessageEmbed()
                            .setColor('#D735DC')
                            .setTitle(':partying_face:   Bienvenue chez les EMS !')
                            .setDescription("Souhaitez tous la bienvenue chez les EMS <@" + msg.author.id + '> !');
                        client.channels.cache.get("919419935359377418").send({
                            content: '<@&994023910725140620>',
                            embeds: [embeds]
                        });
                        agents[msg.author.id] = new Agent(db, client, roles, result[0]);
                    }
                });
            });
        });
    }
    if(!agents[user_id]) return;
    console.log(`${agents[user_id].agent.displayName} : ${msg.contents}`);
    if(command === "add") agents[user_id].command.add(msg, args[0]);

    if(!agents[user_id].agent.is_admin) return;
    if(command === "salaire") agents[user_id].command.salaire(msg);
    if(command === "view") agents[user_id].command.view(msg, args[0]);
    if(command === "reset") agents[user_id].command.reset(msg);
    if(command === "logs") agents[user_id].command.logs(msg);
    if(command === "close") candidature.close(msg);
    if(command === "warn") agents[user_id].command.warn(msg, args[0], agents);
    if(command === "reunion") agents[user_id].command.reunion(msg, agents);
    if(command === "reunionstop") agents[user_id].command.reunionstop(msg, agents);
    if(command === "recrutement") candidature.recrutement(msg, args[0]);


});


client.login(auth.token());
