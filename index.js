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

const CARGO_ADMIN = '1490764325156294777';
const MAX_BOTOES_POR_PAGINA = 25;

function caminhoDB() {
  const montagem = process.env.RAILWAY_VOLUME_MOUNT_PATH
    || process.env.DATA_DIR
    || __dirname;
  return path.join(montagem, 'db.json');
}
const ARQUIVO_DB = caminhoDB();

const CORES = { glow: 0x00D4FF, ok: 0x3BA55C, err: 0xED4245, item: 0x7289DA };

function urlValida(url) {
  if (!url) return false;
  try { const u = new URL(url); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
}

function carregarDB() {
  if (!fs.existsSync(ARQUIVO_DB)) {
    const seed = path.join(__dirname, 'db.json');
    if (fs.existsSync(seed)) {
      try {
        fs.mkdirSync(path.dirname(ARQUIVO_DB), { recursive: true });
        fs.copyFileSync(seed, ARQUIVO_DB);
      } catch {}
    }
  }
  if (fs.existsSync(ARQUIVO_DB)) try { return JSON.parse(fs.readFileSync(ARQUIVO_DB)); } catch {}
  return { main: {}, itens: [] };
}
function salvarDB(d) {
  fs.mkdirSync(path.dirname(ARQUIVO_DB), { recursive: true });
  fs.writeFileSync(ARQUIVO_DB, JSON.stringify(d, null, 2));
}

function ehAdmin(m) { return m?.roles?.cache?.has(CARGO_ADMIN) || m?.permissions?.has(PermissionFlagsBits.Administrator); }
function negrito(t) { return `**${t}**`; }

const DB = carregarDB();
DB.main = DB.main || {};
DB.itens = Array.isArray(DB.itens) ? DB.itens : [];

function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function obterConfigPrincipal() {
  const m = DB.main || {};
  return {
    titulo: m.titulo || 'Downloads',
    desc: m.desc || `Testados e com guia de instalação para facilitar o processo.\nSe o seu antivírus detectar algo, é apenas o ativador do programa.\n\nEscolha o que deseja baixar!`,
    banner: urlValida(m.banner) ? m.banner : null,
    rodape: m.rodape || null
  };
}

function criarEmbedPrincipal(pag) {
  const m = obterConfigPrincipal();
  const totalPag = Math.max(1, Math.ceil(DB.itens.length / MAX_BOTOES_POR_PAGINA));

  const e = new EmbedBuilder()
    .setTitle(negrito(m.titulo))
    .setDescription(m.desc)
    .setColor(CORES.glow)
    .setFooter({ text: `Página ${pag + 1}/${totalPag} • ${DB.itens.length} item(ns)` })
    .setTimestamp();

  if (m.banner) e.setImage(m.banner);
  if (m.rodape) e.setFooter({ text: m.rodape });
  return e;
}

function criarEmbedItem(item) {
  const links = item.links || [];
  let corpo = '';

  if (item.sub) corpo += `> ${item.sub}\n`;

  corpo += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (links.length) {
    corpo += `📦  ${negrito(`${links.length} download${links.length > 1 ? 's' : ''} disponível${links.length > 1 ? 'eis' : ''}`)}\n\n`;
    corpo += links.map((l, i) => {
      const num = negrito(`${i + 1}.`);
      return `${num.padStart(6)}  [${l.nome}](${l.url})  \`${l.tamanho || '—'}\``;
    }).join('\n');
  } else {
    corpo += `📭  *Nenhum link cadastrado ainda.*\n\n`;
    corpo += `> 💡 Admins: use ${negrito('➕ Adicionar Link')} para incluir o primeiro.`;
  }

  const e = new EmbedBuilder()
    .setTitle(`${item.icone || '📄'}  ${negrito(item.titulo.toUpperCase())}`)
    .setDescription(corpo)
    .setColor(item.cor || CORES.item)
    .setTimestamp();

  return e;
}

function criarBotoesMenu(pag, admin, userId) {
  const rows = [];
  const inicio = pag * MAX_BOTOES_POR_PAGINA;
  const itensPagina = DB.itens.slice(inicio, inicio + MAX_BOTOES_POR_PAGINA);

  for (let i = 0; i < itensPagina.length; i += 5) {
    const row = new ActionRowBuilder();
    const grupo = itensPagina.slice(i, i + 5);
    for (const it of grupo) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`item_${it.id}_${userId}`)
          .setLabel(it.titulo.slice(0, 80))
          .setEmoji(it.icone || '📄')
          .setStyle(ButtonStyle.Primary)
      );
    }
    rows.push(row);
  }

  const nav = new ActionRowBuilder();
  if (pag > 0) nav.addComponents(new ButtonBuilder().setCustomId(`pag_${pag - 1}_${userId}`).setLabel('◀ Anterior').setStyle(ButtonStyle.Secondary));
  if (admin) nav.addComponents(new ButtonBuilder().setCustomId(`novoitem_${userId}`).setLabel('Novo Botão').setStyle(ButtonStyle.Success).setEmoji('➕'));
  if (admin) nav.addComponents(new ButtonBuilder().setCustomId(`cfgmain_${userId}`).setLabel('Configurar').setStyle(ButtonStyle.Primary).setEmoji('⚙️'));
  if (inicio + MAX_BOTOES_POR_PAGINA < DB.itens.length) nav.addComponents(new ButtonBuilder().setCustomId(`pag_${pag + 1}_${userId}`).setLabel('Próxima ▶').setStyle(ButtonStyle.Secondary));
  if (nav.components.length) rows.push(nav);

  return rows;
}

