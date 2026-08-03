require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} = require('discord.js');

const cliente = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const CATEGORIAS = {
  clips: { label: 'Clips', defaultEmoji: '🎬', defaultDesc: 'Vídeos curtos e clipes', defaultColor: 0xED4245 },
  intros: { label: 'Intros', defaultEmoji: '🎞️', defaultDesc: 'Intros para vídeos/streams', defaultColor: 0xF47FFF },
  songs: { label: 'Songs', defaultEmoji: '🎵', defaultDesc: 'Músicas e trilhas sonoras', defaultColor: 0x43B581 },
  'plugin-ins': { label: 'Plugins', defaultEmoji: '🔌', defaultDesc: 'Plugins para softwares', defaultColor: 0x7289DA },
  'presets-am': { label: 'Presets AM', defaultEmoji: '✨', defaultDesc: 'Presets After Effects (AM)', defaultColor: 0xF0C43F },
  'presets-ae': { label: 'Presets AE', defaultEmoji: '✨', defaultDesc: 'Presets After Effects (AE)', defaultColor: 0xF0C43F }
};

const CANAL_PERMITIDO = '1533540675264708648';
const CARGO_ADMIN = '1490764325156294777';
const ARQUIVO_DB = path.join(__dirname, 'db.json');
const ARQUIVO_MENU = path.join(__dirname, 'menu.json');

const CORES = { bg: 0x2B2D31, glow: 0x00D4FF, accent: 0x5865F2, ok: 0x3BA55C, err: 0xED4245 };

function urlValida(url) {
  if (!url) return false;
  try { const u = new URL(url); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
}

function carregarDB() {
  if (fs.existsSync(ARQUIVO_DB)) try { return JSON.parse(fs.readFileSync(ARQUIVO_DB)); } catch {}
  return { links: {}, cfg: {}, main: {} };
}
function salvarDB(d) { fs.writeFileSync(ARQUIVO_DB, JSON.stringify(d, null, 2)); }
function ehAdmin(m) { return m?.roles?.cache?.has(CARGO_ADMIN) || m?.permissions?.has(PermissionFlagsBits.Administrator); }
function negrito(t) { return `**${t}**`; }

const DB = carregarDB();
const LINKS = DB.links || {};
Object.keys(CATEGORIAS).forEach(k => { LINKS[k] = Array.isArray(LINKS[k]) ? LINKS[k] : []; });
DB.links = LINKS;
DB.cfg = DB.cfg || {};
Object.keys(CATEGORIAS).forEach(k => { DB.cfg[k] = DB.cfg[k] || {}; });
DB.main = DB.main || {};

function obterConfigCategoria(chave) {
  const cat = CATEGORIAS[chave];
  const cfg = DB.cfg[chave] || {};
  return {
    titulo: cfg.titulo || cat.label,
    emoji: cfg.emoji || cat.defaultEmoji,
    desc: cfg.desc || cat.defaultDesc,
    cor: cfg.cor || cat.defaultColor,
    banner: urlValida(cfg.banner) ? cfg.banner : null,
    icone: urlValida(cfg.icone) ? cfg.icone : null,
    rodape: cfg.rodape || null
  };
}

function obterConfigPrincipal() {
  const m = DB.main || {};
  return {
    titulo: m.titulo || 'R E C U R S O S',
    desc: m.desc || `**Central de Downloads**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSelecione uma categoria no menu abaixo para acessar os arquivos.\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    banner: urlValida(m.banner) ? m.banner : null,
    rodape: m.rodape || null
  };
}

function criarEmbedPrincipal() {
  const cfg = obterConfigPrincipal();
  const campos = Object.entries(CATEGORIAS).map(([k, v]) => {
    const cc = obterConfigCategoria(k);
    return {
      name: `${cc.emoji}  ${negrito(cc.titulo)}`,
      value: `> ${cc.desc}\n> \`${(LINKS[k] || []).length} itens\``,
      inline: true
    };
  });

  const e = new EmbedBuilder()
    .setTitle(negrito(cfg.titulo))
    .setDescription(cfg.desc)
    .setColor(CORES.glow)
    .addFields(campos);

  if (cfg.banner) e.setImage(cfg.banner);
  if (cfg.rodape) e.setFooter({ text: cfg.rodape }).setTimestamp();
  else e.setTimestamp();
  return e;
}

