const ALLOW_DAILY = true;
const MEDALS = [
  discord.decor.Emojis.FIRST_PLACE_MEDAL,
  discord.decor.Emojis.SECOND_PLACE_MEDAL,
  discord.decor.Emojis.THIRD_PLACE_MEDAL
];

const potatoCommands = new discord.command.CommandGroup({
  defaultPrefix: '!potato'
});
const potatoKV = new pylon.KVNamespace('potato');

const randomTimeBetween = (min: number, max: number) =>
  Math.round(Math.random() * (max - min) + min);

const setDefaultReply = (commandGroup: discord.command.CommandGroup) => {
  commandGroup.default(
    () => ({}),
    async (message) =>
      await message.reply(
        `${discord.decor.Emojis.NO_ENTRY} unknown potato command, try !potato help`
      )
  );
};

//  MESSAGE CREATED

discord.on(discord.Event.MESSAGE_CREATE, async (message: discord.Message) => {
  if (!message.author || message.author.bot) return;

  if (await potatoKV.get<boolean>('cooldown')) {
    potatoKV.put('messageIsPresent', true);
    return;
  } else {
    const [lastChannel, potatoId] =
      (await potatoKV.get<string>('lastPotato'))?.split('-') || [];

    await discord
      .getGuild()
      .then(
        (g) =>
          g.getChannel(lastChannel) as Promise<
            discord.GuildTextChannel | undefined
          >
      )
      .then((c) => c?.getMessage(potatoId))
      .then((m) => m?.delete())
      .catch(() => {});
  }

  if (Math.random() > 0.3) return;

  const reply = await message.reply(discord.decor.Emojis.POTATO);
  const reactionBag = await reply.addReaction(
    discord.decor.Emojis.SHOPPING_BAGS
  );
  const cooldown = randomTimeBetween(2 * 60 * 1000, 15 * 60 * 1000);

  await potatoKV.put('cooldown', true, { ttl: cooldown });
  await potatoKV.put('lastPotato', `${message.channelId}-${reply.id}`);
});

//RUN POTATO FUNCTION

discord.on(discord.Event.MESSAGE_REACTION_ADD, async (reaction) => {
  if (!(reaction.emoji.name === discord.decor.Emojis.SHOPPING_BAGS)) return;
  if (!potatoKV.get<boolean>('potatoIsPresent')) return;
  if (reaction.userId === '270148059269300224') return;
  if (!reaction) return;
  if (!reaction.member) return;

  const messageId = reaction.messageId;
  const channel = await discord.getGuildTextChannel(reaction.channelId);
  const message = await channel?.getMessage(reaction.messageId);

  if (!message) return;

  const [lastPotato, potatoId] =
    (await potatoKV.get<string>('lastPotato'))?.split('-') || [];

  if (potatoId == messageId) {
    await message
      .getChannel()
      .then((c) => c.getMessage(potatoId))
      .then((m) => m?.delete())
      .catch(() => {});

    await message.delete().catch(() => {});
    potatoKV.delete('potatoIsPresent');

    const poisonous = Math.random() < 0.01;

    const oldCount = (await potatoKV.get<number>(reaction.userId)) || 0;
    const newCount = Math.max(
      0,
      oldCount +
        (poisonous
          ? -Math.max(
              1,
              Math.min(10, Math.floor((Math.random() * oldCount) / 4))
            )
          : 1)
    );

    await potatoKV.put(reaction.userId, newCount);
    await potatoKV.delete('lastPotato');
    await message.reply(
      new discord.Embed({
        title: `${
          poisonous ? discord.decor.Emojis.SKULL : discord.decor.Emojis.POTATO
        } potato claimed ${discord.decor.Emojis.POTATO}`,
        description: `${reaction.member.user.username}#${
          reaction.member.user.discriminator
        } ${
          poisonous
            ? `tried to pick up a poisonous potato, poisoning ${oldCount -
                newCount} potatos in the process`
            : 'has claimed a potato'
        }, and now holds onto ${newCount} potato${newCount === 1 ? '' : 's'}.`,
        color: 0xfff200,
        thumbnail: { url: reaction.member.user.getAvatarUrl() },
        footer: {
          text: poisonous
            ? ''
            : "to the rest of you, can't catch em all, right?"
        }
      })
    );
  } else {
    return;
  }
});