function criarBotoesItem(item, admin, userId) {
  const row = new ActionRowBuilder();
  row.addComponents(new ButtonBuilder().setCustomId(`back_${userId}`).setLabel('← Menu').setStyle(ButtonStyle.Secondary).setEmoji('🏠'));
  if (admin) {
    row.addComponents(
      new ButtonBuilder().setCustomId(`addlink_${item.id}_${userId}`).setLabel('Adicionar Link').setStyle(ButtonStyle.Success).setEmoji('➕'),
      new ButtonBuilder().setCustomId(`dellink_${item.id}_${userId}`).setLabel('Remover Link').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
      new ButtonBuilder().setCustomId(`edititem_${item.id}_${userId}`).setLabel('Editar').setStyle(ButtonStyle.Primary).setEmoji('✏️'),
      new ButtonBuilder().setCustomId(`delitem_${item.id}_${userId}`).setLabel('Excluir').setStyle(ButtonStyle.Danger).setEmoji('❌')
    );
  }
  return new ActionRowBuilder().addComponents(row.components);
}

function criarSelectRemoverLink(item, userId) {
  const links = item.links || [];
  if (!links.length) return null;
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`dellinksel_${item.id}_${userId}`)
      .setPlaceholder('🗑️ Selecione o link para remover...')
      .addOptions(links.map((l, i) => new StringSelectMenuOptionBuilder()
        .setLabel(`${i + 1}. ${l.nome}`)
        .setDescription(`${l.tamanho || '—'} • ${l.url.slice(0, 80)}`)
        .setValue(String(i))
        .setEmoji('📄')))
  );
}

function criarModalNovoItem(userId) {
  return new ModalBuilder().setCustomId(`novoitem_${userId}`).setTitle('➕ Novo Botão')
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('icone').setLabel('Ícone/Emoji').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(10).setPlaceholder('▶')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('titulo').setLabel('Nome').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80).setPlaceholder('Ex: Video Copilot')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sub').setLabel('Subtítulo (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(120).setPlaceholder('Ex: (Twitch, Saber, Element3D e os outros)')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cor').setLabel('Cor HEX (opcional, ex: #7289DA)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(20).setPlaceholder('7289DA'))
    );
}

function criarModalEditarItem(item, userId) {
  return new ModalBuilder().setCustomId(`edititem_${item.id}_${userId}`).setTitle(`✏️ ${item.titulo}`)
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('icone').setLabel('Ícone/Emoji').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(10).setPlaceholder(item.icone || '▶')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('titulo').setLabel('Nome').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80).setPlaceholder(item.titulo)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sub').setLabel('Subtítulo (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(120).setPlaceholder(item.sub || '')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cor').setLabel('Cor HEX (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(20).setPlaceholder((item.cor || CORES.item).toString(16).padStart(6, '0')))
    );
}

