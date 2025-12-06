require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  PermissionsBitField
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

const PREFIX = process.env.PREFIX || '!';
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

// Bot online
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
});

// !setupverify command
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (command === 'setupverify') {
    // Only admins / manage server
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
      !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return message.reply('You need admin or manage server permission to use this.');
    }

    const embed = new EmbedBuilder()
      .setColor(0x00a86b)
      .setTitle('🔒 Verification Required')
      .setDescription(
        [
          'This form will be sent to the staff team.',
          '⚠️ **Do not share your password or any other sensitive information.**',
          '',
          '📌 **Note:**',
          'You must complete verification before you are allowed to use certain features.'
        ].join('\n')
      );

    const button = new ButtonBuilder()
      .setCustomId('verify_button')
      .setLabel('Verify')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);

    await message.channel.send({ embeds: [embed], components: [row] });

    return message.reply('✅ Verification panel sent in this channel.');
  }
});

// Button + modal logic
client.on(Events.InteractionCreate, async (interaction) => {
  // When user clicks Verify
  if (interaction.isButton() && interaction.customId === 'verify_button') {
    const modal = new ModalBuilder()
      .setCustomId('verify_modal')
      .setTitle('Verification');

    const usernameInput = new TextInputBuilder()
      .setCustomId('username_input')
      .setLabel('Username')
      .setPlaceholder('Enter your username...')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const emailInput = new TextInputBuilder()
      .setCustomId('email_input')
      .setLabel('Email Address')
      .setPlaceholder('Enter your email...')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const row1 = new ActionRowBuilder().addComponents(usernameInput);
    const row2 = new ActionRowBuilder().addComponents(emailInput);

    modal.addComponents(row1, row2);

    await interaction.showModal(modal);
  }

  // When user submits popup
  if (interaction.isModalSubmit() && interaction.customId === 'verify_modal') {
    const username = interaction.fields.getTextInputValue('username_input');
    const email = interaction.fields.getTextInputValue('email_input');

    await interaction.reply({
      content: '✅ Thanks! Your information has been submitted for review.',
      ephemeral: true
    });

    // Log to staff channel
    try {
      let logChannel =
        interaction.client.channels.cache.get(LOG_CHANNEL_ID) ||
        (await interaction.client.channels.fetch(LOG_CHANNEL_ID));

      if (logChannel && logChannel.isTextBased()) {
        await logChannel.send(
          [
            '📥 **New verification submission**',
            `• User: ${interaction.user.tag} (${interaction.user.id})`,
            `• Username: \`${username}\``,
            `• Email: \`${email}\``,
            `• Server: ${interaction.guild ? interaction.guild.name : 'Unknown'}`
          ].join('\n')
        );
      }
    } catch (err) {
      console.error('Error sending to log channel:', err);
    }

    // Auto give Verified role (if it exists)
    try {
      const guild = interaction.guild;
      if (!guild) return;

      const member = await guild.members.fetch(interaction.user.id);
      const verifiedRole = guild.roles.cache.find(
        (r) => r.name.toLowerCase() === 'verified'
      );

      if (verifiedRole && member && !member.roles.cache.has(verifiedRole.id)) {
        await member.roles.add(verifiedRole);
      }
    } catch (err) {
      console.error('Error adding Verified role:', err);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