function criarEmbedCategoria(chave) {
  const cc = obterConfigCategoria(chave);
  const itens = (LINKS[chave] || []);
  
  let corpo = `> ${cc.desc}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  if (itens.length) {
    corpo += `📦  ${negrito(`${itens.length} arquivo${itens.length > 1 ? 's' : ''} disponível${itens.length > 1 ? 'eis' : ''}`)}\n\n`;
    corpo += itens.map((l, i) => {
      const num = negrito(`${i + 1}.`);
      return `${num.padStart(6)}  [${l.nome}](${l.url})  \`${l.tamanho}\``;
    }).join('\n');
  } else {
    corpo += `📭  *Nenhum arquivo cadastrado.*\n\n`;
    corpo += `> 💡 Admins: use ${negrito('➕ Adicionar')} para incluir o primeiro.`;
  }

  const e = new EmbedBuilder()
    .setTitle(`${cc.emoji}  ${negrito(cc.titulo.toUpperCase())}`)
    .setDescription(corpo)
    .setColor(cc.cor);

  if (cc.banner) e.setImage(cc.banner);
  if (cc.icone) e.setThumbnail(cc.icone);
  if (cc.rodape) e.setFooter({ text: cc.rodape }).setTimestamp();
  else e.setTimestamp();
  return e;
}

function criarMenuPrincipal() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('pick_cat')
      .setPlaceholder('🔽  Escolha uma categoria...')
      .addOptions(Object.entries(CATEGORIAS).map(([k, v]) => {
        const cc = obterConfigCategoria(k);
        return new StringSelectMenuOptionBuilder()
          .setLabel(cc.titulo)
          .setDescription(`${cc.desc} • ${(LINKS[k] || []).length} itens`)
          .setValue(k)
          .setEmoji(cc.emoji);
      }))
  );
}

function criarBotoesNavegacao(chave, admin) {
  const botoes = [new ButtonBuilder().setCustomId('back').setLabel('← Menu').setStyle(ButtonStyle.Secondary).setEmoji('🏠')];
  if (admin) botoes.push(
    new ButtonBuilder().setCustomId(`add_${chave}`).setLabel('Adicionar').setStyle(ButtonStyle.Success).setEmoji('➕'),
    new ButtonBuilder().setCustomId(`del_${chave}`).setLabel('Remover').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
    new ButtonBuilder().setCustomId(`cfg_${chave}`).setLabel('Personalizar').setStyle(ButtonStyle.Primary).setEmoji('⚙️')
  );
  return new ActionRowBuilder().addComponents(botoes);
}

function criarModalAdicionar(chave) {
  const cc = obterConfigCategoria(chave);
  return new ModalBuilder().setCustomId(`add_${chave}`).setTitle(`➕ ${cc.titulo}`)
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel('Nome').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80).setPlaceholder('Ex: Meu Arquivo v2')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('u').setLabel('URL direta').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(500).setPlaceholder('https://...')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s').setLabel('Tamanho (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(20).setPlaceholder('Ex: 150 MB'))
    );
}

function criarModalConfigurar(chave) {
  const cc = obterConfigCategoria(chave);
  return new ModalBuilder().setCustomId(`cfg_${chave}`).setTitle(`⚙️ ${cc.titulo}`)
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('titulo').setLabel('Título (ex: Meus Clips)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(80).setPlaceholder(cc.titulo)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('emoji').setLabel('Emoji/Ícone (ex: 🎬)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(10).setPlaceholder(cc.emoji)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('Descrição (markdown livre)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(1000).setPlaceholder(cc.desc)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cor').setLabel('Cor HEX (ex: #ED4245 ou 0xED4245)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(20).setPlaceholder(cc.cor.toString(16).padStart(6, '0'))),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('banner').setLabel('Banner URL').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(500).setPlaceholder(cc.banner || '')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('icone').setLabel('Ícone/Thumb URL').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(500).setPlaceholder(cc.icone || '')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rodape').setLabel('Rodapé').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(200).setPlaceholder(cc.rodape || ''))
    );
}

function criarModalConfigPrincipal() {
  const m = obterConfigPrincipal();
  return new ModalBuilder().setCustomId('cfg_main').setTitle('⚙️ Menu Principal')
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('titulo').setLabel('Título').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(80).setPlaceholder(m.titulo)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('Descrição completa (markdown livre)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(2000).setPlaceholder(m.desc)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('banner').setLabel('Banner/Imagem URL').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(500).setPlaceholder(m.banner || '')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rodape').setLabel('Rodapé (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(200).setPlaceholder(m.rodape || ''))
    );
}

