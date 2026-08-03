require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const cmds = [
  new SlashCommandBuilder().setName('resetmenu').setDescription('[ADMIN] Reposta menu fixo no canal').setDefaultMemberPermissions(0),
  new SlashCommandBuilder().setName('addlink').setDescription('[ADMIN] Adiciona link')
    .addStringOption(o=>o.setName('categoria').setDescription('Categoria').setRequired(true)
      .addChoices({name:'Clips',value:'clips'},{name:'Intros',value:'intros'},{name:'Songs',value:'songs'},{name:'Plugins',value:'plugin-ins'},{name:'Presets AM',value:'presets-am'},{name:'Presets AE',value:'presets-ae'}))
    .addStringOption(o=>o.setName('nome').setDescription('Nome').setRequired(true))
    .addStringOption(o=>o.setName('url').setDescription('URL').setRequired(true))
    .addStringOption(o=>o.setName('tamanho').setDescription('Tamanho').setRequired(false))
    .setDefaultMemberPermissions(0),
  new SlashCommandBuilder().setName('removelink').setDescription('[ADMIN] Remove link')
    .addStringOption(o=>o.setName('categoria').setDescription('Categoria').setRequired(true)
      .addChoices({name:'Clips',value:'clips'},{name:'Intros',value:'intros'},{name:'Songs',value:'songs'},{name:'Plugins',value:'plugin-ins'},{name:'Presets AM',value:'presets-am'},{name:'Presets AE',value:'presets-ae'}))
    .addIntegerOption(o=>o.setName('indice').setDescription('Número (1,2,3)').setRequired(true))
    .setDefaultMemberPermissions(0),
  new SlashCommandBuilder().setName('listlinks').setDescription('[ADMIN] Lista links')
    .addStringOption(o=>o.setName('categoria').setDescription('Categoria').setRequired(true)
      .addChoices({name:'Clips',value:'clips'},{name:'Intros',value:'intros'},{name:'Songs',value:'songs'},{name:'Plugins',value:'plugin-ins'},{name:'Presets AM',value:'presets-am'},{name:'Presets AE',value:'presets-ae'}))
    .setDefaultMemberPermissions(0),
  new SlashCommandBuilder().setName('configcat').setDescription('[ADMIN] Personaliza categoria')
    .addStringOption(o=>o.setName('categoria').setDescription('Categoria').setRequired(true)
      .addChoices({name:'Clips',value:'clips'},{name:'Intros',value:'intros'},{name:'Songs',value:'songs'},{name:'Plugins',value:'plugin-ins'},{name:'Presets AM',value:'presets-am'},{name:'Presets AE',value:'presets-ae'}))
    .setDefaultMemberPermissions(0),
  new SlashCommandBuilder().setName('configmain').setDescription('[ADMIN] Personaliza menu principal').setDefaultMemberPermissions(0),
  new SlashCommandBuilder().setName('resetcat').setDescription('[ADMIN] Reseta categoria')
    .addStringOption(o=>o.setName('categoria').setDescription('Categoria').setRequired(true)
      .addChoices({name:'Clips',value:'clips'},{name:'Intros',value:'intros'},{name:'Songs',value:'songs'},{name:'Plugins',value:'plugin-ins'},{name:'Presets AM',value:'presets-am'},{name:'Presets AE',value:'presets-ae'}))
    .setDefaultMemberPermissions(0),
  new SlashCommandBuilder().setName('resetmain').setDescription('[ADMIN] Reseta menu principal').setDefaultMemberPermissions(0)
].map(c=>c.toJSON());

const rest = new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);
(async()=>{try{console.log('🔄 Registrando...');await rest.put(process.env.GUILD_ID?Routes.applicationGuildCommands(process.env.CLIENT_ID,process.env.GUILD_ID):Routes.applicationCommands(process.env.CLIENT_ID),{body:cmds});console.log('✅ OK');}catch(e){console.error(e);}})();