function criarModalAddLink(id, userId) {
  return new ModalBuilder().setCustomId(`addlink_${id}_${userId}`).setTitle('➕ Adicionar Link')
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel('Nome').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80).setPlaceholder('Ex: Baixar versão 2026')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('u').setLabel('URL').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(500).setPlaceholder('https://...')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s').setLabel('Tamanho (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(20).setPlaceholder('Ex: 250 MB'))
    );
}

function criarModalConfigPrincipal(userId) {
  const m = obterConfigPrincipal();
  return new ModalBuilder().setCustomId(`cfgmain_${userId}`).setTitle('⚙️ Configurar Menu')
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('titulo').setLabel('Título').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(80).setPlaceholder(m.titulo)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('Descrição (markdown livre)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(2000).setPlaceholder(m.desc)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('banner').setLabel('Banner URL').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(500).setPlaceholder(m.banner || '')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rodape').setLabel('Rodapé').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(200).setPlaceholder(m.rodape || ''))
    );
}

function erro(t, d) { return new EmbedBuilder().setTitle(negrito(`❌ ${t}`)).setDescription(d).setColor(CORES.err).setTimestamp(); }
function sucesso(t, d) { return new EmbedBuilder().setTitle(negrito(`✅ ${t}`)).setDescription(d).setColor(CORES.ok).setTimestamp(); }

function parseCustom(customId) {
  const partes = customId.split('_');
  const userId = partes[partes.length - 1];
  const prefix = partes[0];
  const id = partes.length > 2 ? partes.slice(1, -1).join('_') : null;
  return { prefix, id, userId };
}

function ehDono(i, userId) { return i.user.id === userId; }

function acharItem(id) { return DB.itens.find(x => x.id === id); }

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
    console.error('atualizarModalSeguro erro:', e.message);
    try { await i.reply(payload); } catch {}
    try { await i.followUp(payload); } catch {}
  }
}

function payloadMenu(pag, admin, userId) {
  return { embeds: [criarEmbedPrincipal(pag)], components: criarBotoesMenu(pag, admin, userId) };
}
function payloadItem(item, admin, userId) {
  return { embeds: [criarEmbedItem(item)], components: criarBotoesItem(item, admin, userId) };
}

async function handleAbrirItem(i, id, userId) {
  const item = acharItem(id);
  if (!item) return responderSeguro(i, { embeds: [erro('Não encontrado', 'Este botão não existe mais.')], ephemeral: true });
  const admin = ehAdmin(i.member);
  await atualizarSeguro(i, payloadItem(item, admin, userId));
}

async function handleNovoItem(i, userId) {
  if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
  return i.showModal(criarModalNovoItem(userId));
}

async function handleConfigPrincipal(i, userId) {
  if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
  return i.showModal(criarModalConfigPrincipal(userId));
}

async function handleAddLink(i, id, userId) {
  if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
  if (!acharItem(id)) return responderSeguro(i, { embeds: [erro('Não encontrado', 'Item não existe.')], ephemeral: true });
  return i.showModal(criarModalAddLink(id, userId));
}

async function handleDelLink(i, id, userId) {
  if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
  const item = acharItem(id);
  if (!item) return responderSeguro(i, { embeds: [erro('Não encontrado', 'Item não existe.')], ephemeral: true });
  const sel = criarSelectRemoverLink(item, userId);
  if (!sel) return responderSeguro(i, { embeds: [erro('Vazio', 'Nenhum link para remover.')], ephemeral: true });
  return responderSeguro(i, { components: [sel], ephemeral: true });
}

async function handleEditItem(i, id, userId) {
  if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
  const item = acharItem(id);
  if (!item) return responderSeguro(i, { embeds: [erro('Não encontrado', 'Item não existe.')], ephemeral: true });
  return i.showModal(criarModalEditarItem(item, userId));
}