function criarSelectRemover(chave) {
  const itens = LINKS[chave] || [];
  if (!itens.length) return null;
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId(`delsel_${chave}`).setPlaceholder('🗑️ Selecione para remover...')
      .addOptions(itens.map((l, i) => new StringSelectMenuOptionBuilder().setLabel(`${i+1}. ${l.nome}`).setDescription(`${l.tamanho} • ${l.url.slice(0,90)}`).setValue(String(i)).setEmoji('📄')))
  );
}

function negrito(t) { return `**${t}**`; }
function erro(t, d) { return new EmbedBuilder().setTitle(negrito(`❌ ${t}`)).setDescription(d).setColor(CORES.err).setTimestamp(); }
function sucesso(t, d) { return new EmbedBuilder().setTitle(negrito(`✅ ${t}`)).setDescription(d).setColor(CORES.ok).setTimestamp(); }

async function atualizarSeguro(i, payload) {
  try {
    await i.deferUpdate();
    await i.editReply(payload);
  } catch (e) {
    console.error('atualizarSeguro erro:', e.message);
    try { await i.reply(payload); } catch {}
    try { await i.followUp(payload); } catch {}
  }
}

async function responderSeguro(i, payload) {
  try {
    if (i.replied || i.deferred) await i.followUp(payload);
    else await i.reply(payload);
  } catch {}
}

async function atualizarModalSeguro(i, payload) {
  try {
    await i.update(payload);
  } catch (e) {
    console.error('atualizarModal erro:', e.message);
    try { await i.reply(payload); } catch {}
    try { await i.followUp(payload); } catch {}
  }
}

async function postarMenuFixo() {
  const ch = cliente.channels.cache.get(CANAL_PERMITIDO);
  if (!ch) return console.log('❌ Canal não encontrado');
  
  if (fs.existsSync(ARQUIVO_MENU)) {
    try {
      const old = JSON.parse(fs.readFileSync(ARQUIVO_MENU));
      const oldMsg = await ch.messages.fetch(old.msgId).catch(()=>null);
      if (oldMsg) await oldMsg.delete().catch(()=>{});
    } catch {}
  }

  // Apaga mensagens antigas do próprio bot no canal (ex: menus de versões anteriores)
  try {
    const msgs = await ch.messages.fetch({ limit: 50 });
    for (const [, m] of msgs) {
      if (m.author.id === cliente.user.id) await m.delete().catch(()=>{});
    }
  } catch {}

  const msg = await ch.send({ embeds: [criarEmbedPrincipal()], components: [criarMenuPrincipal()] });
  fs.writeFileSync(ARQUIVO_MENU, JSON.stringify({ msgId: msg.id, chId: ch.id }));
  console.log('✅ Menu fixo postado');
}

async function garantirMenuExiste() {
  const ch = cliente.channels.cache.get(CANAL_PERMITIDO);
  if (!ch) return;
  if (!fs.existsSync(ARQUIVO_MENU)) return postarMenuFixo();
  
  try {
    const data = JSON.parse(fs.readFileSync(ARQUIVO_MENU));
    const msg = await ch.messages.fetch(data.msgId).catch(()=>null);
    if (!msg) {
      console.log('🔄 Menu deletado, repostando...');
      return postarMenuFixo();
    }
    await msg.edit({ embeds: [criarEmbedPrincipal()], components: [criarMenuPrincipal()] }).catch(()=>{});
  } catch {
    return postarMenuFixo();
  }
}

cliente.once(Events.ClientReady, async c => {
  console.log(`✅ ${c.user.tag} online`);
  await postarMenuFixo();
  setInterval(garantirMenuExiste, 15000);
});

cliente.on(Events.MessageDelete, async msg => {
  try {
    if (!fs.existsSync(ARQUIVO_MENU)) return;
    const data = JSON.parse(fs.readFileSync(ARQUIVO_MENU));
    if (data.msgId && msg.id === data.msgId) {
      console.log('🔄 Menu fixo apagado, repondo imediatamente...');
      fs.rmSync(ARQUIVO_MENU, { force: true });
      await postarMenuFixo();
    }
  } catch {}
});