potatoCommands.subcommand('', (potatoSubcommands) => {
  setDefaultReply(potatoSubcommands);

  potatoSubcommands.on(
    { name: 'help', description: 'potato help' },
    () => ({}),
    async (message) => {
      await message.reply(
        new discord.Embed({
          title: `${discord.decor.Emojis.POTATO} help ${discord.decor.Emojis.POTATO}`,
          description: [
            `when a ${discord.decor.Emojis.POTATO} is dropped, be the first to pick it up by reaction to the message with ${discord.decor.Emojis.SHOPPING_BAGS}.`,
            '',
            '**commands**:',
            '- `!potato help` - shows this help message',
            '- `!potato` - show off your potato balance',
            '- `!potato inspect [user]` - inspect another [user]s potato balance',
            '- `!potato top [count]` - top n potato collectors (insert number or error)',
            "- `!potato give <who> <count>` - give your potatos to other people - if you're feeling kind.",
            '- `!potato drop` - drop one of your potatos. the fastest to pick it up gets it',
            '- `!potato daily` - claim your daily potato',
            ''
          ].join('\n')
        })
      );
    }
  );

  potatoSubcommands.on(
    { name: '', description: 'potato count' },
    (args) => ({}),
    async (message, {}) => {
      const target = message.author;

      const currentCount = (await potatoKV.get<number>(target.id)) || 0;
      await message.reply(
        new discord.Embed({
          title: `${discord.decor.Emojis.POTATO} potato count ${discord.decor.Emojis.POTATO}`,
          description: `${message.author.getTag()} has ${currentCount} potato${
            currentCount === 1 ? '' : 's'
          }. ${discord.decor.Emojis.POTATO.repeat(
            Math.min(currentCount, 100)
          )}`,
          color: 0xfff200,
          thumbnail: { url: message.author.getAvatarUrl() }
        })
      );
    }
  );

  potatoSubcommands.on(
    { name: 'inspect', description: 'potato count' },
    (args) => ({ who: args.user() }),
    async (message, { who }) => {
      const currentCount = (await potatoKV.get<number>(who.id)) || 0;
      await message.reply(
        new discord.Embed({
          title: `${discord.decor.Emojis.POTATO} potato count ${discord.decor.Emojis.POTATO}`,
          description: `${who.getTag()} has ${currentCount} potato${
            currentCount === 1 ? '' : 's'
          }. ${discord.decor.Emojis.POTATO.repeat(
            Math.min(currentCount, 100)
          )}`,
          color: 0xfff200,
          thumbnail: { url: who.getAvatarUrl() }
        })
      );
    }
  );

  potatoSubcommands.on(
    { name: 'give', description: 'give potatos to other people' },
    (args) => ({ who: args.user(), count: args.integerOptional() }),
    async (message, { who, count }) => {
      if (message.author?.id === who.id)
        return await message.reply("You can't give potatos to yourself!");
      if (who.bot)
        return await message.reply("You can't give potatos to bots!");
      const userPotatos = (await potatoKV.get<number>(message.author?.id)) || 0;
      const targetPotatos = (await potatoKV.get<number>(who.id)) || 0;

      if (!count && count !== 0) count = 1;

      if (count > userPotatos)
        return await message.reply(
          'You can only give as many potatos as you have!'
        );

      if (count < 1)
        return await message.reply('You need to send at least one potato.');

      const newUserPotatos = userPotatos - count;
      const newTargetPotatos = targetPotatos + count;

      await potatoKV.put(message.author?.id, newUserPotatos);
      await potatoKV.put(who.id, newTargetPotatos);

      await message.reply(
        `you gave ${count} potato${
          count === 1 ? '' : 's'
        } to ${who.getTag()}, how nice of you.`
      );
    }
  );

  potatoSubcommands.on(
    { name: 'top', description: 'top potatos' },
    (args) => ({ count: args.integerOptional() || 99 }),
    async (message, { count }) => {
      count = Math.min(Math.max(3, count || 10), 20);
      const items = await potatoKV.items();
      const filtered = items.filter(
        (entry) =>
          !isNaN((entry.key as unknown) as number) &&
          ((entry.value as unknown) as number) > 0
      );
      const sorted = filtered.sort(
        (a, b) => (b.value as number) - (a.value as number)
      );
      const top = sorted.slice(0, count);
      const userMap = await Promise.all(
        top.map((entry) =>
          discord
            .getUser(entry.key)
            .then((user) => ({ user, potatos: entry.value as number }))
        )
      );

      let description = `${discord.decor.Emojis.POTATO} **${filtered
        .reduce((a, b) => a + (b.value as number), 0)
        .toLocaleString()}**\n`;
      description += `${discord.decor.Emojis.MAN_FARMER} **${filtered.length}**\n\n`;
      description += `${discord.decor.Emojis.CHART_WITH_UPWARDS_TREND} **Ranks** ${discord.decor.Emojis.MUSCLE}\n`;

      for (const entry of userMap.slice(0, Math.max(3, count - 1))) {
        const { user, potatos } = entry;
        const place = userMap.indexOf(entry);
        description += `\` ${MEDALS[place] ||
          `${(place + 1).toString().padStart(2, ' ')} `} \` **${
          user?.username
        }**#${user?.discriminator} - ${potatos.toLocaleString()} potatos\n`;
      }

      const ownIndex = sorted.findIndex(
        (item) => item.key === message.author.id
      );

      if (ownIndex >= count) {
        description += `\` ... \` *${ownIndex - count + 1}* other farmers\n`;
        description += `\` ${(ownIndex + 1).toString().padStart(2, ' ')} \` **${
          message.author.username
        }**#${message.author.discriminator} - ${sorted[ownIndex].value} potato${
          sorted[ownIndex].value === 1 ? '' : 's'
        }`;
      } else if (count > 3) {
        const { user, potatos } = userMap[count - 1];
        description += `\` ${count.toString().padStart(2, ' ')}  \` **${
          user?.username
        }**#${user?.discriminator} - ${potatos.toLocaleString()} potatos\n`;
      }

      await message.reply(
        new discord.Embed({
          title: `${discord.decor.Emojis.TROPHY} Leaderboard​ ${discord.decor.Emojis.CROWN}`,
          description
        })
      );
    }
  );

  potatoSubcommands.on(
    { name: 'drop', description: 'drop a potato in the chat' },
    () => ({}),
    async (message) => {
      const userPotatos = (await potatoKV.get<number>(message.author?.id)) || 0;

      if (!userPotatos)
        return await message.reply("you don't have any potatos!");

      const lastPotato = await potatoKV.get<string>('lastPotato');
      if (lastPotato)
        return await message.reply(
          `there is already an active potato waiting to be picked up in <#${
            lastPotato.split('-')[0]
          }>!`
        );

      await potatoKV.put(message.author?.id, userPotatos - 1);

      const reply = await message.reply(discord.decor.Emojis.POTATO);

      const cooldown = randomTimeBetween(3 * 60 * 1000, 20 * 60 * 1000);

      await potatoKV.put('cooldown', true, { ttl: cooldown });
      await potatoKV.put('lastPotato', `${message.channelId}-${reply.id}`, {
        ttl: cooldown
      });
    }
  );

  potatoSubcommands.on(
    {
      name: 'modify',
      description: 'modify a users potatos'
    },
    (args) => ({ who: args.user(), count: args.string() }),
    async (message, { who, count }) => {
      if (!(await discord.command.filters.isAdministrator().filter(message)))
        return await message.reply('missing permissions');
      if (who.bot)
        return await message.reply(
          'thats a.. bot. you wanna modify a bots potatos??'
        );
      const oldCount = (await potatoKV.get<number>(who.id)) || 0;

      let newCount = oldCount;
      if (count.startsWith('+')) newCount += parseInt(count.replace('+', ''));
      else if (count.startsWith('-'))
        newCount -= parseInt(count.replace('-', ''));
      else newCount = parseInt(count);

      if (isNaN(newCount as number))
        return await message.reply('invalid count');

      await potatoKV.put(who.id, newCount as number);
      await message.reply(
        `Ok, updated ${who.getTag()}'s potatos to ${newCount}`
      );
    }
  );

  if (ALLOW_DAILY)
    potatoSubcommands.on(
      { name: 'daily', description: 'daily potato' },
      () => ({}),
      async (message) => {
        if (await potatoKV.get<boolean>(`daily-${message.author.id}`))
          return await message.reply('you already claimed your daily potato!');

        await potatoKV.put(`daily-${message.author.id}`, true, {
          ttl:
            Math.ceil(Date.now() / 1000 / 60 / 60 / 24) * 24 * 60 * 60 * 1000 -
            Date.now()
        });
        const newCount = await potatoKV.transact(
          message.author.id,
          (prev: number | undefined) => (prev || 0) + 1
        );
        await message.reply(
          `you claimed your daily potato, and now hold onto ${newCount} potatos.`
        );
      }
    );
});