async function handleDelItem(i, id, userId) {
  if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
  const item = acharItem(id);
  if (!item) return responderSeguro(i, { embeds: [erro('Não encontrado', 'Item não existe.')], ephemeral: true });
  const confirm = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`confdel_${id}_${userId}`).setLabel('Sim, excluir').setStyle(ButtonStyle.Danger).setEmoji('⚠️'),
    new ButtonBuilder().setCustomId(`cancel_${userId}`).setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
  );
  return responderSeguro(i, { embeds: [erro('Excluir', `Confirmar exclusão de ${negrito(item.titulo)}?`)], components: [confirm], ephemeral: true });
}

async function handleModalNovoItem(i, userId) {
  if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
  const corInput = i.fields.getTextInputValue('cor');
  let cor = CORES.item;
  if (corInput) {
    const limpo = corInput.replace('#', '').replace('0x', '');
    const parsed = parseInt(limpo, 16);
    if (!isNaN(parsed)) cor = parsed;
  }
  DB.itens.push({
    id: novoId(),
    icone: i.fields.getTextInputValue('icone') || '📄',
    titulo: i.fields.getTextInputValue('titulo'),
    sub: i.fields.getTextInputValue('sub') || '',
    cor,
    links: []
  });
  salvarDB(DB);
  await atualizarModalSeguro(i, payloadMenu(0, true, userId));
  await responderSeguro(i, { embeds: [sucesso('Botão criado', 'Adicione links abrindo o novo botão.')], ephemeral: true });
}

async function handleModalEditItem(i, id, userId) {
  if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
  const item = acharItem(id);
  if (!item) return responderSeguro(i, { embeds: [erro('Não encontrado', 'Item não existe.')], ephemeral: true });
  const corInput = i.fields.getTextInputValue('cor');
  let cor = item.cor || CORES.item;
  if (corInput) {
    const limpo = corInput.replace('#', '').replace('0x', '');
    const parsed = parseInt(limpo, 16);
    if (!isNaN(parsed)) cor = parsed;
  }
  item.icone = i.fields.getTextInputValue('icone') || item.icone || '📄';
  item.titulo = i.fields.getTextInputValue('titulo') || item.titulo;
  item.sub = i.fields.getTextInputValue('sub') || '';
  item.cor = cor;
  salvarDB(DB);
  await atualizarModalSeguro(i, payloadItem(item, true, userId));
  await responderSeguro(i, { embeds: [sucesso('Editado', 'Botão atualizado.')], ephemeral: true });
}

async function handleModalAddLink(i, id, userId) {
  if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
  const item = acharItem(id);
  if (!item) return responderSeguro(i, { embeds: [erro('Não encontrado', 'Item não existe.')], ephemeral: true });
  item.links = item.links || [];
  item.links.push({
    nome: i.fields.getTextInputValue('n'),
    url: i.fields.getTextInputValue('u'),
    tamanho: i.fields.getTextInputValue('s') || '—'
  });
  salvarDB(DB);
  await atualizarModalSeguro(i, payloadItem(item, true, userId));
  await responderSeguro(i, { embeds: [sucesso('Link adicionado', 'Download disponível.')], ephemeral: true });
}

async function handleModalCfgMain(i, userId) {
  if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
  DB.main = {
    titulo: i.fields.getTextInputValue('titulo') || null,
    desc: i.fields.getTextInputValue('desc') || null,
    banner: urlValida(i.fields.getTextInputValue('banner')) ? i.fields.getTextInputValue('banner') : null,
    rodape: i.fields.getTextInputValue('rodape') || null
  };
  salvarDB(DB);
  await atualizarModalSeguro(i, payloadMenu(0, true, userId));
  await responderSeguro(i, { embeds: [sucesso('Menu atualizado', 'Alterações salvas.')], ephemeral: true });
}

async function handleConfDel(i, id, userId) {
  if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
  const idx = DB.itens.findIndex(x => x.id === id);
  if (idx === -1) return responderSeguro(i, { embeds: [erro('Não encontrado', 'Item não existe.')], ephemeral: true });
  DB.itens.splice(idx, 1);
  salvarDB(DB);
  await atualizarSeguro(i, payloadMenu(0, true, userId));
  await responderSeguro(i, { embeds: [sucesso('Excluído', 'Botão removido.')], ephemeral: true });
}