cliente.on(Events.InteractionCreate, async i => {
  try {
    if (i.isChatInputCommand()) {
      if (i.commandName === 'resetmenu') {
        if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
        await i.deferReply({ ephemeral: true });
        await postarMenuFixo();
        return i.editReply({ embeds: [sucesso('Menu reposto', 'Menu fixo atualizado no canal.')] });
      }
    }
    if (i.isStringSelectMenu()) {
      if (i.customId === 'pick_cat') {
        const chave = i.values[0];
        const admin = ehAdmin(i.member);
        const emb = criarEmbedCategoria(chave);
        const nav = criarBotoesNavegacao(chave, admin);
        await atualizarSeguro(i, { embeds: [emb], components: [criarMenuPrincipal(), nav] });
      }
      if (i.customId.startsWith('delsel_')) {
        if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Apenas admins.')], ephemeral: true });
        const chave = i.customId.replace('delsel_', '');
        const idx = parseInt(i.values[0]);
        const removido = (LINKS[chave] || []).splice(idx, 1)[0]; DB.links = LINKS; salvarDB(DB);
        const emb = criarEmbedCategoria(chave);
        const nav = criarBotoesNavegacao(chave, true);
        await atualizarSeguro(i, { embeds: [emb], components: [criarMenuPrincipal(), nav] });
        await responderSeguro(i, { embeds: [sucesso('Removido', negrito(`${removido?.nome || 'item'}`))], ephemeral: true });
      }
    }

    if (i.isButton()) {
      if (i.customId === 'back') {
        await atualizarSeguro(i, { embeds: [criarEmbedPrincipal()], components: [criarMenuPrincipal()] });
        return;
      }
      if (i.customId.startsWith('add_')) {
        if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
        const chave = i.customId.replace('add_', '');
        return i.showModal(criarModalAdicionar(chave));
      }
      if (i.customId.startsWith('del_')) {
        if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
        const chave = i.customId.replace('del_', '');
        const sel = criarSelectRemover(chave);
        if (!sel) return responderSeguro(i, { embeds: [erro('Vazio', 'Nada para remover.')], ephemeral: true });
        try { await i.deferReply({ ephemeral: true }); } catch {}
        return i.editReply({ components: [sel] });
      }
      if (i.customId.startsWith('cfg_')) {
        if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
        const chave = i.customId.replace('cfg_', '');
        return i.showModal(criarModalConfigurar(chave));
      }
    }

    if (i.isModalSubmit()) {
      if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
      if (i.customId.startsWith('add_')) {
        const chave = i.customId.replace('add_', '');
        const n = i.fields.getTextInputValue('n'), u = i.fields.getTextInputValue('u'), s = i.fields.getTextInputValue('s') || 'Desconhecido';
        if (!LINKS[chave]) LINKS[chave] = [];
        LINKS[chave].push({ nome: n, url: u, tamanho: s }); DB.links = LINKS; salvarDB(DB);
        const emb = criarEmbedCategoria(chave);
        const nav = criarBotoesNavegacao(chave, true);
        return atualizarModalSeguro(i, { embeds: [emb], components: [criarMenuPrincipal(), nav] });
      }
      if (i.customId.startsWith('cfg_')) {
        const chave = i.customId.replace('cfg_', '');
        const corInput = i.fields.getTextInputValue('cor');
        let cor = obterConfigCategoria(chave).cor;
        if (corInput) {
          const limpo = corInput.replace('#', '').replace('0x', '');
          const parsed = parseInt(limpo, 16);
          if (!isNaN(parsed)) cor = parsed;
        }
        DB.cfg[chave] = {
          titulo: i.fields.getTextInputValue('titulo') || null,
          emoji: i.fields.getTextInputValue('emoji') || null,
          desc: i.fields.getTextInputValue('desc') || null,
          cor: cor,
          banner: urlValida(i.fields.getTextInputValue('banner')) ? i.fields.getTextInputValue('banner') : null,
          icone: urlValida(i.fields.getTextInputValue('icone')) ? i.fields.getTextInputValue('icone') : null,
          rodape: i.fields.getTextInputValue('rodape') || null
        }; salvarDB(DB);
        const emb = criarEmbedCategoria(chave);
        const nav = criarBotoesNavegacao(chave, true);
        return atualizarModalSeguro(i, { embeds: [emb], components: [criarMenuPrincipal(), nav] });
      }
      if (i.customId === 'cfg_main') {
        DB.main = {
          titulo: i.fields.getTextInputValue('titulo') || null,
          desc: i.fields.getTextInputValue('desc') || null,
          banner: urlValida(i.fields.getTextInputValue('banner')) ? i.fields.getTextInputValue('banner') : null,
          rodape: i.fields.getTextInputValue('rodape') || null
        }; salvarDB(DB);
        garantirMenuExiste();
        return atualizarModalSeguro(i, { embeds: [criarEmbedPrincipal()], components: [criarMenuPrincipal()] });
      }
    }
  } catch (e) { console.error('Erro interação:', e); }
});

cliente.login(process.env.DISCORD_TOKEN);