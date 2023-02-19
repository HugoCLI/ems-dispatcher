// Importer les packages nécessaires
const { Client, Intents, MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const store = require('data-store')({ path: process.cwd() + '/reanimations.json' });
const md5 = require('md5');
require('dotenv').config();

// Créer un client Discord.js avec les intents
const intents = new Intents([Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]);
const client = new Client({ intents });

// Remplacer 'TON_TOKEN_ICI' par ton propre jeton Discord bot
const TOKEN = process.env.DISCORD_BOT_TOKEN;

const prefix = '!'; // Préfixe des commandes


let agents = store.get('agents');
let services = store.get('services');
if (!agents) agents = {}
if (!services) services = {}

const save_data = () => {
    store.set('agents', agents);
    store.set('services', services);
    console.log('Sauvegardes agents et services')
}
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  

// Quand le client Discord.js est prêt
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return; // Vérifie si la commande commence par le préfixe et si l'auteur n'est pas un bot
  
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const user_id = md5(message.author.id);

    if (!message.member.roles.cache.has('1076562490453917776'))
        return message.reply("Vous ne disposez pas des autorisations nécessaires pour exécuter cette commande.");

    if (!agents[user_id])
        agents[user_id] = {user_id: message.author.id, reanimations: [], is_set: false};

    if (!services[user_id])
        services[user_id] = {debut: null, nombre_reanimation: 0}

    switch (command) {
      case 'debut':
        if (!services[user_id].debut)
        {
            services[user_id].debut = new Date().getTime();
            message.reply("Vous êtes maintenant en poste.");
            save_data();

            break;
        }
        message.reply("Vous êtes actuellement en fonction.");
        break;
      case 'fin':
        if (!services[user_id].debut)
        {
            message.reply("Vous êtes actuellement hors service.");
            break;
        }
        if(!services[user_id].is_set)
        {
            message.reply("Veuillez définir votre nombre de réanimation (faite !ajouter 0 si vous n'en n'avez pas)");
            break;
        }
        services[user_id].fin = new Date().getTime();
        message.reply(`Vous avez pris votre fin de service\n
        Temps: ${formatTime(services[user_id].fin - services[user_id].debut)}
        Réanimations: ${services[user_id].nombre_reanimation}`);
        if (services[user_id].nombre_reanimation > 0)
            agents[user_id].reanimations.push(services[user_id]);
        delete services[user_id];
        save_data();

        break;
      case 'ajouter':
        const reanimations = parseInt(args[0]); // Récupère le nombre de réanimations à ajouter
        if (isNaN(reanimations)) {
            // Si la valeur n'est pas un nombre, envoyer un message d'erreur
            return message.reply('Il est nécessaire que le nombre de réanimations saisi soit un chiffre.');
        }

        if (reanimations != 0 && reanimations < 0) { // Vérifie que le nombre de réanimations est valide
          message.reply("Veuillez s'il vous plaît indiquer un nombre valide de réanimations.");
        } else {
          // Enregistre le nombre de réanimations dans une base de données ou un fichier
          message.reply(`Vous avez enregistré ${reanimations} réanimations`);
          services[user_id].nombre_reanimation += reanimations;
          services[user_id].is_set = true;
          save_data();

        }
        break;
      case 'stats':
        // Récupère le nombre total de réanimations depuis la base de données ou le fichier
        let string = ``;
        for (const [key, value] of Object.entries(agents)) {
            let num = 0;
            for (let i = 0; i < value.reanimations.length; i++)
                num += value.reanimations[i].nombre_reanimation;
            if (num > 0)
                string += `<@${value.user_id}> : ${num} réanimation(s)\n`; 
        }
        if (string == "")
            return message.reply("Il n'y a malheureusement aucune donnée statistique disponible pour le moment.")
        message.reply(string);

        break;
      case 'reset':
        // Réinitialise le nombre total de réanimations dans la base de données ou le fichier
        if (!message.member.roles.cache.has('1076562481545228309'))
            return message.reply("Vous ne disposez pas des autorisations nécessaires pour exécuter cette commande.");

        agents = {}
        services = {}
        save_data()
        message.reply('Les données relatives aux réanimations ont été réinitialisées.');
        break;
    case 'help':
        message.reply('EMS Dispatcher: Développé par HugoCLI https://github.com/HugoCLI/ems-dispatcher');
        break;
    }
});



// Connecte le client Discord.js
client.login(TOKEN);