async function handleDelsel(i, id, userId) {
  if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
  const item = acharItem(id);
  if (!item) return responderSeguro(i, { embeds: [erro('Não encontrado', 'Item não existe.')], ephemeral: true });
  const idx = parseInt(i.values[0]);
  const removido = (item.links || []).splice(idx, 1)[0];
  salvarDB(DB);
  await atualizarSeguro(i, payloadItem(item, true, userId));
  await responderSeguro(i, { embeds: [sucesso('Link removido', negrito(removido?.nome || 'item'))], ephemeral: true });
}

cliente.once(Events.ClientReady, async c => {
  console.log(`✅ ${c.user.tag} online`);
});

cliente.on(Events.InteractionCreate, async i => {
  try {
    if (i.isChatInputCommand()) {
      if (i.commandName === 'menu') {
        const userId = i.user.id;
        const admin = ehAdmin(i.member);
        return i.reply({ ...payloadMenu(0, admin, userId), ephemeral: true });
      }
      if (i.commandName === 'limparmenu') {
        if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
        await i.deferReply({ ephemeral: true });
        let apagadas = 0;
        try {
          const messages = await i.channel.messages.fetch({ limit: 100 });
          const botMsgs = messages.filter(m => m.author.id === cliente.user.id).map(m => m);
          for (const m of botMsgs) { await m.delete().catch(()=>{}); apagadas++; }
        } catch (e) { console.error('limparmenu erro:', e.message); }
        return i.editReply({ embeds: [sucesso(`Limpeza`, `${apagadas} mensagem(ns) antiga(s) do bot apagadas. Agora use ${negrito('/menu')}.`)] });
      }
    }

    if (i.isButton()) {
      const { prefix, id, userId } = parseCustom(i.customId);
      if (!ehDono(i, userId)) return responderSeguro(i, { embeds: [erro('Não autorizado', 'Abra seu próprio menu com /menu.')], ephemeral: true });

      switch (prefix) {
        case 'item': return handleAbrirItem(i, id, userId);
        case 'back': return atualizarSeguro(i, payloadMenu(0, ehAdmin(i.member), userId));
        case 'pag': return atualizarSeguro(i, payloadMenu(parseInt(id), ehAdmin(i.member), userId));
        case 'novoitem': return handleNovoItem(i, userId);
        case 'cfgmain': return handleConfigPrincipal(i, userId);
        case 'addlink': return handleAddLink(i, id, userId);
        case 'dellink': return handleDelLink(i, id, userId);
        case 'edititem': return handleEditItem(i, id, userId);
        case 'delitem': return handleDelItem(i, id, userId);
        case 'confdel': return handleConfDel(i, id, userId);
        case 'cancel': return responderSeguro(i, { embeds: [sucesso('Cancelado', 'Nada foi alterado.')], ephemeral: true });
      }
    }

    if (i.isStringSelectMenu()) {
      const { id, userId } = parseCustom(i.customId);
      if (!ehDono(i, userId)) return responderSeguro(i, { embeds: [erro('Não autorizado', 'Abra seu próprio menu com /menu.')], ephemeral: true });
      if (i.customId.startsWith('dellinksel_')) return handleDelsel(i, id, userId);
    }

    if (i.isModalSubmit()) {
      const { prefix, id, userId } = parseCustom(i.customId);
      if (!ehDono(i, userId)) return responderSeguro(i, { embeds: [erro('Não autorizado', 'Abra seu próprio menu com /menu.')], ephemeral: true });

      if (prefix === 'novoitem') return handleModalNovoItem(i, userId);
      if (prefix === 'edititem') return handleModalEditItem(i, id, userId);
      if (prefix === 'addlink') return handleModalAddLink(i, id, userId);
      if (prefix === 'cfgmain') return handleModalCfgMain(i, userId);
    }
  } catch (e) { console.error('Erro interação:', e); }
});

cliente.login(process.env.DISCORD_TOKEN);
